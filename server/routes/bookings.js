const express = require('express');
const router = express.Router();
const db = require('../database/config');

// Create a new booking
router.post('/', async (req, res) => {
  try {
    const { room_id, guest_id, check_in, check_out } = req.body;
    // Insert booking
    const [result] = await db.query(
      'INSERT INTO bookings (room_id, guest_id, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)',
      [room_id, guest_id, check_in, check_out, 'booked']
    );
    // Update room status
    await db.query('UPDATE rooms SET status = ? WHERE id = ?', ['booked', room_id]);
    res.status(201).json({ booking_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.*, r.type AS room_type, g.name AS guest_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN guests g ON b.guest_id = g.id`
    );
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check out booking (update status)
router.put('/:id/checkout', async (req, res) => {
  try {
    const bookingId = req.params.id;
    // Get room_id for this booking
    const [[booking]] = await db.query('SELECT room_id FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Update booking status to checked out
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', ['checked_out', bookingId]);
    // Update room status to available
    await db.query('UPDATE rooms SET status = ? WHERE id = ?', ['available', booking.room_id]);
    // If dates are being changed, check availability
    if (check_in_date || check_out_date) {
      const newCheckIn = check_in_date || booking.check_in_date;
      const newCheckOut = check_out_date || booking.check_out_date;

      const [roomAvailability] = await db.query(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE room_id = ?
        AND id != ?
        AND status IN ('confirmed', 'checked_in')
        AND (
          (check_in_date <= ? AND check_out_date > ?) OR
          (check_in_date < ? AND check_out_date >= ?) OR
          (check_in_date >= ? AND check_out_date <= ?)
        )
      `, [booking.room_id, id, newCheckIn, newCheckIn, newCheckOut, newCheckOut, newCheckIn, newCheckOut]);

      if (parseInt(roomAvailability[0].count) > 0) {
        return res.status(409).json({
          success: false,
          message: 'Room is not available for the selected dates'
        });
      }

      // Recalculate total amount if dates changed
      const checkIn = new Date(newCheckIn);
      const checkOut = new Date(newCheckOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      // Get room base price
      const [roomDetails] = await db.query(`
        SELECT rt.base_price
        FROM rooms r
        LEFT JOIN room_types rt ON r.room_type_id = rt.id
        WHERE r.id = ?
      `, [booking.room_id]);

      const basePrice = roomDetails[0].base_price;
      const totalAmount = nights * basePrice;

      await db.query(
        `UPDATE bookings SET 
         check_in_date = COALESCE(?, check_in_date),
         check_out_date = COALESCE(?, check_out_date),
         adults = COALESCE(?, adults),
         children = COALESCE(?, children),
         status = COALESCE(?, status),
         special_requests = COALESCE(?, special_requests),
         total_amount = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [check_in_date, check_out_date, adults, children, status, special_requests, totalAmount, id]
      );

      res.json({
        success: true,
        message: 'Booking updated successfully'
      });
    } else {
      await db.query(
        `UPDATE bookings SET 
         adults = COALESCE(?, adults),
         children = COALESCE(?, children),
         status = COALESCE(?, status),
         special_requests = COALESCE(?, special_requests),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [adults, children, status, special_requests, id]
      );

      res.json({
        success: true,
        message: 'Booking updated successfully'
      });
    }
  } catch (error) {
    console.error('Booking update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking'
    });
  }
});

// Get booking details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(`
      SELECT b.*, g.first_name, g.last_name, g.email, g.phone, g.address,
             r.room_number, r.floor, rt.name as room_type, rt.base_price, rt.amenities,
             u.first_name as created_by_name, u.last_name as created_by_last_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking details'
    });
  }
});

// Get booking dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Total bookings today
    const [todayBookings] = await db.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE DATE(created_at) = CURDATE()
    `);

    // Total bookings this month
    const [monthBookings] = await db.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
    `);

    // Revenue this month
    const [monthRevenue] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM bookings
      WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
      AND status IN ('confirmed', 'checked_in', 'checked_out')
    `);

    // Occupancy rate
    const [occupancyRate] = await db.query(`
      SELECT 
        ROUND(
          (COUNT(CASE WHEN status IN ('confirmed', 'checked_in') THEN 1 END) * 100.0 / 
           (SELECT COUNT(*) FROM rooms WHERE status != 'maintenance')
          ), 2
        ) as rate
      FROM bookings
      WHERE check_in_date <= CURDATE() AND check_out_date > CURDATE()
    `);

    // Upcoming check-ins (next 7 days)
    const [upcomingCheckins] = await db.query(`
      SELECT b.*, g.first_name, g.last_name, r.room_number
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.check_in_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND b.status = 'confirmed'
      ORDER BY b.check_in_date
      LIMIT 10
    `);

    // Recent bookings
    const [recentBookings] = await db.query(`
      SELECT b.*, g.first_name, g.last_name, r.room_number
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        todayBookings: parseInt(todayBookings[0].count),
        monthBookings: parseInt(monthBookings[0].count),
        monthRevenue: parseFloat(monthRevenue[0].total),
        occupancyRate: parseFloat(occupancyRate[0].rate || 0),
        upcomingCheckins,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Booking dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking dashboard data'
    });
  }
});

// Check out booking (update status)
router.put('/:id/checkout', async (req, res) => {
  try {
    const bookingId = req.params.id;
    // Get room_id for this booking
    const [[booking]] = await db.query('SELECT room_id FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    // Update booking status
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', ['checked_out', bookingId]);
    // Update room status
    await db.query('UPDATE rooms SET status = ? WHERE id = ?', ['available', booking.room_id]);
    res.json({ message: 'Checked out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;