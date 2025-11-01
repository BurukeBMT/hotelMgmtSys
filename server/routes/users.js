const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebaseAdmin');
const { verifyToken, checkRole } = require('../middleware/auth');

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    let query = db.collection('users');

    if (req.query.role) {
      query = query.where('role', '==', req.query.role);
    }
    if (req.query.isActive !== undefined) {
      query = query.where('isActive', '==', req.query.isActive === 'true');
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
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
 * POST /api/users
 * Create a new user (admin only)
 */
router.post('/', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { email, password, username, firstName, lastName, phone, address, role = 'client' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim(),
    });

    // Create user document in Firestore
    const userData = {
      username: username || email.split('@')[0],
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      address: address || '',
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: userRecord.uid,
        ...userData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put('/:id', verifyToken, checkRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    // Update Firestore document
    await db.collection('users').doc(req.params.id).update(updateData);

    // Update Firebase Auth if email is being changed
    if (req.body.email) {
      await auth.updateUser(req.params.id, {
        email: req.body.email,
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/:id', verifyToken, checkRole('super_admin'), async (req, res, next) => {
  try {
    // Delete from Firestore
    await db.collection('users').doc(req.params.id).delete();

    // Delete from Firebase Auth
    await auth.deleteUser(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

