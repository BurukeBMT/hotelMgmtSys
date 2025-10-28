const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requirePrivilege, canManageUser } = require('../middleware/rbac');

const router = express.Router();

// Get all users (admin and super admin only)
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    // Get users with pagination
    const usersResult = await query(
      `SELECT id, username, email, first_name, last_name, role, phone, address, is_active, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

// Create new admin user (super admin only)
router.post('/users', authenticateToken, requireRole('super_admin'), [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['admin', 'manager', 'staff']).withMessage('Invalid role for admin creation')
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

    const { username, email, password, first_name, last_name, role, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role, phone, address, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, first_name, last_name, role, phone, address, req.user.id]
    );

    // Get the created user
    const userResult = await query(
      'SELECT id, username, email, first_name, last_name, role, phone, address, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: userResult.rows[0]
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating admin user' 
    });
  }
});

// Update user (admin and super admin only)
router.put('/users/:id', authenticateToken, requireRole('admin'), [
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('address').optional(),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
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

    const userId = req.params.id;
    const { first_name, last_name, phone, address, is_active } = req.body;

    // Check if user can manage this user
    await canManageUser(userId)(req, res, () => {});

    const updateFields = [];
    const params = [];

    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      params.push(last_name);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(phone);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      params.push(address);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get updated user
    const userResult = await query(
      'SELECT id, username, email, first_name, last_name, role, phone, address, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResult.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating user' 
    });
  }
});

// Delete user (super admin only)
router.delete('/users/:id', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Cannot delete self
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }

    const result = await query('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting user' 
    });
  }
});

// Get user privileges
router.get('/users/:id/privileges', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await query(
      `SELECT p.privilege, p.granted_at, u.username as granted_by_username
       FROM admin_privileges p
       JOIN users u ON p.granted_by = u.id
       WHERE p.user_id = ?
       ORDER BY p.granted_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get user privileges error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user privileges' 
    });
  }
});

// Grant privilege to user (super admin only)
router.post('/users/:id/privileges', authenticateToken, requireRole('super_admin'), [
  body('privilege').notEmpty().withMessage('Privilege is required')
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

    const userId = req.params.id;
    const { privilege } = req.body;

    // Check if user exists
    const userResult = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if privilege already exists
    const existingPrivilege = await query(
      'SELECT id FROM admin_privileges WHERE user_id = ? AND privilege = ?',
      [userId, privilege]
    );

    if (existingPrivilege.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Privilege already granted to this user' 
      });
    }

    // Grant privilege
    await query(
      'INSERT INTO admin_privileges (user_id, privilege, granted_by) VALUES (?, ?, ?)',
      [userId, privilege, req.user.id]
    );

    res.json({
      success: true,
      message: 'Privilege granted successfully'
    });
  } catch (error) {
    console.error('Grant privilege error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error granting privilege' 
    });
  }
});

// Revoke privilege from user (super admin only)
router.delete('/users/:id/privileges/:privilege', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const privilege = req.params.privilege;

    const result = await query(
      'DELETE FROM admin_privileges WHERE user_id = ? AND privilege = ?',
      [userId, privilege]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Privilege not found' 
      });
    }

    res.json({
      success: true,
      message: 'Privilege revoked successfully'
    });
  } catch (error) {
    console.error('Revoke privilege error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error revoking privilege' 
    });
  }
});

// Get available privileges
router.get('/privileges', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const privileges = [
      'manage_users',
      'manage_rooms',
      'manage_bookings',
      'manage_guests',
      'manage_payments',
      'manage_reports',
      'manage_hr',
      'manage_inventory',
      'manage_maintenance',
      'view_analytics',
      'manage_settings'
    ];

    res.json({
      success: true,
      data: privileges
    });
  } catch (error) {
    console.error('Get privileges error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching privileges' 
    });
  }
});

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Get total users
    const totalUsersResult = await query('SELECT COUNT(*) as total FROM users');
    const totalUsers = totalUsersResult.rows[0].total;

    // Get total admins
    const totalAdminsResult = await query(
      'SELECT COUNT(*) as total FROM users WHERE role IN (?, ?, ?)',
      ['super_admin', 'admin', 'manager', 'staff']
    );
    const totalAdmins = totalAdminsResult.rows[0].total;

    // Get total bookings
    const totalBookingsResult = await query('SELECT COUNT(*) as total FROM bookings');
    const totalBookings = totalBookingsResult.rows[0].total;

    // Get total revenue
    const totalRevenueResult = await query('SELECT SUM(total_amount) as total FROM bookings WHERE status = ?', ['confirmed']);
    const totalRevenue = totalRevenueResult.rows[0].total || 0;

    // Get active users (users with recent activity)
    const activeUsersResult = await query(
      'SELECT COUNT(*) as total FROM users WHERE is_active = ? AND updated_at > DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [true]
    );
    const activeUsers = activeUsersResult.rows[0].total;

    // Get pending bookings
    const pendingBookingsResult = await query('SELECT COUNT(*) as total FROM bookings WHERE status = ?', ['pending']);
    const pendingBookings = pendingBookingsResult.rows[0].total;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        totalBookings,
        totalRevenue,
        activeUsers,
        pendingBookings
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard statistics' 
    });
  }
});

// Get recent activity
router.get('/recent-activity', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const activities = [
      {
        message: 'New booking created for Room 101',
        time: '3h ago',
        color: 'bg-blue-500',
        icon: 'Calendar'
      },
      {
        message: 'Guest checked out from Room 205',
        time: '1d ago',
        color: 'bg-green-500',
        icon: 'CheckCircle'
      },
      {
        message: 'Payment received for Booking #1234',
        time: '2d ago',
        color: 'bg-yellow-500',
        icon: 'DollarSign'
      },
      {
        message: 'New admin user added',
        time: '3d ago',
        color: 'bg-purple-500',
        icon: 'UserPlus'
      },
      {
        message: 'Room maintenance completed',
        time: '4d ago',
        color: 'bg-indigo-500',
        icon: 'Wrench'
      }
    ];

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching recent activity' 
    });
  }
});

module.exports = router;
