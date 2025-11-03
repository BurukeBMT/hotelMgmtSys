// Authenticate requests using Firebase ID tokens (Bearer <token>)
// This middleware verifies the Firebase ID token using the Admin SDK and
// loads the corresponding user profile from Firestore. It replaces a JWT/SQL
// based implementation so the server works with Firebase Auth + Firestore.
const admin = require('firebase-admin');

if (!admin.apps || admin.apps.length === 0) {
  // Initialize with Application Default Credentials or service account keyed by
  // GOOGLE_APPLICATION_CREDENTIALS in env. If you want to pass a specific
  // service account file, initialize elsewhere and export the admin app.
  try {
    admin.initializeApp();
  } catch (e) {
    // already initialized or no credentials available in this environment
  }
}

const db = admin.firestore();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);

    const uid = decoded.uid;
    if (!uid) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Load user profile from Firestore
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      // No profile yet - allow request to continue but attach minimal info
      req.user = {
        id: uid,
        email: decoded.email || null,
        username: decoded.email ? decoded.email.split('@')[0] : null,
        role: 'client',
        isActive: true,
      };
      return next();
    }

    const user = userSnap.data();
    // Normalize field names that other middlewares expect
    const normalized = {
      id: uid,
      username: user.username || user.email?.split('@')[0] || '',
      email: user.email || '',
      first_name: user.firstName || user.first_name || '',
      last_name: user.lastName || user.last_name || '',
      role: user.role || 'client',
      is_active: user.isActive === undefined ? true : !!user.isActive,
    };

    if (!normalized.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = normalized;
    next();
  } catch (error) {
    // Map Firebase errors to friendly responses
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired' || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

const isAdmin = authorizeRoles('admin');
const isManager = authorizeRoles('admin', 'manager');
const isStaff = authorizeRoles('admin', 'manager', 'staff');

module.exports = {
  authenticateToken,
  authorizeRoles,
  isAdmin,
  isManager,
  isStaff
}; 