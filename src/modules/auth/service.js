'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');
const redis = require('../../config/redis');
const AppError = require('../../common/utils/AppError');
const { signAccessToken, signRefreshToken } = require('../../common/utils/jwt');
const { generateOTP, storeOTP, verifyOTP } = require('../../common/utils/otp');

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Resolve a user by phone or email identifier.
 * @param {string} identifier
 * @returns {Promise<import('@prisma/client').User|null>}
 */
async function findUserByIdentifier(identifier) {
  const isEmail = identifier.includes('@');
  return prisma.user.findFirst({
    where: isEmail ? { email: identifier } : { phone: identifier },
  });
}

/**
 * Register a new user.
 * At least one of email or phone is required.
 */
async function register({ name, email, phone, password, role }) {
  // Check uniqueness
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) throw new AppError(409, 'CONFLICT', 'Email already registered');
  }
  if (phone) {
    const byPhone = await prisma.user.findUnique({ where: { phone } });
    if (byPhone) throw new AppError(409, 'CONFLICT', 'Phone number already registered');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email: email || null, phone: phone || null, password: hashed, role, is_verified: false, status: 'active' },
    select: { id: true, email: true, phone: true, role: true },
  });

  // Send OTP to whichever identifier was provided (prefer email)
  const identifier = email || phone;
  const otp = generateOTP();
  await storeOTP(identifier, otp);
  console.info(`[OTP] ${identifier} → ${otp}`);

  return user;
}

/**
 * Verify OTP after registration and mark user as verified.
 */
async function verifyOtp({ identifier, otp }) {
  const valid = await verifyOTP(identifier, otp);
  if (!valid) throw new AppError(400, 'BAD_REQUEST', 'Invalid or expired OTP');

  const user = await findUserByIdentifier(identifier);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  await prisma.user.update({ where: { id: user.id }, data: { is_verified: true } });
}

/**
 * Issue tokens for a verified, authenticated user.
 */
async function _issueTokens(user) {
  if (!user.is_verified) throw new AppError(403, 'FORBIDDEN', 'Account not verified. Please verify your OTP first.');

  const accessToken = signAccessToken({ id: user.id, phone: user.phone, email: user.email, role: user.role });
  const { tokenId } = signRefreshToken();
  await redis.set(`refresh:${user.id}:${tokenId}`, 'valid', 'EX', REFRESH_TTL_SECONDS);

  return { accessToken, refreshToken: tokenId };
}

/**
 * Password-based login. Identifier can be phone or email.
 */
async function loginWithPassword({ identifier, password, role }) {
  const user = await findUserByIdentifier(identifier);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');
  if (user.role !== role) throw new AppError(403, 'FORBIDDEN', 'Role mismatch');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');

  return _issueTokens(user);
}

/**
 * OTP login step 1 — send OTP to identifier.
 */
async function requestLoginOtp({ identifier, role }) {
  const user = await findUserByIdentifier(identifier);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'No account found with that identifier');
  if (user.role !== role) throw new AppError(403, 'FORBIDDEN', 'Role mismatch');

  const otp = generateOTP();
  await storeOTP(identifier, otp);
  console.info(`[OTP] ${identifier} → ${otp}`);
}

/**
 * OTP login step 2 — verify OTP and issue tokens.
 */
async function verifyLoginOtp({ identifier, otp, role }) {
  const valid = await verifyOTP(identifier, otp);
  if (!valid) throw new AppError(400, 'BAD_REQUEST', 'Invalid or expired OTP');

  const user = await findUserByIdentifier(identifier);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.role !== role) throw new AppError(403, 'FORBIDDEN', 'Role mismatch');

  // Auto-verify on first OTP login if not already verified
  if (!user.is_verified) {
    await prisma.user.update({ where: { id: user.id }, data: { is_verified: true } });
    user.is_verified = true;
  }

  return _issueTokens(user);
}

/**
 * Refresh access token using stored refresh token.
 */
async function refresh({ userId, tokenId }) {
  const stored = await redis.get(`refresh:${userId}:${tokenId}`);
  if (!stored) throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, email: true, role: true },
  });
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User not found');

  const accessToken = signAccessToken({ id: user.id, phone: user.phone, email: user.email, role: user.role });
  return { accessToken };
}

/**
 * Logout — delete refresh token from Redis.
 */
async function logout({ userId, tokenId }) {
  await redis.del(`refresh:${userId}:${tokenId}`);
}

module.exports = { register, verifyOtp, loginWithPassword, requestLoginOtp, verifyLoginOtp, refresh, logout };
