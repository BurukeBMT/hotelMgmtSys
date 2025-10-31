const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requirePrivilege } = require('../middleware/rbac');

const router = express.Router();

// Get all payment methods
router.get('/methods', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM payment_methods 
      WHERE is_active = true 
      ORDER BY name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment methods' 
    });
  }
});

// Process payment
router.post('/process', authenticateToken, [
  body('booking_id').isInt().withMessage('Booking ID is required'),
  body('payment_method_id').isInt().withMessage('Payment method ID is required'),
  body('amount').isDecimal().withMessage('Amount must be a valid decimal'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('payment_data').optional().isObject().withMessage('Payment data must be an object')
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

    const { booking_id, payment_method_id, amount, currency = 'USD', payment_data = {} } = req.body;

    // Get booking details
    const bookingResult = await query(`
      SELECT b.*, rt.name as room_type_name, r.room_number
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.id = ?
    `, [booking_id]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    const booking = bookingResult.rows[0];

    // Get payment method details
    const paymentMethodResult = await query('SELECT * FROM payment_methods WHERE id = ?', [payment_method_id]);
    if (paymentMethodResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }

    const paymentMethod = paymentMethodResult.rows[0];

    // Process payment based on method type
    let paymentResult;
    let transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    switch (paymentMethod.type) {
      case 'card':
        paymentResult = await processCardPayment(amount, currency, payment_data, paymentMethod);
        break;
      case 'digital_wallet':
        paymentResult = await processDigitalWalletPayment(amount, currency, payment_data, paymentMethod);
        break;
      case 'mobile_money':
        paymentResult = await processMobileMoneyPayment(amount, currency, payment_data, paymentMethod);
        break;
      case 'bank_transfer':
        paymentResult = await processBankTransferPayment(amount, currency, payment_data, paymentMethod);
        break;
      case 'cash':
        paymentResult = await processCashPayment(amount, currency, payment_data, paymentMethod);
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Unsupported payment method' 
        });
    }

    if (!paymentResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: paymentResult.message || 'Payment processing failed' 
      });
    }

    // Create payment record
    const paymentRecord = await query(`
      INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      booking_id, 
      amount, 
      paymentMethod.name, 
      paymentResult.status, 
      transactionId,
      JSON.stringify(payment_data)
    ]);

    // Update booking status if payment is successful
    if (paymentResult.status === 'completed') {
      await query('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', booking_id]);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment_id: paymentRecord.insertId,
        transaction_id: transactionId,
        status: paymentResult.status,
        amount: amount,
        currency: currency,
        payment_method: paymentMethod.name
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing payment' 
    });
  }
});

// Process card payment (Stripe integration)
async function processCardPayment(amount, currency, paymentData, paymentMethod) {
  try {
    // If Stripe is configured, create a payment record and return an instruction for client to create payment intent
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (stripeSecret) {
      // Create a placeholder payment record (pending) and return success with instruction to use Stripe on client
      // Insert payment record with pending status so webhook can update on completion
      const transactionId = `STRIPE_${Date.now()}`;
      await query(`
        INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [paymentData.booking_id || null, amount, 'Credit Card', 'pending', transactionId, JSON.stringify(paymentData)]);

      return { success: true, status: 'pending', payment_instruction: 'use_stripe', transaction_id: transactionId };
    }

    // Fallback: basic validation of raw card data (not PCI compliant) - keep mock behavior
    const { card_number, expiry_month, expiry_year, cvv, cardholder_name } = paymentData;
    if (!card_number || !expiry_month || !expiry_year || !cvv || !cardholder_name) {
      return { success: false, message: 'Invalid card data' };
    }

    const isSuccess = Math.random() > 0.1; // demo fallback
    return { success: isSuccess, status: isSuccess ? 'completed' : 'failed', message: isSuccess ? 'Payment successful' : 'Payment failed' };
  } catch (error) {
    console.error('processCardPayment error', error);
    return { success: false, message: 'Card payment processing error' };
  }
}

// Process digital wallet payment (PayPal integration)
async function processDigitalWalletPayment(amount, currency, paymentData, paymentMethod) {
  try {
    // This is a mock implementation - integrate with actual PayPal API
    const { wallet_id, wallet_type } = paymentData;
    
    if (!wallet_id || !wallet_type) {
      return { success: false, message: 'Invalid wallet data' };
    }

    // Mock payment processing
    const isSuccess = Math.random() > 0.05; // 95% success rate for demo
    
    return {
      success: isSuccess,
      status: isSuccess ? 'completed' : 'failed',
      message: isSuccess ? 'Digital wallet payment successful' : 'Digital wallet payment failed'
    };
  } catch (error) {
    return { success: false, message: 'Digital wallet payment processing error' };
  }
}

