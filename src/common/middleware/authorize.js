'use strict';

const logger = require('../utils/logger');

/**
 * Authorization middleware - checks if user has required role(s)
 * @param {...string} allowedRoles - List of allowed roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists (should be set by authenticate middleware)
      if (!req.user) {
        logger.debug('🔴 No user found in request');
        return res.status(401).json({
          success: false,
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.'
        });
      }

      // Check if user has required role
      if (!allowedRoles || allowedRoles.length === 0) {
        // No specific roles required - allow access
        return next();
      }

      const userRole = req.user.role;
      
      if (!userRole) {
        logger.debug('🔴 User has no role assigned');
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Access denied. No role assigned.'
        });
      }

      if (!allowedRoles.includes(userRole)) {
        logger.debug(`🔴 User role "${userRole}" not in allowed roles: ${allowedRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      logger.debug(`✅ User authorized: ${req.user.id} (${userRole})`);
      next();
      
    } catch (error) {
      logger.error('🔴 Authorization error:', error);
      return res.status(500).json({
        success: false,
        code: 'AUTHORIZATION_ERROR',
        message: 'Authorization failed. Please try again.'
      });
    }
  };
};

module.exports = authorize;