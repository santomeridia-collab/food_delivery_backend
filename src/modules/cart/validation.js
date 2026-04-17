'use strict';

const Joi = require('joi');

const addItemSchema = Joi.object({
  menuItemId: Joi.string().min(1).required(),
  quantity: Joi.number().integer().min(1).required(),
});

const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

const checkoutSchema = Joi.object({
  address_id: Joi.string().min(1).required(),
});

module.exports = { addItemSchema, updateItemSchema, checkoutSchema };
