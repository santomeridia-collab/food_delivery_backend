const deliveryService = require("./service");
const { success } = require("../../common/utils/response");

const assignDelivery = async (req, res, next) => {
  try {
    const result = await deliveryService.assignDelivery(req.body);
    return success(res, "Delivery assigned successfully", result, 201);
  } catch (err) {
    next(err);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const result = await deliveryService.updateLocation(req.body);
    return success(res, "Delivery location updated successfully", result);
  } catch (err) {
    next(err);
  }
};

const getDeliveryByOrderId = async (req, res, next) => {
  try {
    const result = await deliveryService.getDeliveryByOrderId(req.params.orderId);
    return success(res, "Delivery tracking fetched successfully", result);
  } catch (err) {
    next(err);
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const result = await deliveryService.updateDeliveryStatus(req.body);
    return success(res, "Delivery status updated successfully", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  assignDelivery,
  updateLocation,
  getDeliveryByOrderId,
  updateDeliveryStatus
};