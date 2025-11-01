const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
router.get('/dashboard', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const [bookings, rooms, users, payments] = await Promise.all([
      db.collection('bookings').get(),
      db.collection('rooms').get(),
      db.collection('users').get(),
      db.collection('payments').get(),
    ]);

    const totalRevenue = payments.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + parseFloat(data.amount || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        totalBookings: bookings.size,
        totalRooms: rooms.size,
        totalUsers: users.size,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/reports/bookings
 * Get booking reports
 */
router.get('/reports/bookings', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const snapshot = await db.collection('bookings').get();
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/reports/revenue
 * Get revenue reports
 */
router.get('/reports/revenue', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const snapshot = await db.collection('payments').get();
    const payments = snapshot.docs.map(doc => doc.data());

    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    res.json({
      success: true,
      data: {
        total,
        count: payments.length,
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/reports/occupancy
 * Get occupancy reports
 */
router.get('/reports/occupancy', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const [roomsSnapshot, bookingsSnapshot] = await Promise.all([
      db.collection('rooms').get(),
      db.collection('bookings')
        .where('status', 'in', ['confirmed', 'checked_in'])
        .get(),
    ]);

    const totalRooms = roomsSnapshot.size;
    const occupiedRooms = bookingsSnapshot.size;

    res.json({
      success: true,
      data: {
        totalRooms,
        occupiedRooms,
        occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

