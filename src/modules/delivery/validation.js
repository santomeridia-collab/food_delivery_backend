'use strict';

const Joi = require('joi');

/**
 * acceptOrder — no body required; orderId comes from route param.
 * Defined as an empty object schema for consistency with the validate middleware.
 */
const acceptOrderSchema = Joi.object({});

/**
 * updateLocation — requires lat and lng coordinates.
 */
const updateLocationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});

/**
 * completeOrder — no body required; orderId comes from route param.
 */
const completeOrderSchema = Joi.object({});

module.exports = { acceptOrderSchema, updateLocationSchema, completeOrderSchema };
