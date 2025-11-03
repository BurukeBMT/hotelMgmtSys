const express = require('express');
const { query } = require('../database/config');

const router = express.Router();

// Helper: safe param push
const pushIf = (arr, val) => { if (typeof val !== 'undefined' && val !== null && val !== '') arr.push(val); };

// Get revenue report (MySQL compatible)
router.get('/revenue', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'month' } = req.query;

    let format;
    if (group_by === 'day') {
      format = '%Y-%m-%d';
    } else if (group_by === 'week') {
      // Year-week
      format = '%x-%v';
    } else {
      format = '%Y-%m';
    }

    let where = 'WHERE p.payment_status = \'completed\'';
    const params = [];
    if (start_date) { params.push(start_date); where += ' AND p.payment_date >= ?'; }
    if (end_date) { params.push(end_date); where += ' AND p.payment_date <= ?'; }

    const sql = `
      SELECT DATE_FORMAT(p.payment_date, '${format}') AS period,
             COUNT(*) AS payment_count,
             SUM(p.amount) AS total_revenue,
             AVG(p.amount) AS avg_payment
      FROM payments p
      ${where}
      GROUP BY DATE_FORMAT(p.payment_date, '${format}')
      ORDER BY DATE_FORMAT(p.payment_date, '${format}')
    `;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ success: false, message: 'Error generating revenue report' });
  }
});

// Get occupancy report (MySQL 8+ recursive CTE)
router.get('/occupancy', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params = [start_date || null, end_date || null];

    const sql = `
      WITH RECURSIVE dates AS (
        SELECT COALESCE(?, DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS d
        UNION ALL
        SELECT DATE_ADD(d, INTERVAL 1 DAY) FROM dates WHERE d < COALESCE(?, CURDATE())
      )
      SELECT d AS date,
             (SELECT COUNT(*) FROM bookings b WHERE d >= b.check_in_date AND d < b.check_out_date AND b.status IN ('confirmed','checked_in')) AS occupied_rooms,
             (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance') AS total_rooms,
             ROUND(
               ( (SELECT COUNT(*) FROM bookings b WHERE d >= b.check_in_date AND d < b.check_out_date AND b.status IN ('confirmed','checked_in'))
                 * 100.0 / (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance') ), 2) AS occupancy_rate
      FROM dates
      ORDER BY d;
    `;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Occupancy report error:', error);
    res.status(500).json({ success: false, message: 'Error generating occupancy report' });
  }
});

// Get booking report
router.get('/bookings', async (req, res) => {
  try {
    const { start_date, end_date, status, room_type_id } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (start_date) { where += ' AND b.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND b.created_at <= ?'; params.push(end_date); }
    if (status) { where += ' AND b.status = ?'; params.push(status); }
    if (room_type_id) { where += ' AND r.room_type_id = ?'; params.push(room_type_id); }

    const sql = `
      SELECT b.*, g.first_name, g.last_name, g.email,
             r.room_number, rt.name AS room_type,
             u.first_name AS created_by_name, u.last_name AS created_by_last_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN users u ON b.created_by = u.id
      ${where}
      ORDER BY b.created_at DESC
    `;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Booking report error:', error);
    res.status(500).json({ success: false, message: 'Error generating booking report' });
  }
});

// Get guest report
router.get('/guests', async (req, res) => {
  try {
    const { start_date, end_date, nationality } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (start_date) { where += ' AND g.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND g.created_at <= ?'; params.push(end_date); }
    if (nationality) { where += ' AND g.nationality = ?'; params.push(nationality); }

    const sql = `
      SELECT g.*, COUNT(b.id) AS total_bookings, COALESCE(SUM(b.total_amount), 0) AS total_spent, AVG(b.total_amount) AS avg_booking_value
      FROM guests g
      LEFT JOIN bookings b ON g.id = b.guest_id
      ${where}
      GROUP BY g.id
      ORDER BY total_spent DESC
    `;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Guest report error:', error);
    res.status(500).json({ success: false, message: 'Error generating guest report' });
  }
});

