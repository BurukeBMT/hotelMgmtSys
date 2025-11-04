const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use environment variable for Stripe secret key
exports.STRIPE = stripe;

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({origin: true}));
app.use(express.json());

// Create payment intent
app.post('/api/payments/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata = {} } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm payment intent
app.post('/api/payments/confirm-intent', async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    res.json(paymentIntent);
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment status
app.get('/api/payments/status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process simple payment (for testing)
app.post('/api/payments/process', async (req, res) => {
  try {
    const { amount, currency = 'usd', paymentData = {} } = req.body;

    // For testing purposes, simulate a successful payment
    const mockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      status: 'succeeded',
      amount: Math.round(amount * 100),
      currency,
      created: Math.floor(Date.now() / 1000),
      ...paymentData,
    };

    res.json({
      success: true,
      paymentIntent: mockPaymentIntent,
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create checkout session
app.post('/api/payments/create-checkout-session', async (req, res) => {
  try {
    const { items, successUrl, cancelUrl, metadata = {} } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });

    res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Payment API server running on port ${PORT}`);
});
