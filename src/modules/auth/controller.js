'use strict';

const service = require('./service');
const { success } = require('../../common/utils/response');
const AppError = require('../../common/utils/apperror');
const logger = require('../../common/utils/logger');

/** POST /auth/register */
async function register(req, res, next) {
  try {
    const user = await service.register(req.body);
    return success(res, 'User registered successfully', user, 201);
  } catch (err) { 
    logger.error('🔴 Error in register controller:', err);
    next(err);
  }
}

/** POST /auth/login/password */
async function loginWithPassword(req, res, next) {
  try {
    const tokens = await service.loginWithPassword(req.body);
    return success(res, 'Login successful', tokens);
  } catch (err) { 
    logger.error('🔴 Error in password login:', err);
    next(err);
  }
}

/** POST /auth/refresh */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Refresh token is required');
    }

    const tokens = await service.refresh({ refreshToken });
    return success(res, 'Token refreshed', tokens);
  } catch (err) { 
    logger.error('🔴 Error refreshing token:', err);
    next(err);
  }
}

/** POST /auth/logout */
async function logout(req, res, next) {
  try {
    const { id: userId, tokenId } = req.user || {};
    await service.logout({ userId, tokenId });
    return success(res, 'Logged out successfully', null);
  } catch (err) { 
    logger.error('🔴 Error logging out:', err);
    next(err);
  }
}

module.exports = { 
  register, 
  loginWithPassword, 
  refresh, 
  logout 
};