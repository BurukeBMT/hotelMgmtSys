const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requirePrivilege } = require('../middleware/rbac');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_read, type, priority, limit = 50 } = req.query;
    
    let whereClause = 'WHERE user_id = ?';
    let params = [req.user.id];

    if (is_read !== undefined) {
      whereClause += ' AND is_read = ?';
      params.push(is_read === 'true');
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (priority) {
      whereClause += ' AND priority = ?';
      params.push(priority);
    }

    const result = await query(`
      SELECT * FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notifications' 
    });
  }
});

// Get notification count
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN priority = 'high' AND is_read = false THEN 1 ELSE 0 END) as high_priority_unread
      FROM notifications 
      WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notification count' 
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const result = await query(`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = ? AND user_id = ?
    `, [notificationId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking notification as read' 
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await query(`
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = ? AND is_read = false
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking all notifications as read' 
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const result = await query(`
      DELETE FROM notifications 
      WHERE id = ? AND user_id = ?
    `, [notificationId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting notification' 
    });
  }
});

// Create notification (admin only)
router.post('/', authenticateToken, requireRole('admin'), [
  body('user_id').optional().isInt().withMessage('User ID must be an integer'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['info', 'warning', 'error', 'success', 'booking', 'payment', 'system']).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
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

    const { user_id, title, message, type, priority = 'medium' } = req.body;

    // If no user_id specified, send to all users
    if (user_id) {
      const result = await query(`
        INSERT INTO notifications (user_id, title, message, type, priority)
        VALUES (?, ?, ?, ?, ?)
      `, [user_id, title, message, type, priority]);

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { id: result.insertId }
      });
    } else {
      // Send to all users
      const usersResult = await query('SELECT id FROM users WHERE is_active = true');
      const notifications = usersResult.rows.map(user => [
        user.id, title, message, type, priority
      ]);

      if (notifications.length > 0) {
        await query(`
          INSERT INTO notifications (user_id, title, message, type, priority)
          VALUES ?
        `, [notifications]);

        res.status(201).json({
          success: true,
          message: `Notification sent to ${notifications.length} users`,
          data: { count: notifications.length }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No active users found'
        });
      }
    }
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating notification' 
    });
  }
});

// Get notification analytics (admin only)
router.get('/analytics', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
        break;
      case '1y':
        dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
        break;
    }

    const result = await query(`
      SELECT 
        type,
        priority,
        COUNT(*) as total_count,
        SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread_count,
        ROUND(SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as read_rate
      FROM notifications 
      WHERE 1=1 ${dateFilter}
      GROUP BY type, priority
      ORDER BY total_count DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get notification analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notification analytics' 
    });
  }
});

// Helper function to create notification
async function createNotification(userId, title, message, type = 'info', priority = 'medium') {
  try {
    const result = await query(`
      INSERT INTO notifications (user_id, title, message, type, priority)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, title, message, type, priority]);
    
    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('Create notification helper error:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to create system notifications
async function createSystemNotification(title, message, type = 'system', priority = 'medium') {
  try {
    const usersResult = await query('SELECT id FROM users WHERE is_active = true');
    const notifications = usersResult.rows.map(user => [
      user.id, title, message, type, priority
    ]);

    if (notifications.length > 0) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type, priority)
        VALUES ?
      `, [notifications]);
    }
    
    return { success: true, count: notifications.length };
  } catch (error) {
    console.error('Create system notification helper error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { router, createNotification, createSystemNotification };
