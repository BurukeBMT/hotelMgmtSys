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
