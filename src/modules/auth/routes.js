'use strict';

const { Router } = require('express');
const controller = require('./controller');
const {
  registerSchema,
  loginPasswordSchema,
  refreshSchema,
  logoutSchema,
} = require('./validation');
const validate = require('../../common/middleware/validate');
const authenticate = require('../../common/middleware/authenticate');
const rateLimiter = require('../../common/middleware/rateLimiter');

const router = Router();

// Registration
router.post('/register', rateLimiter, validate(registerSchema), controller.register);

// Password login
router.post('/login/password', rateLimiter, validate(loginPasswordSchema), controller.loginWithPassword);

// Token management
router.post('/refresh', rateLimiter, validate(refreshSchema), controller.refresh);
router.post('/logout', authenticate, validate(logoutSchema), controller.logout);

module.exports = router;