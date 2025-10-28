const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const chapaService = require('../services/chapaService');

const router = express.Router();

/**
 * @route   POST /api/chapa/initialize
 * @desc    Initialize a new Chapa payment
 * @access  Private
 */
router.post('/initialize', [
  body('booking_id').isInt().withMessage('Booking ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone_number').notEmpty().withMessage('Phone number is required'),
  body('callback_url').isURL().withMessage('Valid callback URL is required'),
  body('return_url').isURL().withMessage('Valid return URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      booking_id,
      amount,
      email,
      first_name,
      last_name,
      phone_number,
      callback_url,
      return_url,
      customizations
    } = req.body;

    // Verify booking exists
    const booking = await query(
      'SELECT b.*, g.first_name, g.last_name, g.email, g.phone FROM bookings b LEFT JOIN guests g ON b.guest_id = g.id WHERE b.id = ?',
      [booking_id]
    );

    if (booking.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const bookingData = booking[0];

    // Generate unique transaction reference
    const tx_ref = chapaService.generateTransactionRef(`BOOKING_${booking_id}`);

    // Initialize Chapa payment
    const paymentData = {
      amount,
      currency: 'ETB',
      email: email || bookingData.email,
      first_name: first_name || bookingData.first_name,
      last_name: last_name || bookingData.last_name,
      phone_number: phone_number || bookingData.phone,
      tx_ref,
      callback_url,
      return_url,
      customizations,
      booking_id
    };

    const chapaResponse = await chapaService.initializePayment(paymentData);

    // Create pending payment record
    await query(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, payment_date, notes)
       VALUES (?, ?, 'chapa', 'pending', ?, NOW(), ?)`,
      [booking_id, amount, tx_ref, JSON.stringify({ chapa_response: chapaResponse })]
    );

    res.json({
      success: true,
      message: 'Chapa payment initialized successfully',
      data: {
        checkout_url: chapaResponse.data.checkout_url,
        tx_ref,
        payment_id: chapaResponse.data.id
      }
    });

  } catch (error) {
    console.error('Chapa initialization route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing Chapa payment',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/chapa/webhook
 * @desc    Handle Chapa webhook for payment status updates
 * @access  Public
 */
router.post('/webhook', async (req, res) => {
  try {
    const { body } = req;
    const signature = req.headers['x-chapa-signature'];

    // Verify webhook signature
    if (!chapaService.verifyWebhookSignature(signature, body)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const {
      tx_ref,
      status,
      amount,
      currency,
      charge,
      customer,
      metadata
    } = body;

    // Update payment status based on webhook
    let paymentStatus = 'pending';
    if (status === 'success') {
      paymentStatus = 'completed';
    } else if (status === 'failed') {
      paymentStatus = 'failed';
    } else if (status === 'cancelled') {
      paymentStatus = 'cancelled';
    }

    // Update payment record
    await query(
      `UPDATE payments 
       SET payment_status = ?, 
           notes = JSON_SET(COALESCE(notes, '{}'), '$.webhook_data', ?),
           updated_at = NOW()
       WHERE transaction_id = ?`,
      [paymentStatus, JSON.stringify(body), tx_ref]
    );

    // If payment is successful, update booking status
    if (status === 'success') {
      const payment = await query(
        'SELECT booking_id FROM payments WHERE transaction_id = ?',
        [tx_ref]
      );

      if (payment.length > 0) {
        await query(
          'UPDATE bookings SET status = "paid" WHERE id = ?',
          [payment[0].booking_id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Chapa webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/chapa/verify/:tx_ref
 * @desc    Verify payment status
 * @access  Private
 */
router.get('/verify/:tx_ref', async (req, res) => {
  try {
    const { tx_ref } = req.params;

    // Verify with Chapa
    const verification = await chapaService.verifyPayment(tx_ref);

    // Update payment record with verification result
    await query(
      `UPDATE payments 
       SET payment_status = ?, 
           notes = JSON_SET(COALESCE(notes, '{}'), '$.verification', ?),
           updated_at = NOW()
       WHERE transaction_id = ?`,
      [verification.data.status, JSON.stringify(verification), tx_ref]
    );

    res.json({
      success: true,
      data: verification
    });

  } catch (error) {
    console.error('Chapa verification route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/chapa/transactions
 * @desc    Get all Chapa transactions
 * @access  Private
 */
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE payment_method = "chapa"';
    const params = [limit, offset];

    if (status) {
      whereClause += ' AND payment_status = ?';
      params.unshift(status);
    }

    const result = await query(`
      SELECT p.*, b.booking_number, b.total_amount as booking_total,
             g.first_name, g.last_name, g.email
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN guests g ON b.guest_id = g.id
      ${whereClause}
      ORDER BY p.payment_date DESC
      LIMIT ? OFFSET ?
    `, params);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Chapa transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Chapa transactions',
      error: error.message
    });
  }
});

module.exports = router;
