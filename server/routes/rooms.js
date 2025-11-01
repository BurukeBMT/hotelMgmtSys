const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { isManager } = require('../middleware/auth');

const router = express.Router();

// Get all room types
router.get('/types', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM room_types ORDER BY base_price
    `);

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Room types error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching room types' 
    });
  }
});

// Create room type
router.post('/types', isManager, [
  body('name').notEmpty().withMessage('Room type name is required'),
  body('description').optional(),
  body('base_price').isFloat({ min: 0 }).withMessage('Valid base price is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('amenities').optional().isArray().withMessage('Amenities must be an array')
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

    const { name, description, base_price, capacity, amenities } = req.body;

    const result = await query(
      'INSERT INTO room_types (name, description, base_price, capacity, amenities) VALUES (?, ?, ?, ?, ?)',
      [name, description, base_price, capacity, JSON.stringify(amenities || [])]
    );

    res.status(201).json({
      success: true,
      message: 'Room type created successfully',
      data: result[0][0]
    });
  } catch (error) {
    console.error('Room type creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating room type' 
    });
  }
});

// Update room type
router.put('/types/:id', isManager, [
  body('name').optional().notEmpty().withMessage('Room type name cannot be empty'),
  body('description').optional(),
  body('base_price').optional().isFloat({ min: 0 }).withMessage('Valid base price is required'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('amenities').optional().isArray().withMessage('Amenities must be an array')
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

    const { id } = req.params;
    const { name, description, base_price, capacity, amenities } = req.body;

    const result = await query(
      `UPDATE room_types SET 
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       base_price = COALESCE(?, base_price),
       capacity = COALESCE(?, capacity),
       amenities = COALESCE(?, amenities)
       WHERE id = ?`,
      [name, description, base_price, capacity, amenities ? JSON.stringify(amenities) : null, id]
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room type not found' 
      });
    }

    res.json({
      success: true,
      message: 'Room type updated successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Room type update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating room type' 
    });
  }
});

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, room_type_id, floor } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    if (room_type_id) {
      whereClause += ' AND r.room_type_id = ?';
      params.push(room_type_id);
    }

    if (floor) {
      whereClause += ' AND r.floor = ?';
      params.push(floor);
    }

    const result = await query(
      `SELECT r.*, rt.name as room_type, rt.base_price, rt.capacity, rt.amenities
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       ${whereClause}
       ORDER BY r.room_number
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM rooms r
       ${whereClause}`,
      params
    );

  const total = parseInt(countResult[0][0].total);

    res.json({
      success: true,
      data: result[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Rooms error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching rooms' 
    });
  }
});

// Create new room
router.post('/', isManager, [
  body('room_number').notEmpty().withMessage('Room number is required'),
  body('room_type_id').isInt().withMessage('Room type ID is required'),
  body('floor').isInt({ min: 1 }).withMessage('Floor must be at least 1'),
  body('notes').optional()
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

    const { room_number, room_type_id, floor, notes } = req.body;

    // Check if room number already exists
    const existingRoom = await query(
      'SELECT id FROM rooms WHERE room_number = ?',
      [room_number]
    );

  if (existingRoom[0].length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Room number already exists' 
      });
    }

    const result = await query(
      'INSERT INTO rooms (room_number, room_type_id, floor, notes) VALUES (?, ?, ?, ?)',
      [room_number, room_type_id, floor, notes]
    );

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: result[0][0]
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating room' 
    });
  }
});

// Update room
router.put('/:id', isManager, [
  body('room_number').optional().notEmpty().withMessage('Room number cannot be empty'),
  body('room_type_id').optional().isInt().withMessage('Room type ID must be a number'),
  body('floor').optional().isInt({ min: 1 }).withMessage('Floor must be at least 1'),
  body('status').optional().isIn(['available', 'occupied', 'maintenance', 'cleaning']).withMessage('Invalid status'),
  body('is_clean').optional().isBoolean().withMessage('is_clean must be a boolean'),
  body('notes').optional()
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

    const { id } = req.params;
    const { room_number, room_type_id, floor, status, is_clean, notes } = req.body;

    // Check if room number already exists (if being changed)
    if (room_number) {
      const existingRoom = await query(
        'SELECT id FROM rooms WHERE room_number = ? AND id != ?',
        [room_number, id]
      );

    if (existingRoom[0].length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Room number already exists' 
        });
      }
    }

    const result = await query(
      `UPDATE rooms SET 
       room_number = COALESCE(?, room_number),
       room_type_id = COALESCE(?, room_type_id),
       floor = COALESCE(?, floor),
       status = COALESCE(?, status),
       is_clean = COALESCE(?, is_clean),
       notes = COALESCE(?, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [room_number, room_type_id, floor, status, is_clean, notes, id]
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room not found' 
      });
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Room update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating room' 
    });
  }
});

