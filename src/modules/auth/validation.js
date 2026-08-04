'use strict';

const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  password: Joi.string().required().min(6),
  role: Joi.string().valid('user', 'delivery', 'admin').default('user')
}).or('email', 'phone');

const loginPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
  role: Joi.string().valid('user', 'delivery', 'admin').optional()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const logoutSchema = Joi.object({});

module.exports = {
  registerSchema,
  loginPasswordSchema,
  refreshSchema,
  logoutSchema
};