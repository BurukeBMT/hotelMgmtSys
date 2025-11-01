const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/payments
 * Get all payments
 */
router.get('/', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    let query = db.collection('payments');

    if (req.query.bookingId) {
      query = query.where('bookingId', '==', req.query.bookingId);
    }
    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const doc = await db.collection('payments').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments
 * Create a new payment
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const paymentData = {
      ...req.body,
      status: req.body.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('payments').add(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: {
        id: docRef.id,
        ...paymentData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/stripe/create-checkout-session
 * Create Stripe checkout session (requires Stripe integration)
 */
router.post('/stripe/create-checkout-session', verifyToken, async (req, res, next) => {
  try {
    const { amount, currency = 'USD', bookingId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    // TODO: Integrate Stripe SDK
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({...});

    res.status(501).json({
      success: false,
      message: 'Stripe integration not yet implemented. Please configure STRIPE_SECRET_KEY in environment variables.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/payments/:id
 * Update payment status
 */
router.put('/:id', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('payments').doc(req.params.id).update(updateData);

    res.json({
      success: true,
      message: 'Payment updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