// Process mobile money payment (Chapa integration)
async function processMobileMoneyPayment(amount, currency, paymentData, paymentMethod) {
  try {
    // This is a mock implementation - integrate with actual Chapa API
    const { phone_number, provider } = paymentData;
    
    if (!phone_number || !provider) {
      return { success: false, message: 'Invalid mobile money data' };
    }

    // Mock payment processing
    const isSuccess = Math.random() > 0.08; // 92% success rate for demo
    
    return {
      success: isSuccess,
      status: isSuccess ? 'completed' : 'failed',
      message: isSuccess ? 'Mobile money payment successful' : 'Mobile money payment failed'
    };
  } catch (error) {
    return { success: false, message: 'Mobile money payment processing error' };
  }
}

// Process bank transfer payment
async function processBankTransferPayment(amount, currency, paymentData, paymentMethod) {
  try {
    const { bank_name, account_number, reference } = paymentData;
    
    if (!bank_name || !account_number || !reference) {
      return { success: false, message: 'Invalid bank transfer data' };
    }

    // Bank transfers are typically pending until confirmed
    return {
      success: true,
      status: 'pending',
      message: 'Bank transfer initiated - payment will be confirmed upon receipt'
    };
  } catch (error) {
    return { success: false, message: 'Bank transfer processing error' };
  }
}

// Process cash payment
async function processCashPayment(amount, currency, paymentData, paymentMethod) {
  try {
    const { received_amount, change_given } = paymentData;
    
    if (!received_amount || received_amount < amount) {
      return { success: false, message: 'Insufficient cash received' };
    }

    return {
      success: true,
      status: 'completed',
      message: 'Cash payment received successfully'
    };
  } catch (error) {
    return { success: false, message: 'Cash payment processing error' };
  }
}

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { booking_id, status, payment_method, date_from, date_to } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (booking_id) {
      whereClause += ' AND p.booking_id = ?';
      params.push(booking_id);
    }

    if (status) {
      whereClause += ' AND p.payment_status = ?';
      params.push(status);
    }

    if (payment_method) {
      whereClause += ' AND p.payment_method = ?';
      params.push(payment_method);
    }

    if (date_from) {
      whereClause += ' AND DATE(p.payment_date) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(p.payment_date) <= ?';
      params.push(date_to);
    }

    const result = await query(`
      SELECT p.*, b.booking_number, b.check_in_date, b.check_out_date
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      ${whereClause}
      ORDER BY p.payment_date DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment history' 
    });
  }
});

// Refund payment
router.post('/refund', authenticateToken, requirePrivilege('manage_payments'), [
  body('payment_id').isInt().withMessage('Payment ID is required'),
  body('refund_amount').isDecimal().withMessage('Refund amount must be a valid decimal'),
  body('reason').optional()
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

    const { payment_id, refund_amount, reason } = req.body;

    // Get payment details
    const paymentResult = await query('SELECT * FROM payments WHERE id = ?', [payment_id]);
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.payment_status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only completed payments can be refunded' 
      });
    }

    if (refund_amount > payment.amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refund amount cannot exceed payment amount' 
      });
    }

    // Process refund based on payment method
    let refundResult;
    switch (payment.payment_method) {
      case 'Credit Card':
      case 'Debit Card':
        refundResult = await processCardRefund(payment, refund_amount);
        break;
      case 'PayPal':
        refundResult = await processDigitalWalletRefund(payment, refund_amount);
        break;
      case 'Chapa Payment':
        refundResult = await processMobileMoneyRefund(payment, refund_amount);
        break;
      default:
        refundResult = { success: true, status: 'completed' };
    }

    if (!refundResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: refundResult.message || 'Refund processing failed' 
      });
    }

    // Create refund record
    const refundRecord = await query(`
      INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      payment.booking_id, 
      -refund_amount, 
      `Refund - ${payment.payment_method}`, 
      refundResult.status, 
      `REF_${Date.now()}`,
      reason || 'Refund processed'
    ]);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund_id: refundRecord.insertId,
        amount: refund_amount,
        status: refundResult.status
      }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing refund' 
    });
  }
});

// Mock refund functions
async function processCardRefund(payment, amount) {
  return { success: true, status: 'completed' };
}

async function processDigitalWalletRefund(payment, amount) {
  return { success: true, status: 'completed' };
}

async function processMobileMoneyRefund(payment, amount) {
  return { success: true, status: 'completed' };
}

// Get payment analytics
router.get('/analytics', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = 'AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        break;
      case '1y':
        dateFilter = 'AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
        break;
    }

    const result = await query(`
      SELECT 
        payment_method,
        payment_status,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM payments 
      WHERE 1=1 ${dateFilter}
      GROUP BY payment_method, payment_status
      ORDER BY total_amount DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment analytics' 
    });
  }
});

module.exports = router;
