const { v4: uuidv4 } = require("uuid");
const prisma = require("../../config/db");
const AppError = require("../../common/utils/AppError");
const PAYMENT_STATUS = require("../../common/constants/paymentStatus");
const ORDER_STATUS = require("../../common/constants/orderStatus");

const createPayment = async ({ orderId, amount, method, userId }) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  }

  if (order.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only create payment for your own order");
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { orderId }
  });

  if (existingPayment) {
    throw new AppError(400, "PAYMENT_EXISTS", "Payment already exists for this order");
  }

  const payment = await prisma.payment.create({
    data: {
      orderId,
      amount,
      method,
      status: PAYMENT_STATUS.PENDING,
      reference: uuidv4()
    }
  });

  return payment;
};

// mock gateway verification
const mockGatewayVerify = async (success) => {
  return {
    verified: success
  };
};

const verifyPayment = async ({ paymentId, success, userId }) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true
    }
  });

  if (!payment) {
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  }

  if (payment.order.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only verify your own payment");
  }

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new AppError(400, "INVALID_PAYMENT_STATE", "Only pending payments can be verified");
  }

  const gatewayResult = await mockGatewayVerify(success);

  let updatedPayment;
  let updatedOrder;

  if (gatewayResult.verified) {
    updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PAYMENT_STATUS.SUCCESS
      }
    });

    updatedOrder = await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: ORDER_STATUS.CONFIRMED
      }
    });
  } else {
    updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PAYMENT_STATUS.FAILED
      }
    });

    updatedOrder = await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: ORDER_STATUS.CANCELLED
      }
    });
  }

  return {
    payment: updatedPayment,
    order: updatedOrder
  };
};

const refund = async ({ paymentId, userId }) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true
    }
  });

  if (!payment) {
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  }

  if (payment.order.userId !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only refund your own payment");
  }

  if (payment.status !== PAYMENT_STATUS.SUCCESS) {
    throw new AppError(
      400,
      "PAYMENT_NOT_PAID",
      "Refund allowed only when payment status is SUCCESS"
    );
  }

  if (payment.order.status !== ORDER_STATUS.CANCELLED) {
    throw new AppError(
      400,
      "ORDER_NOT_CANCELLED",
      "Refund allowed only when order status is CANCELLED"
    );
  }

  const refundedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PAYMENT_STATUS.REFUNDED
    }
  });

  return refundedPayment;
};

module.exports = {
  createPayment,
  verifyPayment,
  refund
};