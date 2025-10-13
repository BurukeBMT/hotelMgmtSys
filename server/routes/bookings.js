const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/config');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Generate booking number
const generateBookingNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BK${year}${month}${random}`;
};

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, check_in_date, check_out_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }
    if (check_in_date) {
      whereClause += ' AND b.check_in_date >= ?';
      params.push(check_in_date);
    }
    if (check_out_date) {
      whereClause += ' AND b.check_out_date <= ?';
      params.push(check_out_date);
    }

    const [result] = await db.query(`
      SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
             r.room_number, rt.name as room_type, rt.base_price,
             u.first_name as created_by_name, u.last_name as created_by_last_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN users u ON b.created_by = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM bookings b
      ${whereClause}
    `, params);

    const total = parseInt(countResult[0].total);

    res.json({
      success: true,
      data: result,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
});

// Create new booking
router.post('/', [
  body('guest_id').isInt().withMessage('Guest ID is required'),
  body('room_id').isInt().withMessage('Room ID is required'),
  body('check_in_date').isDate().withMessage('Valid check-in date is required'),
  body('check_out_date').isDate().withMessage('Valid check-out date is required'),
  body('adults').isInt({ min: 1 }).withMessage('At least 1 adult is required'),
  body('children').optional().isInt({ min: 0 }).withMessage('Children must be a non-negative number'),
  body('special_requests').optional()
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
      guest_id, room_id, check_in_date, check_out_date,
      adults, children = 0, special_requests
    } = req.body;

    // Check if room is available for the dates
    const [roomAvailability] = await db.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE room_id = ?
      AND status IN ('confirmed', 'checked_in')
      AND (
        (check_in_date <= ? AND check_out_date > ?) OR
        (check_in_date < ? AND check_out_date >= ?) OR
        (check_in_date >= ? AND check_out_date <= ?)
      )
    `, [room_id, check_in_date, check_in_date, check_out_date, check_out_date, check_in_date, check_out_date]);

    if (parseInt(roomAvailability[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
    }

    // Get room details for pricing
    const [roomDetails] = await db.query(`
      SELECT rt.base_price, rt.capacity
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.id = ?
    `, [room_id]);

    if (roomDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const basePrice = roomDetails[0].base_price;
    const capacity = roomDetails[0].capacity;
    const totalGuests = adults + children;

    if (totalGuests > capacity) {
      return res.status(400).json({
        success: false,
        message: `Room capacity is ${capacity} guests, but ${totalGuests} guests were specified`
      });
    }

    // Calculate total amount (nights * base price)
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = nights * basePrice;

    const bookingNumber = generateBookingNumber();

    const [result] = await db.query(
      `INSERT INTO bookings (booking_number, guest_id, room_id, check_in_date, check_out_date,
       adults, children, total_amount, special_requests, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingNumber, guest_id, room_id, check_in_date, check_out_date,
        adults, children, totalAmount, special_requests, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { id: result.insertId, booking_number: bookingNumber }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking'
    });
  }
});

// Update booking
router.put('/:id', [
  body('check_in_date').optional().isDate().withMessage('Valid check-in date is required'),
  body('check_out_date').optional().isDate().withMessage('Valid check-out date is required'),
  body('adults').optional().isInt({ min: 1 }).withMessage('At least 1 adult is required'),
  body('children').optional().isInt({ min: 0 }).withMessage('Children must be a non-negative number'),
  body('status').optional().isIn(['confirmed', 'cancelled', 'checked_in', 'checked_out']).withMessage('Invalid status'),
  body('special_requests').optional()
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
    const { check_in_date, check_out_date, adults, children, status, special_requests } = req.body;

    // Get current booking details
    const [currentBooking] = await db.query(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
    );

    if (currentBooking.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const booking = currentBooking[0];

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

module.exports = router;