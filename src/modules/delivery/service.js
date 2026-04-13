const prisma = require("../../config/db");
const AppError = require("../../common/utils/AppError");
const ORDER_STATUS = require("../../common/constants/orderStatus");

const assignDelivery = async ({ orderId, riderName, riderPhone }) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  }

  let tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId }
  });

  if (tracking) {
    tracking = await prisma.deliveryTracking.update({
      where: { orderId },
      data: {
        riderName,
        riderPhone
      }
    });
  } else {
    tracking = await prisma.deliveryTracking.create({
      data: {
        orderId,
        riderName,
        riderPhone
      }
    });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: ORDER_STATUS.OUT_FOR_DELIVERY
    }
  });

  return tracking;
};

const updateLocation = async ({ orderId, currentLat, currentLng }) => {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId }
  });

  if (!tracking) {
    throw new AppError(404, "TRACKING_NOT_FOUND", "Delivery tracking not found");
  }

  return prisma.deliveryTracking.update({
    where: { orderId },
    data: {
      currentLat,
      currentLng
    }
  });
};

const getDeliveryByOrderId = async (orderId) => {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId },
    include: {
      order: true
    }
  });

  if (!tracking) {
    throw new AppError(404, "TRACKING_NOT_FOUND", "Delivery tracking not found");
  }

  return tracking;
};

const updateDeliveryStatus = async ({ orderId, status }) => {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId }
  });

  if (!tracking) {
    throw new AppError(404, "TRACKING_NOT_FOUND", "Delivery tracking not found");
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status
    }
  });

  return {
    tracking,
    order: updatedOrder
  };
};

module.exports = {
  assignDelivery,
  updateLocation,
  getDeliveryByOrderId,
  updateDeliveryStatus
};