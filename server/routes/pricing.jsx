const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requirePrivilege } = require('../middleware/rbac');

const router = express.Router();

// Get all price tracking data
router.get('/tracking', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { room_type_id, date_from, date_to } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (room_type_id) {
      whereClause += ' AND pt.room_type_id = ?';
      params.push(room_type_id);
    }

    if (date_from) {
      whereClause += ' AND pt.effective_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND pt.effective_date <= ?';
      params.push(date_to);
    }

    const result = await query(`
      SELECT pt.*, rt.name as room_type_name, rt.description
      FROM price_tracking pt
      JOIN room_types rt ON pt.room_type_id = rt.id
      ${whereClause}
      ORDER BY pt.effective_date DESC, pt.room_type_id
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get price tracking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching price tracking data' 
    });
  }
});

// Create new price tracking entry
router.post('/tracking', authenticateToken, requirePrivilege('manage_rooms'), [
  body('room_type_id').isInt().withMessage('Room type ID is required'),
  body('base_price').isDecimal().withMessage('Base price must be a valid decimal'),
  body('seasonal_multiplier').optional().isDecimal().withMessage('Seasonal multiplier must be a valid decimal'),
  body('weekend_multiplier').optional().isDecimal().withMessage('Weekend multiplier must be a valid decimal'),
  body('holiday_multiplier').optional().isDecimal().withMessage('Holiday multiplier must be a valid decimal'),
  body('demand_multiplier').optional().isDecimal().withMessage('Demand multiplier must be a valid decimal'),
  body('effective_date').isISO8601().withMessage('Effective date is required')
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
      room_type_id, 
      base_price, 
      seasonal_multiplier = 1.00, 
      weekend_multiplier = 1.20, 
      holiday_multiplier = 1.50, 
      demand_multiplier = 1.00, 
      effective_date 
    } = req.body;

    // Calculate final price
    const finalPrice = base_price * seasonal_multiplier * weekend_multiplier * holiday_multiplier * demand_multiplier;

    const result = await query(`
      INSERT INTO price_tracking (room_type_id, base_price, seasonal_multiplier, weekend_multiplier, holiday_multiplier, demand_multiplier, final_price, effective_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [room_type_id, base_price, seasonal_multiplier, weekend_multiplier, holiday_multiplier, demand_multiplier, finalPrice, effective_date]);

    res.status(201).json({
      success: true,
      message: 'Price tracking entry created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create price tracking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating price tracking entry' 
    });
  }
});

// Update price tracking entry
router.put('/tracking/:id', authenticateToken, requirePrivilege('manage_rooms'), [
  body('base_price').optional().isDecimal().withMessage('Base price must be a valid decimal'),
  body('seasonal_multiplier').optional().isDecimal().withMessage('Seasonal multiplier must be a valid decimal'),
  body('weekend_multiplier').optional().isDecimal().withMessage('Weekend multiplier must be a valid decimal'),
  body('holiday_multiplier').optional().isDecimal().withMessage('Holiday multiplier must be a valid decimal'),
  body('demand_multiplier').optional().isDecimal().withMessage('Demand multiplier must be a valid decimal'),
  body('effective_date').optional().isISO8601().withMessage('Effective date must be valid')
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

    const priceId = req.params.id;
    const updates = req.body;

    // Get current data
    const currentResult = await query('SELECT * FROM price_tracking WHERE id = ?', [priceId]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Price tracking entry not found' 
      });
    }

    const current = currentResult.rows[0];
    const updatedData = { ...current, ...updates };

    // Recalculate final price if any multiplier changed
    const finalPrice = updatedData.base_price * updatedData.seasonal_multiplier * updatedData.weekend_multiplier * updatedData.holiday_multiplier * updatedData.demand_multiplier;

    const result = await query(`
      UPDATE price_tracking 
      SET base_price = ?, seasonal_multiplier = ?, weekend_multiplier = ?, holiday_multiplier = ?, demand_multiplier = ?, final_price = ?, effective_date = ?
      WHERE id = ?
    `, [
      updatedData.base_price,
      updatedData.seasonal_multiplier,
      updatedData.weekend_multiplier,
      updatedData.holiday_multiplier,
      updatedData.demand_multiplier,
      finalPrice,
      updatedData.effective_date,
      priceId
    ]);

    res.json({
      success: true,
      message: 'Price tracking entry updated successfully'
    });
  } catch (error) {
    console.error('Update price tracking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating price tracking entry' 
    });
  }
});