// Get room details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.*, rt.name as room_type, rt.base_price, rt.capacity, rt.amenities
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.id = ?`,
      [id]
    );

    if (result[0].length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room not found' 
      });
    }

    res.json({
      success: true,
      data: result[0][0]
    });
  } catch (error) {
    console.error('Room details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching room details' 
    });
  }
});

// Get room availability
router.get('/availability', async (req, res) => {
  try {
    const { check_in_date, check_out_date, room_type_id } = req.query;

    if (!check_in_date || !check_out_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Check-in and check-out dates are required' 
      });
    }

    let whereClause = 'WHERE 1=1';
    const params = [check_in_date, check_out_date];

    if (room_type_id) {
      whereClause += ' AND r.room_type_id = ?';
      params.push(room_type_id);
    }

    const result = await query(
      `SELECT r.*, rt.name as room_type, rt.base_price, rt.capacity, rt.amenities
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.id NOT IN (
         SELECT DISTINCT room_id
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in')
         AND (
           (check_in_date <= ? AND check_out_date > ?) OR
           (check_in_date < ? AND check_out_date >= ?) OR
           (check_in_date >= ? AND check_out_date <= ?)
         )
       )
       ${room_type_id ? 'AND r.room_type_id = ?' : ''}
       AND r.status = 'available'
       ORDER BY r.room_number`,
      room_type_id ? [...params, ...params, ...params, room_type_id] : [...params, ...params, ...params]
    );

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Room availability error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching room availability' 
    });
  }
});

// Get room dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Total rooms
    const totalRooms = await query('SELECT COUNT(*) as count FROM rooms');
    
    // Available rooms
    const availableRooms = await query("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'");
    
    // Occupied rooms
    const occupiedRooms = await query("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'");
    
    // Maintenance rooms
    const maintenanceRooms = await query("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance'");
    
    // Rooms by type
    const roomsByType = await query(`
      SELECT rt.name, COUNT(r.id) as count
      FROM room_types rt
      LEFT JOIN rooms r ON rt.id = r.room_type_id
      GROUP BY rt.id, rt.name
      ORDER BY count DESC
    `);

    // Occupancy rate
    const occupancyRate = await query(`
      SELECT ROUND(
        (COUNT(CASE WHEN status = 'occupied' THEN 1 END) * 100.0 / COUNT(*)
      ), 2) as rate
      FROM rooms
    `);

    res.json({
      success: true,
      data: {
        totalRooms: parseInt(totalRooms[0][0].count),
        availableRooms: parseInt(availableRooms[0][0].count),
        occupiedRooms: parseInt(occupiedRooms[0][0].count),
        maintenanceRooms: parseInt(maintenanceRooms[0][0].count),
        roomsByType: roomsByType[0],
        occupancyRate: parseFloat(occupancyRate[0][0].rate || 0)
      }
    });
  } catch (error) {
    console.error('Room dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching room dashboard data' 
    });
  }
});

module.exports = router; 