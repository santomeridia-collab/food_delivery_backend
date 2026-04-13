'use strict';

const { Router } = require('express');
const router = Router();

const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");

const deliveryController = require("./controller");
const {
  assignDeliverySchema,
  updateLocationSchema,
  updateDeliveryStatusSchema
} = require("./validation");

router.post(
  "/assign",
  authenticate,
  authorize("ADMIN", "RESTAURANT_OWNER"),
  validate(assignDeliverySchema),
  deliveryController.assignDelivery
);

router.patch(
  "/location",
  authenticate,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  validate(updateLocationSchema),
  deliveryController.updateLocation
);

router.get(
  "/:orderId",
  authenticate,
  deliveryController.getDeliveryByOrderId
);

router.patch(
  "/status",
  authenticate,
  authorize("DELIVERY_PARTNER", "ADMIN"),
  validate(updateDeliveryStatusSchema),
  deliveryController.updateDeliveryStatus
);

module.exports = router;