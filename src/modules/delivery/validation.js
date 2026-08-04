'use strict';

const Joi = require('joi');

const acceptOrderSchema = Joi.object({
  // No body params needed
});

const updateLocationSchema = Joi.object({
  lat: Joi.number().required().min(-90).max(90),
  lng: Joi.number().required().min(-180).max(180)
});

const completeOrderSchema = Joi.object({
  // No body params needed
});

module.exports = {
  acceptOrderSchema,
  updateLocationSchema,
  completeOrderSchema
};