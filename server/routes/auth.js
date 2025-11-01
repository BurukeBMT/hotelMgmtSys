const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebaseAdmin');
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login with email and password (handled by Firebase Auth on client)
 * This endpoint is for server-side verification if needed
 */
router.post('/login', async (req, res, next) => {
  try {
    // Note: Firebase Auth login is typically handled client-side
    // This endpoint can be used for server-side token verification
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required',
      });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      data: {
        user: {
          id: decodedToken.uid,
          email: decodedToken.email,
          ...userData,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
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
      message: 'User registered successfully',
      data: {
        user: {
          id: userRecord.uid,
          ...userData,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', verifyToken, async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      data: {
        id: userDoc.id,
        ...userData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', verifyToken, async (req, res, next) => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    await db.collection('users').doc(req.userId).update(updateData);

    // Update Firebase Auth display name
    if (firstName || lastName) {
      await auth.updateUser(req.userId, {
        displayName: `${firstName || ''} ${lastName || ''}`.trim(),
      });
    }

    const updatedDoc = await db.collection('users').doc(req.userId).get();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change user password (requires re-authentication on client side)
 */
router.post('/change-password', verifyToken, async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    await auth.updateUser(req.userId, {
      password: newPassword,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

