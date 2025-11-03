const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize Firestore
const db = admin.firestore();

// Register new user with Firebase Auth
router.post('/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('role').isIn(['super_admin', 'admin', 'manager', 'staff', 'client']).withMessage('Invalid role')
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

    const { email, password, first_name, last_name, role, phone, address } = req.body;

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${first_name} ${last_name}`,
    });

    // Store additional user data in Firestore
    const userData = {
      username: email.split('@')[0], // Use email prefix as username
      email,
      firstName: first_name,
      lastName: last_name,
      role: role || 'client',
      phone: phone || null,
      address: address || null,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Generate custom token for immediate login
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userRecord.uid,
          username: userData.username,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role
        },
        customToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

// Login user with Firebase Auth (client-side handles password verification)
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required')
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

    const { email } = req.body;

    // Get user by email from Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      throw error;
    }

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();

    if (!userData.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate custom token for client-side authentication
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: userRecord.uid,
          username: userData.username,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role
        },
        customToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      data: {
        id: req.user.id,
        username: userData.username,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        phone: userData.phone,
        address: userData.address,
        created_at: userData.createdAt?.toDate(),
        updated_at: userData.updatedAt?.toDate()
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('address').optional()
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

    const { first_name, last_name, phone, address } = req.body;

    // Update user data in Firestore
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (first_name !== undefined) updateData.firstName = first_name;
    if (last_name !== undefined) updateData.lastName = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    await db.collection('users').doc(req.user.id).update(updateData);

    // Get updated user data
    const updatedUserDoc = await db.collection('users').doc(req.user.id).get();
    if (!updatedUserDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = updatedUserDoc.data();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: req.user.id,
        username: userData.username,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        phone: userData.phone,
        address: userData.address,
        created_at: userData.createdAt?.toDate(),
        updated_at: userData.updatedAt?.toDate()
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// Change password (Firebase handles password changes)
router.put('/change-password', authenticateToken, [
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { new_password } = req.body;

    // Update password in Firebase Auth
    await admin.auth().updateUser(req.user.id, {
      password: new_password
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

module.exports = router; 