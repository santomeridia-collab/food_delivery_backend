const paymentService = require("./service");
const { success } = require("../../common/utils/response");

const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment({
      ...req.body,
      userId: req.user.id
    });

    return success(res, "Payment created successfully", payment, 201);
  } catch (err) {
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment({
      ...req.body,
      userId: req.user.id
    });

    return success(res, "Payment verified successfully", result);
  } catch (err) {
    next(err);
  }
};

const refund = async (req, res, next) => {
  try {
    const payment = await paymentService.refund({
      paymentId: req.params.id,
      userId: req.user.id
    });

    return success(res, "Refund processed successfully", payment);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPayment,
  verifyPayment,
  refund
};