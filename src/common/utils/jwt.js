'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key_for_testing';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

/**
 * Sign an access token
 */
const signAccessToken = (payload) => {
  try {
    const token = jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    logger.debug(`✅ Access token generated for user: ${payload.id}`);
    return token;
  } catch (error) {
    logger.error('🔴 Error signing access token:', error);
    throw error;
  }
};

/**
 * Sign a refresh token
 */
const signRefreshToken = (payload) => {
  try {
    const token = jwt.sign(
      payload,
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    logger.debug(`✅ Refresh token generated for user: ${payload.id}`);
    return token;
  } catch (error) {
    logger.error('🔴 Error signing refresh token:', error);
    throw error;
  }
};

/**
 * Verify a JWT token
 */
const verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    logger.debug(`✅ Token verified for user: ${decoded.id}`);
    return decoded;
  } catch (error) {
    logger.debug('🔴 Token verification failed:', error.message);
    throw error;
  }
};

/**
 * Decode token without verification
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.debug('🔴 Token decode failed:', error.message);
    return null;
  }
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    return true;
  }
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  JWT_SECRET,
  JWT_REFRESH_SECRET
};