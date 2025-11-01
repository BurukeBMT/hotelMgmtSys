const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, is_active } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (role) {
      whereClause += ' AND role = $' + (params.length + 1);
      params.push(role);
    }

    if (is_active !== undefined) {
      whereClause += ' AND is_active = $' + (params.length + 1);
      params.push(is_active === 'true');
    }

    const result = await query(
      `SELECT id, username, email, first_name, last_name, role, phone, address, is_active, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), Number(offset)]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM users
       ${whereClause}`,
      params
    );

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
    console.error('Users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

// Get user details
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, username, email, first_name, last_name, role, phone, address, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user details' 
    });
  }
});

// Update user
router.put('/:id', isAdmin, [
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'manager', 'staff', 'user']).withMessage('Invalid role'),
  body('phone').optional(),
  body('address').optional(),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
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
    const { first_name, last_name, email, role, phone, address, is_active } = req.body;

    // Check if email already exists (if being changed)
    if (email) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
    }

    const result = await query(
      `UPDATE users SET 
       first_name = COALESCE(?, first_name),
       last_name = COALESCE(?, last_name),
       email = COALESCE(?, email),
       role = COALESCE(?, role),
       phone = COALESCE(?, phone),
       address = COALESCE(?, address),
       is_active = COALESCE(?, is_active),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [first_name, last_name, email, role, phone, address, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating user' 
    });
  }
});

// Delete user
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if user has any associated data
    const hasBookings = await query(
      'SELECT COUNT(*) as count FROM bookings WHERE created_by = ?',
      [id]
    );

    if (parseInt(hasBookings.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete user with associated bookings' 
      });
    }

    // Soft delete by setting is_active to false
    await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting user' 
    });
  }
});

// Get user statistics
router.get('/stats/overview', isAdmin, async (req, res) => {
  try {
    // Total users
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    
    // Active users
    const activeUsers = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    
    // Users by role
    const usersByRole = await query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE is_active = true
      GROUP BY role
      ORDER BY count DESC
    `);

    // Recent registrations
    const recentUsers = await query(`
      SELECT id, username, email, first_name, last_name, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        activeUsers: parseInt(activeUsers.rows[0].count),
        usersByRole: usersByRole.rows,
        recentUsers: recentUsers.rows
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user statistics' 
    });
  }
});

module.exports = router;