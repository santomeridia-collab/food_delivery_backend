'use strict';

const { verifyToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists
    if (!authHeader) {
      logger.debug('🔴 No authorization header provided');
      return res.status(401).json({
        success: false,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required. Please provide a valid token.'
      });
    }

    // Check if header has Bearer prefix
    if (!authHeader.startsWith('Bearer ')) {
      logger.debug('🔴 Invalid authorization header format');
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Invalid token format. Use: Bearer <token>'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      logger.debug('🔴 Token missing after Bearer prefix');
      return res.status(401).json({
        success: false,
        code: 'TOKEN_MISSING',
        message: 'Token is missing.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (verifyError) {
      logger.debug('🔴 Token verification failed:', verifyError.message);
      
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid token. Please login again.'
      });
    }

    // Validate decoded token has required fields
    if (!decoded || !decoded.id) {
      logger.debug('🔴 Token missing user ID');
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN_PAYLOAD',
        message: 'Invalid token payload.'
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      phone: decoded.phone || null,
      email: decoded.email || null,
      role: decoded.role || 'user',
      is_verified: decoded.is_verified || false,
      tokenId: decoded.tokenId || decoded.jti || null,
    };

    logger.debug(`✅ User authenticated: ${req.user.id} (${req.user.role})`);
    next();
    
  } catch (error) {
    logger.error('🔴 Authentication error:', error);
    return res.status(500).json({
      success: false,
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed. Please try again.'
    });
  }
};

module.exports = authenticate;