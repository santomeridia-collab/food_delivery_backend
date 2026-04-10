const Joi = require("joi");

const createPaymentSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  method: Joi.string().valid("COD", "CARD", "UPI", "NETBANKING").required()
});

const verifyPaymentSchema = Joi.object({
  paymentId: Joi.string().uuid().required(),
  success: Joi.boolean().required()
});

const refundSchema = Joi.object({
  reason: Joi.string().min(3).max(255).optional()
});

module.exports = {
  createPaymentSchema,
  verifyPaymentSchema,
  refundSchema
};