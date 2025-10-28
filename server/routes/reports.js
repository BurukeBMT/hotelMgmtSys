const express = require('express');
const { query } = require('../database/config');

const router = express.Router();

// Get revenue report
router.get('/revenue', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'month' } = req.query;

    let dateFormat, groupClause;
    if (group_by === 'day') {
      dateFormat = 'YYYY-MM-DD';
      groupClause = 'DATE(p.payment_date)';
    } else if (group_by === 'week') {
      dateFormat = 'YYYY-"W"WW';
      groupClause = 'DATE_TRUNC(\'week\', p.payment_date)';
    } else {
      dateFormat = 'YYYY-MM';
      groupClause = 'DATE_TRUNC(\'month\', p.payment_date)';
    }

    let whereClause = 'WHERE p.payment_status = \'completed\'';
    const params = [];

    if (start_date) {
      params.push(start_date);
      whereClause += ` AND p.payment_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      whereClause += ` AND p.payment_date <= $${params.length}`;
    }

    const result = await query(`
      SELECT 
        TO_CHAR(${groupClause}, '${dateFormat}') as period,
        COUNT(*) as payment_count,
        SUM(p.amount) as total_revenue,
        AVG(p.amount) as avg_payment
      FROM payments p
      ${whereClause}
      GROUP BY ${groupClause}
      ORDER BY ${groupClause}
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating revenue report' 
    });
  }
});

// Get occupancy report
router.get('/occupancy', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      params.push(start_date);
      whereClause += ` AND b.check_in_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      whereClause += ` AND b.check_out_date <= $${params.length}`;
    }

    const result = await query(`
      SELECT 
        DATE_TRUNC('day', generate_series) as date,
        COUNT(b.id) as occupied_rooms,
        (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance') as total_rooms,
        ROUND(
          (COUNT(b.id) * 100.0 / (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance'))
        , 2) as occupancy_rate
      FROM generate_series(
        COALESCE($1, CURRENT_DATE - INTERVAL '30 days'),
        COALESCE($2, CURRENT_DATE),
        '1 day'::interval
      ) as generate_series
      LEFT JOIN bookings b ON 
        generate_series >= b.check_in_date AND 
        generate_series < b.check_out_date AND
        b.status IN ('confirmed', 'checked_in')
      ${whereClause}
      GROUP BY generate_series
      ORDER BY generate_series
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Occupancy report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating occupancy report' 
    });
  }
});

// Get booking report
router.get('/bookings', async (req, res) => {
  try {
    const { start_date, end_date, status, room_type_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND b.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND b.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND b.status = $${paramCount}`;
      params.push(status);
    }

    if (room_type_id) {
      paramCount++;
      whereClause += ` AND r.room_type_id = $${paramCount}`;
      params.push(room_type_id);
    }

    const result = await query(`
      SELECT 
        b.*,
        g.first_name, g.last_name, g.email,
        r.room_number, rt.name as room_type,
        u.first_name as created_by_name, u.last_name as created_by_last_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN users u ON b.created_by = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Booking report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating booking report' 
    });
  }
});

// Get guest report
router.get('/guests', async (req, res) => {
  try {
    const { start_date, end_date, nationality } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND g.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND g.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (nationality) {
      paramCount++;
      whereClause += ` AND g.nationality = $${paramCount}`;
      params.push(nationality);
    }

    const result = await query(`
      SELECT 
        g.*,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.total_amount), 0) as total_spent,
        AVG(b.total_amount) as avg_booking_value
      FROM guests g
      LEFT JOIN bookings b ON g.id = b.guest_id
      ${whereClause}
      GROUP BY g.id
      ORDER BY total_spent DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Guest report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating guest report' 
    });
  }
});

// Get room performance report
router.get('/room-performance', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND b.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND b.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    const result = await query(`
      SELECT 
        r.room_number,
        rt.name as room_type,
        rt.base_price,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        AVG(b.total_amount) as avg_booking_value,
        ROUND(
          (COUNT(b.id) * 100.0 / 
           (SELECT COUNT(*) FROM bookings ${whereClause.replace('WHERE 1=1', '')}))
        , 2) as booking_percentage
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN bookings b ON r.id = b.room_id ${whereClause.replace('WHERE 1=1', 'AND')}
      GROUP BY r.id, r.room_number, rt.name, rt.base_price
      ORDER BY total_revenue DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Room performance report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating room performance report' 
    });
  }
});

// Get employee performance report
router.get('/employee-performance', async (req, res) => {
  try {
    const { start_date, end_date, department_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      whereClause += ` AND e.hire_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND e.hire_date <= $${paramCount}`;
      params.push(end_date);
    }

    if (department_id) {
      paramCount++;
      whereClause += ` AND e.department_id = $${paramCount}`;
      params.push(department_id);
    }

    const result = await query(`
      SELECT 
        e.*,
        u.first_name, u.last_name, u.email,
        d.name as department_name,
        COUNT(b.id) as bookings_created,
        COALESCE(SUM(b.total_amount), 0) as revenue_generated
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN bookings b ON u.id = b.created_by
      ${whereClause}
      GROUP BY e.id, u.first_name, u.last_name, u.email, d.name
      ORDER BY revenue_generated DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Employee performance report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating employee performance report' 
    });
  }
});

// Get dashboard summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    // Total revenue this month
    const monthlyRevenue = await query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE payment_status = 'completed'
      AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Total bookings this month
    const monthlyBookings = await query(`
      SELECT COUNT(*) as total
      FROM bookings
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Average occupancy rate
    const avgOccupancy = await query(`
      SELECT ROUND(
        (COUNT(CASE WHEN status IN ('confirmed', 'checked_in') THEN 1 END) * 100.0 / 
         (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance')
      ), 2) as rate
      FROM bookings
      WHERE check_in_date <= CURRENT_DATE AND check_out_date > CURRENT_DATE
    `);

    // Top performing rooms
    const topRooms = await query(`
      SELECT r.room_number, rt.name as room_type, COUNT(b.id) as bookings
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN bookings b ON r.id = b.room_id
      WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY r.id, r.room_number, rt.name
      ORDER BY bookings DESC
      LIMIT 5
    `);

    // Recent activities
    const recentActivities = await query(`
      SELECT 'booking' as type, b.booking_number, g.first_name, g.last_name, b.created_at
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      WHERE b.created_at >= CURRENT_DATE - INTERVAL '7 days'
      UNION ALL
      SELECT 'payment' as type, p.transaction_id, g.first_name, g.last_name, p.payment_date
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN guests g ON b.guest_id = g.id
      WHERE p.payment_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        monthlyRevenue: parseFloat(monthlyRevenue.rows[0].total),
        monthlyBookings: parseInt(monthlyBookings.rows[0].total),
        avgOccupancy: parseFloat(avgOccupancy.rows[0].rate || 0),
        topRooms: topRooms.rows,
        recentActivities: recentActivities.rows
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating dashboard summary' 
    });
  }
});

module.exports = router; 