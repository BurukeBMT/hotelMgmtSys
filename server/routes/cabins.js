const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requirePrivilege } = require('../middleware/rbac');

const router = express.Router();

// Get all cabins
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, cabin_type, location, available_dates } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (cabin_type) {
      whereClause += ' AND cabin_type = ?';
      params.push(cabin_type);
    }

    if (location) {
      whereClause += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }

    // Check availability for specific dates
    if (available_dates) {
      const { check_in, check_out } = JSON.parse(available_dates);
      whereClause += ` AND id NOT IN (
        SELECT DISTINCT cabin_id FROM bookings 
        WHERE cabin_id IS NOT NULL 
        AND ((check_in_date <= ? AND check_out_date > ?) OR (check_in_date < ? AND check_out_date >= ?))
        AND status IN ('confirmed', 'pending')
      )`;
      params.push(check_out, check_in, check_out, check_in);
    }

    const result = await query(`
      SELECT * FROM cabins 
      ${whereClause}
      ORDER BY cabin_number
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get cabins error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cabins' 
    });
  }
});

// Get single cabin
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const cabinId = req.params.id;
    
    const result = await query('SELECT * FROM cabins WHERE id = ?', [cabinId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cabin not found' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get cabin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cabin' 
    });
  }
});

// Create new cabin
router.post('/', authenticateToken, requirePrivilege('manage_rooms'), [
  body('cabin_number').notEmpty().withMessage('Cabin number is required'),
  body('cabin_type').notEmpty().withMessage('Cabin type is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('base_price').isDecimal().withMessage('Base price must be a valid decimal'),
  body('location').optional(),
  body('amenities').optional().isJSON().withMessage('Amenities must be valid JSON')
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

    const { cabin_number, cabin_type, capacity, amenities, location, base_price } = req.body;

    // Check if cabin number already exists
    const existingCabin = await query('SELECT id FROM cabins WHERE cabin_number = ?', [cabin_number]);
    if (existingCabin.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Cabin number already exists' 
      });
    }

    const result = await query(`
      INSERT INTO cabins (cabin_number, cabin_type, capacity, amenities, location, base_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [cabin_number, cabin_type, capacity, amenities || '[]', location, base_price]);

    res.status(201).json({
      success: true,
      message: 'Cabin created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create cabin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating cabin' 
    });
  }
});

// Update cabin
router.put('/:id', authenticateToken, requirePrivilege('manage_rooms'), [
  body('cabin_type').optional().notEmpty().withMessage('Cabin type cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('base_price').optional().isDecimal().withMessage('Base price must be a valid decimal'),
  body('location').optional(),
  body('amenities').optional().isJSON().withMessage('Amenities must be valid JSON'),
  body('status').optional().isIn(['available', 'occupied', 'maintenance', 'out_of_order']).withMessage('Invalid status')
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

    const cabinId = req.params.id;
    const updates = req.body;

    // Check if cabin exists
    const existingCabin = await query('SELECT id FROM cabins WHERE id = ?', [cabinId]);
    if (existingCabin.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cabin not found' 
      });
    }

    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(cabinId);

    await query(`
      UPDATE cabins 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `, params);

    res.json({
      success: true,
      message: 'Cabin updated successfully'
    });
  } catch (error) {
    console.error('Update cabin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating cabin' 
    });
  }
});

// Delete cabin
router.delete('/:id', authenticateToken, requirePrivilege('manage_rooms'), async (req, res) => {
  try {
    const cabinId = req.params.id;

    // Check if cabin has active bookings
    const activeBookings = await query(
      'SELECT id FROM bookings WHERE cabin_id = ? AND status IN (?, ?)',
      [cabinId, 'confirmed', 'pending']
    );

    if (activeBookings.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete cabin with active bookings' 
      });
    }

    const result = await query('DELETE FROM cabins WHERE id = ?', [cabinId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cabin not found' 
      });
    }

    res.json({
      success: true,
      message: 'Cabin deleted successfully'
    });
  } catch (error) {
    console.error('Delete cabin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting cabin' 
    });
  }
});

// Get cabin availability
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const cabinId = req.params.id;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    // Get cabin details
    const cabinResult = await query('SELECT * FROM cabins WHERE id = ?', [cabinId]);
    if (cabinResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cabin not found' 
      });
    }

    // Get bookings for the date range
    const bookingsResult = await query(`
      SELECT check_in_date, check_out_date, status
      FROM bookings 
      WHERE cabin_id = ? 
      AND ((check_in_date <= ? AND check_out_date > ?) OR (check_in_date < ? AND check_out_date >= ?))
      AND status IN ('confirmed', 'pending')
    `, [cabinId, end_date, start_date, end_date, start_date]);

    const cabin = cabinResult.rows[0];
    const bookings = bookingsResult.rows;

    // Generate availability calendar
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const availability = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const isBooked = bookings.some(booking => 
        dateStr >= booking.check_in_date && dateStr < booking.check_out_date
      );

      availability.push({
        date: dateStr,
        available: !isBooked,
        price: cabin.base_price
      });
    }

    res.json({
      success: true,
      data: {
        cabin: cabin,
        availability: availability,
        total_days: availability.length,
        available_days: availability.filter(day => day.available).length
      }
    });
  } catch (error) {
    console.error('Get cabin availability error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cabin availability' 
    });
  }
});

// Get cabin types
router.get('/types/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT cabin_type, COUNT(*) as count
      FROM cabins 
      GROUP BY cabin_type
      ORDER BY cabin_type
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get cabin types error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cabin types' 
    });
  }
});

// Get cabin locations
router.get('/locations/list', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT location, COUNT(*) as count
      FROM cabins 
      WHERE location IS NOT NULL
      GROUP BY location
      ORDER BY location
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get cabin locations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cabin locations' 
    });
  }
});

module.exports = router;
