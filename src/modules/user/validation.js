'use strict';

const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name:     Joi.string().trim().min(1).max(100).optional(),
  email:    Joi.string().email().lowercase().trim().optional(),
  phone:    Joi.string().trim().optional(),
  password: Joi.string().min(8).optional(),
}).min(1); // at least one field required

const addAddressSchema = Joi.object({
  address: Joi.string().trim().min(1).required(),
  lat:     Joi.number().required(),
  lng:     Joi.number().required(),
});

module.exports = { updateProfileSchema, addAddressSchema };
