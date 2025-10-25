const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');

const router = express.Router();

// Get all guests
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      // MySQL doesn't support ILIKE. Use case-insensitive search via LOWER(... ) LIKE LOWER(...)
      whereClause += ` AND (LOWER(first_name) LIKE LOWER($${paramCount}) OR LOWER(last_name) LIKE LOWER($${paramCount}) OR LOWER(email) LIKE LOWER($${paramCount}) OR LOWER(phone) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }

    const result = await query(`
      SELECT * FROM guests
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM guests
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Guests error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching guests' 
    });
  }
});

// Create new guest
router.post('/', [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional(),
  body('address').optional(),
  body('id_type').optional(),
  body('id_number').optional(),
  body('nationality').optional()
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
      first_name, last_name, email, phone, address, 
      id_type, id_number, nationality 
    } = req.body;

    const result = await query(
      `INSERT INTO guests (first_name, last_name, email, phone, address, id_type, id_number, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [first_name, last_name, email, phone, address, id_type, id_number, nationality]
    );

    res.status(201).json({
      success: true,
      message: 'Guest created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Guest creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating guest' 
    });
  }
});

// Update guest
router.put('/:id', [
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional(),
  body('address').optional(),
  body('id_type').optional(),
  body('id_number').optional(),
  body('nationality').optional()
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
    const { 
      first_name, last_name, email, phone, address, 
      id_type, id_number, nationality 
    } = req.body;

    const result = await query(
      `UPDATE guests SET 
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       email = COALESCE($3, email),
       phone = COALESCE($4, phone),
       address = COALESCE($5, address),
       id_type = COALESCE($6, id_type),
       id_number = COALESCE($7, id_number),
       nationality = COALESCE($8, nationality),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [first_name, last_name, email, phone, address, id_type, id_number, nationality, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Guest not found' 
      });
    }

    res.json({
      success: true,
      message: 'Guest updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Guest update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating guest' 
    });
  }
});

// Get guest details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM guests WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Guest not found' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Guest details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching guest details' 
    });
  }
});

// Get guest booking history
router.get('/:id/bookings', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT b.*, r.room_number, rt.name as room_type
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.guest_id = $1
      ORDER BY b.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Guest bookings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching guest bookings' 
    });
  }
});

module.exports = router; 