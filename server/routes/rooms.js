const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/rooms
 * Get all rooms (with optional filters)
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = db.collection('rooms');

    // Apply filters
    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }
    if (req.query.roomType) {
      query = query.where('roomType', '==', req.query.roomType);
    }

    const snapshot = await query.get();
    const rooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rooms/:id
 * Get room by ID
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const doc = await db.collection('rooms').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
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
 * POST /api/rooms
 * Create a new room
 */
router.post('/', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const roomData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('rooms').add(roomData);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        id: docRef.id,
        ...roomData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/rooms/:id
 * Update a room
 */
router.put('/:id', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('rooms').doc(req.params.id).update(updateData);

    res.json({
      success: true,
      message: 'Room updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/rooms/:id
 * Delete a room
 */
router.delete('/:id', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    await db.collection('rooms').doc(req.params.id).delete();

    res.json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