// Get room performance report
router.get('/room-performance', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (start_date) { where += ' AND b.created_at >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND b.created_at <= ?'; params.push(end_date); }

    const sql = `
      SELECT r.room_number, rt.name AS room_type, rt.base_price,
             COUNT(b.id) AS total_bookings, COALESCE(SUM(b.total_amount), 0) AS total_revenue, AVG(b.total_amount) AS avg_booking_value,
             ROUND((COUNT(b.id) * 100.0 / (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance')), 2) AS booking_percentage
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN bookings b ON r.id = b.room_id ${where.replace('WHERE 1=1', 'AND')}
      GROUP BY r.id, r.room_number, rt.name, rt.base_price
      ORDER BY total_revenue DESC
    `;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Room performance report error:', error);
    res.status(500).json({ success: false, message: 'Error generating room performance report' });
  }
});

// Get employee performance report
router.get('/employee-performance', async (req, res) => {
  try {
    const { start_date, end_date, department_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (start_date) { where += ' AND e.hire_date >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND e.hire_date <= ?'; params.push(end_date); }
    if (department_id) { where += ' AND e.department_id = ?'; params.push(department_id); }

    const sql = `
      SELECT e.*, u.first_name, u.last_name, u.email, d.name AS department_name,
             COUNT(b.id) AS bookings_created, COALESCE(SUM(b.total_amount), 0) AS revenue_generated
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN bookings b ON u.id = b.created_by
      ${where}
      GROUP BY e.id, u.first_name, u.last_name, u.email, d.name
      ORDER BY revenue_generated DESC
    `;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Employee performance report error:', error);
    res.status(500).json({ success: false, message: 'Error generating employee performance report' });
  }
});

// Get dashboard summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    // Total revenue this month
    const monthlyRevenue = await query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE payment_status = 'completed'
        AND MONTH(payment_date) = MONTH(CURDATE())
        AND YEAR(payment_date) = YEAR(CURDATE())
    `);

    // Total bookings this month
    const monthlyBookings = await query(`
      SELECT COUNT(*) AS total
      FROM bookings
      WHERE MONTH(created_at) = MONTH(CURDATE())
        AND YEAR(created_at) = YEAR(CURDATE())
    `);

    // Average occupancy rate
    const avgOccupancy = await query(`
      SELECT ROUND((COUNT(CASE WHEN status IN ('confirmed','checked_in') THEN 1 END) * 100.0 /
                    (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance')), 2) AS rate
      FROM bookings
      WHERE check_in_date <= CURDATE() AND check_out_date > CURDATE()
    `);

    // Top performing rooms
    const topRooms = await query(`
      SELECT r.room_number, rt.name AS room_type, COUNT(b.id) AS bookings
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN bookings b ON r.id = b.room_id
      WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY r.id, r.room_number, rt.name
      ORDER BY bookings DESC
      LIMIT 5
    `);

    // Recent activities
    const recentActivities = await query(`
      SELECT type, ref, first_name, last_name, created_at FROM (
        SELECT 'booking' AS type, b.booking_number AS ref, g.first_name, g.last_name, b.created_at
        FROM bookings b
        LEFT JOIN guests g ON b.guest_id = g.id
        WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        UNION ALL
        SELECT 'payment' AS type, p.transaction_id AS ref, g.first_name, g.last_name, p.payment_date AS created_at
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN guests g ON b.guest_id = g.id
        WHERE p.payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ) t
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        monthlyRevenue: parseFloat(monthlyRevenue.rows[0].total || 0),
        monthlyBookings: parseInt(monthlyBookings.rows[0].total || 0),
        avgOccupancy: parseFloat((avgOccupancy.rows[0] && avgOccupancy.rows[0].rate) || 0),
        topRooms: topRooms.rows,
        recentActivities: recentActivities.rows
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Error generating dashboard summary' });
  }
});

module.exports = router;