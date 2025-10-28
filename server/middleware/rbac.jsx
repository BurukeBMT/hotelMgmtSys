const { query } = require('../database/config');

// Role hierarchy: super_admin > admin > manager > staff > user
const ROLE_HIERARCHY = {
  'super_admin': 5,
  'admin': 4,
  'manager': 3,
  'staff': 2,
  'user': 1
};

// Check if user has required role or higher
const hasRole = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Check if user has specific privilege
const hasPrivilege = async (userId, privilege) => {
  try {
    const result = await query(
      'SELECT id FROM admin_privileges WHERE user_id = ? AND privilege = ?',
      [userId, privilege]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking privilege:', error);
    return false;
  }
};

// Middleware to check role
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!hasRole(req.user.role, requiredRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Middleware to check privilege
const requirePrivilege = (privilege) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Super admin has all privileges
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user has the specific privilege
    const hasPriv = await hasPrivilege(req.user.id, privilege);
    if (!hasPriv) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions for this action' 
      });
    }

    next();
  };
};

// Middleware to check if user can manage another user
const canManageUser = (targetUserId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Super admin can manage everyone
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Admin can manage users with lower roles
    if (req.user.role === 'admin') {
      try {
        const result = await query(
          'SELECT role FROM users WHERE id = ?',
          [targetUserId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }

        const targetRole = result.rows[0].role;
        if (hasRole(req.user.role, targetRole) && req.user.role !== targetRole) {
          return next();
        }
      } catch (error) {
        console.error('Error checking user management permissions:', error);
      }
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Cannot manage this user' 
    });
  };
};

module.exports = {
  hasRole,
  hasPrivilege,
  requireRole,
  requirePrivilege,
  canManageUser,
  ROLE_HIERARCHY
};