// Get current pricing for a room type
router.get('/current/:room_type_id', authenticateToken, async (req, res) => {
  try {
    const roomTypeId = req.params.room_type_id;
    const { date } = req.query;

    const queryDate = date || new Date().toISOString().split('T')[0];

    const result = await query(`
      SELECT pt.*, rt.name as room_type_name
      FROM price_tracking pt
      JOIN room_types rt ON pt.room_type_id = rt.id
      WHERE pt.room_type_id = ? AND pt.effective_date <= ?
      ORDER BY pt.effective_date DESC
      LIMIT 1
    `, [roomTypeId, queryDate]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No pricing data found for this room type' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get current pricing error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching current pricing' 
    });
  }
});

// Calculate dynamic pricing
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const { room_type_id, check_in_date, check_out_date, guest_count } = req.body;

    // Get base pricing
    const pricingResult = await query(`
      SELECT * FROM price_tracking 
      WHERE room_type_id = ? AND effective_date <= ?
      ORDER BY effective_date DESC 
      LIMIT 1
    `, [room_type_id, check_in_date]);

    if (pricingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No pricing data found for this room type' 
      });
    }

    const basePricing = pricingResult.rows[0];
    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    let totalPrice = 0;
    let dailyPrices = [];

    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      let dailyPrice = basePricing.base_price;
      
      // Apply weekend multiplier
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        dailyPrice *= basePricing.weekend_multiplier;
      }
      
      // Apply holiday multiplier (simplified - you can add holiday detection logic)
      const isHoliday = false; // Add your holiday detection logic here
      if (isHoliday) {
        dailyPrice *= basePricing.holiday_multiplier;
      }
      
      // Apply seasonal multiplier
      dailyPrice *= basePricing.seasonal_multiplier;
      
      // Apply demand multiplier
      dailyPrice *= basePricing.demand_multiplier;
      
      dailyPrices.push({
        date: currentDate.toISOString().split('T')[0],
        price: Math.round(dailyPrice * 100) / 100
      });
      
      totalPrice += dailyPrice;
    }

    res.json({
      success: true,
      data: {
        room_type_id,
        check_in_date,
        check_out_date,
        nights,
        daily_prices: dailyPrices,
        total_price: Math.round(totalPrice * 100) / 100,
        base_pricing: basePricing
      }
    });
  } catch (error) {
    console.error('Calculate pricing error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error calculating pricing' 
    });
  }
});

// Get pricing analytics
router.get('/analytics', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = 'AND pt.effective_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'AND pt.effective_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'AND pt.effective_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        break;
      case '1y':
        dateFilter = 'AND pt.effective_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
        break;
    }

    const result = await query(`
      SELECT 
        rt.name as room_type_name,
        AVG(pt.base_price) as avg_base_price,
        AVG(pt.final_price) as avg_final_price,
        AVG(pt.seasonal_multiplier) as avg_seasonal_multiplier,
        AVG(pt.weekend_multiplier) as avg_weekend_multiplier,
        AVG(pt.holiday_multiplier) as avg_holiday_multiplier,
        AVG(pt.demand_multiplier) as avg_demand_multiplier,
        COUNT(*) as price_changes
      FROM price_tracking pt
      JOIN room_types rt ON pt.room_type_id = rt.id
      WHERE 1=1 ${dateFilter}
      GROUP BY pt.room_type_id, rt.name
      ORDER BY avg_final_price DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get pricing analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching pricing analytics' 
    });
  }
});

// Delete price tracking entry
router.delete('/tracking/:id', authenticateToken, requirePrivilege('manage_rooms'), async (req, res) => {
  try {
    const priceId = req.params.id;

    const result = await query('DELETE FROM price_tracking WHERE id = ?', [priceId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Price tracking entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Price tracking entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete price tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting price tracking entry'
    });
  }
});

module.exports = router;
