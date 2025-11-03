const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../database/config');
require('dotenv').config({ path: __dirname + '/../.env' });

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? Stripe(stripeSecret) : null;

// Create Payment Intent
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe not configured on server. Set STRIPE_SECRET_KEY in environment.' });
    }

    const { amount, currency = 'usd', booking_id } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount is required and must be > 0' });
    }

    // Amount in cents
    const amountInCents = Math.round(Number(amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        booking_id: booking_id || '',
        user_id: req.user && req.user.id ? String(req.user.id) : ''
      }
    });

    // Persist a pending payment row linked to this PaymentIntent so the webhook can update status
    try {
      await query(`
        INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [booking_id || null, Number(amount), 'Stripe', 'pending', paymentIntent.id, JSON.stringify({ via: 'stripe', currency })]);
    } catch (e) {
      console.warn('Failed to persist payment row for PaymentIntent', paymentIntent.id, e.message);
      // we do not fail the request because paymentIntent was created successfully on Stripe
    }

    res.json({ success: true, clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment intent', error: error.message });
  }
});

// Webhook handler (exported as function because it needs raw body)
async function handleWebhook(req, res) {
  try {
    if (!stripe) {
      console.warn('Stripe webhook received but Stripe is not configured');
      return res.status(400).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // If no webhook secret configured, try to parse body (only for dev). req.body may be Buffer from raw parser.
      try {
        event = typeof req.body === 'string' ? JSON.parse(req.body) : JSON.parse(req.body.toString());
      } catch (e) {
        console.error('Failed to parse webhook body without signature:', e.message);
        return res.status(400).send('Invalid webhook payload');
      }
    }

    // Handle the event types you care about
    switch (event.type) {
      case 'payment_intent.succeeded':
        {
          const pi = event.data.object;
          // mark payment as completed in DB if you track paymentIntentId
          try {
            await query('UPDATE payments SET payment_status = ?, transaction_id = ? WHERE transaction_id = ? OR transaction_id = ?', ['completed', pi.id, pi.id, '']);
          } catch (e) {
            console.warn('Could not update payment status for intent', pi.id, e.message);
          }
        }
        break;
      case 'payment_intent.payment_failed':
        {
          const pi = event.data.object;
          try {
            await query('UPDATE payments SET payment_status = ? WHERE transaction_id = ?', ['failed', pi.id]);
          } catch (e) {
            console.warn('Could not update payment status for failed intent', pi.id, e.message);
          }
        }
        break;
      default:
        // console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler error:', error);
    res.status(500).send('Server error');
  }
}

module.exports = { router, handleWebhook };

// Dev-only endpoint to force-confirm a PaymentIntent using a Stripe test payment method
router.post('/confirm-payment-intent', authenticateToken, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ success: false, message: 'Stripe not configured' });
    if (process.env.STRIPE_ALLOW_TEST_CONFIRM !== 'true') {
      return res.status(403).json({ success: false, message: 'Test confirm not allowed. Set STRIPE_ALLOW_TEST_CONFIRM=true in server env to enable.' });
    }

    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ success: false, message: 'paymentIntentId is required' });

    // Confirm with a special Stripe test payment method
    const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, { payment_method: 'pm_card_visa' });

    // Optionally update DB row; webhook will normally handle status updates
    try {
      const status = confirmed.status || 'unknown';
      await query('UPDATE payments SET payment_status = ? WHERE transaction_id = ?', [status, paymentIntentId]);
    } catch (e) {
      console.warn('Failed to update payment row after test confirm', e.message);
    }

    res.json({ success: true, data: confirmed });
  } catch (error) {
    console.error('confirm-payment-intent error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to mark a PaymentIntent as completed (resiliency for clients if webhook is delayed)
router.post('/record-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, booking_id, amount } = req.body;
    if (!paymentIntentId) return res.status(400).json({ success: false, message: 'paymentIntentId required' });

    // Update payment row if exists
    try {
      await query('UPDATE payments SET payment_status = ? WHERE transaction_id = ?', ['completed', paymentIntentId]);
    } catch (e) {
      console.warn('record-payment: failed to update payment row', e.message);
    }

    // Optionally update booking
    if (booking_id) {
      try {
        await query('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', booking_id]);
      } catch (e) {
        console.warn('record-payment: failed to update booking status', e.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('record-payment error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a Stripe Checkout Session and return URL to redirect the customer
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ success: false, message: 'Stripe not configured' });

    const { amount, currency = 'usd', booking_id, successPath = '/payments/success', cancelPath = '/payments/cancel' } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: 'Amount is required and must be > 0' });

    const clientUrl = process.env.CLIENT_URL || process.env.REACT_APP_CLIENT_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: (currency || 'usd').toLowerCase(),
            product_data: { name: `Booking Payment ${booking_id || ''}` },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { booking_id: booking_id || '', user_id: req.user && req.user.id ? String(req.user.id) : '' },
      success_url: `${clientUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}${cancelPath}`,
    });

    // persist session in payments table
    try {
      await query(`
        INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [booking_id || null, Number(amount), 'Stripe Checkout', 'pending', session.id, JSON.stringify({ via: 'checkout' })]);
    } catch (e) {
      console.warn('Failed to persist payment row for Checkout Session', session.id, e.message);
    }

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('create-checkout-session error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

