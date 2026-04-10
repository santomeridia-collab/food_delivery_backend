const express = require("express");
const router = express.Router();

const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");

const paymentController = require("./controller");
const {
  createPaymentSchema,
  verifyPaymentSchema,
  refundSchema
} = require("./validation");

router.post(
  "/",
  authenticate,
  authorize("CUSTOMER"),
  validate(createPaymentSchema),
  paymentController.createPayment
);

router.post(
  "/verify",
  authenticate,
  authorize("CUSTOMER"),
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

router.post(
  "/:id/refund",
  authenticate,
  authorize("CUSTOMER"),
  validate(refundSchema),
  paymentController.refund
);

module.exports = router;