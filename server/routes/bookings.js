const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/bookings
 * Get all bookings (with optional filters)
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = db.collection('bookings');

    // Apply filters
    if (req.query.guestId) {
      query = query.where('guestId', '==', req.query.guestId);
    }
    if (req.query.roomId) {
      query = query.where('roomId', '==', req.query.roomId);
    }
    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
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
 * GET /api/bookings/dashboard
 * Get booking dashboard statistics
 */
router.get('/dashboard', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [bookingsSnapshot, roomsSnapshot] = await Promise.all([
      db.collection('bookings').get(),
      db.collection('rooms').get(),
    ]);

    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    const rooms = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate today's bookings
    const todayBookings = bookings.filter(b => {
      const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
      return bookingDate && bookingDate >= today;
    });

    // Calculate this month's bookings
    const monthBookings = bookings.filter(b => {
      const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
      return bookingDate && bookingDate >= monthStart;
    });

    // Calculate revenue for the month
    const monthRevenue = monthBookings.reduce(
      (sum, b) => sum + parseFloat(b.total_amount || b.totalAmount || 0),
      0
    );

    // Calculate occupancy rate
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const totalRooms = rooms.length;
    const occupancyRate = totalRooms > 0 ? ((totalRooms - availableRooms) / totalRooms) * 100 : 0;

    // Recent bookings (last 5)
    const recentBookings = bookings
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      })
      .slice(0, 5);

    // Upcoming check-ins (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingCheckins = bookings
      .filter(b => {
        const checkIn = b.check_in_date || b.checkInDate;
        if (!checkIn) return false;
        const checkInDate = new Date(checkIn);
        return checkInDate >= today && checkInDate <= nextWeek;
      })
      .sort((a, b) => {
        const dateA = new Date(a.check_in_date || a.checkInDate);
        const dateB = new Date(b.check_in_date || b.checkInDate);
        return dateA - dateB;
      })
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        todayBookings: todayBookings.length,
        monthBookings: monthBookings.length,
        monthRevenue,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        recentBookings,
        upcomingCheckins,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings/:id
 * Get booking by ID
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const doc = await db.collection('bookings').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const {
      guest_id,
      guestId,
      room_id,
      roomId,
      check_in_date,
      checkInDate,
      check_out_date,
      checkOutDate,
      adults,
      children,
      special_requests,
      specialRequests,
    } = req.body;

    const bookingData = {
      guestId: guest_id || guestId,
      roomId: room_id || roomId,
      checkInDate: check_in_date || checkInDate,
      checkOutDate: check_out_date || checkOutDate,
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      specialRequests: special_requests || specialRequests || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('bookings').add(bookingData);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        id: docRef.id,
        ...bookingData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/bookings/:id
 * Update a booking
 */
router.put('/:id', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('bookings').doc(req.params.id).update(updateData);

    res.json({
      success: true,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete a booking
 */
router.delete('/:id', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    await db.collection('bookings').doc(req.params.id).delete();

    res.json({
      success: true,
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/check-in
 * Check in a guest
 */
router.post('/:id/check-in', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const booking = bookingDoc.data();
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed bookings can be checked in',
      });
    }

    await bookingRef.update({
      status: 'checked_in',
      updatedAt: new Date().toISOString(),
    });

    // Update room status if roomId exists
    if (booking.roomId) {
      await db.collection('rooms').doc(booking.roomId).update({
        status: 'occupied',
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Guest checked in successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/check-out
 * Check out a guest
 */
router.post('/:id/check-out', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const booking = bookingDoc.data();
    if (booking.status !== 'checked_in') {
      return res.status(400).json({
        success: false,
        message: 'Only checked-in bookings can be checked out',
      });
    }

    await bookingRef.update({
      status: 'checked_out',
      updatedAt: new Date().toISOString(),
    });

    // Update room status if roomId exists
    if (booking.roomId) {
      await db.collection('rooms').doc(booking.roomId).update({
        status: 'available',
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Guest checked out successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

