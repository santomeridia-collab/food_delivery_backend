const Joi = require("joi");

const assignDeliverySchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  riderName: Joi.string().min(2).max(100).required(),
  riderPhone: Joi.string().min(10).max(15).required()
});

const updateLocationSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  currentLat: Joi.number().required(),
  currentLng: Joi.number().required()
});

const updateDeliveryStatusSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  status: Joi.string()
    .valid("OUT_FOR_DELIVERY", "DELIVERED")
    .required()
});

module.exports = {
  assignDeliverySchema,
  updateLocationSchema,
  updateDeliveryStatusSchema
};