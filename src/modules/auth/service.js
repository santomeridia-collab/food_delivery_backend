'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const prisma = require('../../config/db');
const redis = require('../../config/redis');
const AppError = require('../../common/utils/apperror');
const { 
  signAccessToken, 
  signRefreshToken, 
  verifyToken 
} = require('../../common/utils/jwt');
const logger = require('../../common/utils/logger');

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Resolve a user by phone or email identifier.
 */
async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  
  const isEmail = identifier.includes('@');
  return prisma.user.findFirst({
    where: isEmail ? { email: identifier } : { phone: identifier },
  });
}

/**
 * Register a new user.
 */
async function register({ name, email, phone, password, role = 'user' }) {
  // Validate input
  if (!name) throw new AppError(400, 'VALIDATION_ERROR', 'Name is required');
  if (!password) throw new AppError(400, 'VALIDATION_ERROR', 'Password is required');
  if (!phone && !email) throw new AppError(400, 'VALIDATION_ERROR', 'Phone or email is required');

  // Check for existing user
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) throw new AppError(409, 'CONFLICT', 'Email already registered');
  }
  
  if (phone) {
    const byPhone = await prisma.user.findUnique({ where: { phone } });
    if (byPhone) throw new AppError(409, 'CONFLICT', 'Phone number already registered');
  }

  // Hash password
  const hashed = await bcrypt.hash(password, 10);
  
  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      password: hashed,
      role,
      is_verified: true, // Auto-verified
      status: 'active',
      ...(email && { email }),
      ...(phone && { phone }),
    },
    select: { 
      id: true, 
      email: true, 
      phone: true, 
      role: true,
      is_verified: true,
      name: true,
      status: true
    },
  });

  logger.info(`✅ User registered: ${user.id} (${user.role})`);
  return user;
}

/**
 * Issue tokens for a verified, authenticated user.
 */
async function _issueTokens(user) {
  const tokenId = randomUUID();
  
  // Create token payload
  const payload = {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
    is_verified: user.is_verified,
    tokenId,
  };
  
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({
    id: user.id,
    tokenId,
  });

  // Store refresh token in Redis
  await redis.set(
    `refresh:${user.id}:${tokenId}`, 
    'valid', 
    'EX', 
    REFRESH_TTL_SECONDS
  );

  logger.info(`✅ Tokens issued for user: ${user.id}`);

  return {
    accessToken,
    refreshToken,
    userId: user.id,
    role: user.role,
    identifier: user.email || user.phone
  };
}

/**
 * Password-based login.
 */
async function loginWithPassword({ identifier, password, role }) {
  logger.debug(`🔐 Login attempt for: ${identifier}`);
  
  if (!identifier) throw new AppError(400, 'VALIDATION_ERROR', 'Identifier is required');
  if (!password) throw new AppError(400, 'VALIDATION_ERROR', 'Password is required');

  const user = await findUserByIdentifier(identifier);
  if (!user) {
    logger.debug(`🔴 User not found: ${identifier}`);
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  // Check role
  if (role && user.role !== role) {
    logger.debug(`🔴 Role mismatch: expected ${role}, got ${user.role}`);
    throw new AppError(403, 'FORBIDDEN', `Role mismatch. Expected role: ${role}`);
  }

  // Verify password
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    logger.debug(`🔴 Invalid password for user: ${user.id}`);
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');
  }

  // Check if user is active
  if (user.status !== 'active') {
    throw new AppError(403, 'FORBIDDEN', 'Account is not active. Please contact support.');
  }

  logger.info(`✅ Login successful for user: ${user.id}`);
  return _issueTokens(user);
}

/**
 * Refresh access token using stored refresh token.
 */
async function refresh({ refreshToken }) {
  logger.debug('🔄 Refresh token attempt');
  
  if (!refreshToken) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken, true);
  } catch (error) {
    logger.debug('🔴 Invalid refresh token:', error.message);
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const { id: userId, tokenId } = decoded;
  
  // Check if refresh token exists in Redis
  const stored = await redis.get(`refresh:${userId}:${tokenId}`);
  if (!stored) {
    logger.debug(`🔴 Refresh token not found in Redis for user: ${userId}`);
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      phone: true, 
      email: true, 
      role: true, 
      is_verified: true,
      status: true
    },
  });

  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not found');
  }

  if (user.status !== 'active') {
    throw new AppError(403, 'FORBIDDEN', 'Account is not active');
  }

  // Generate new tokens
  const newTokenId = randomUUID();
  const payload = {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
    is_verified: user.is_verified,
    tokenId: newTokenId,
  };

  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken({
    id: userId,
    tokenId: newTokenId,
  });

  // Rotate: delete old, store new
  await redis.del(`refresh:${userId}:${tokenId}`);
  await redis.set(
    `refresh:${userId}:${newTokenId}`, 
    'valid', 
    'EX', 
    REFRESH_TTL_SECONDS
  );

  logger.info(`✅ Token refreshed for user: ${user.id}`);

  return { 
    accessToken, 
    refreshToken: newRefreshToken 
  };
}

/**
 * Logout — delete refresh token from Redis.
 */
async function logout({ userId, tokenId }) {
  if (!userId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'User ID is required');
  }

  if (tokenId) {
    await redis.del(`refresh:${userId}:${tokenId}`);
    logger.info(`✅ User logged out: ${userId}`);
  } else {
    // Delete all refresh tokens for user
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info(`✅ All sessions cleared for user: ${userId}`);
    }
  }

  return { message: 'Logged out successfully' };
}

// Export all functions
module.exports = {
  register,
  loginWithPassword,
  refresh,
  logout,
  _issueTokens, // Exported for testing
};