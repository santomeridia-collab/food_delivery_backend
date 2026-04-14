'use strict';

const Joi = require('joi');

const analyticsSchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
});

module.exports = { analyticsSchema };
