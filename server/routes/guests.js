const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/guests
 * Get all guests (with optional filters)
 */
router.get('/', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    let query = db.collection('guests');

    // Apply filters
    if (req.query.email) {
      query = query.where('email', '==', req.query.email);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const guests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: guests,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/guests/:id
 * Get guest by ID
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const doc = await db.collection('guests').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found',
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
 * POST /api/guests
 * Create a new guest
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const {
      first_name,
      firstName,
      last_name,
      lastName,
      email,
      phone,
      address,
    } = req.body;

    const guestData = {
      firstName: first_name || firstName,
      lastName: last_name || lastName,
      email,
      phone,
      address: address || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.userId,
    };

    const docRef = await db.collection('guests').add(guestData);

    res.status(201).json({
      success: true,
      message: 'Guest created successfully',
      data: {
        id: docRef.id,
        ...guestData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/guests/:id
 * Update a guest
 */
router.put('/:id', verifyToken, checkRole('admin', 'manager', 'super_admin'), async (req, res, next) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('guests').doc(req.params.id).update(updateData);

    res.json({
      success: true,
      message: 'Guest updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/guests/:id
 * Delete a guest
 */
router.delete('/:id', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    await db.collection('guests').doc(req.params.id).delete();

    res.json({
      success: true,
      message: 'Guest deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

