'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');

const OUT_FOR_DELIVERY = 'out_for_delivery';
const DELIVERED = 'delivered';
const CONFIRMED = 'confirmed';

/**
 * Accept an order as a delivery agent.
 * - Verifies the order exists and is confirmed.
 * - Returns 409 if already assigned (tracking record exists).
 * - Creates a DeliveryTracking record and sets order status to out_for_delivery.
 *
 * @param {string} orderId
 * @param {string} agentId  - the authenticated delivery agent's user id
 * @returns {Promise<object>} updated order
 */
async function acceptOrder(orderId, agentId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tracking: true },
  });

  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'Order not found');
  }

  if (order.status !== CONFIRMED) {
    throw new AppError(400, 'INVALID_STATUS', `Order cannot be accepted in status: ${order.status}`);
  }

  // 409 if already assigned to any agent
  if (order.tracking) {
    throw new AppError(409, 'CONFLICT', 'Order has already been assigned to a delivery agent');
  }

  // Create DeliveryTracking and update order status atomically
  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: OUT_FOR_DELIVERY },
    }),
    prisma.deliveryTracking.create({
      data: {
        orderId,
        riderName: agentId, // store agent id as riderName since schema has no agent_id FK
      },
    }),
  ]);

  return updatedOrder;
}

/**
 * Update the delivery agent's current location for an active order.
 * Persists lat/lng to DeliveryTracking and emits a delivery_location socket event
 * to the customer's room.
 *
 * @param {string} orderId
 * @param {string} agentId
 * @param {number} lat
 * @param {number} lng
 * @param {import('socket.io').Server} io
 * @returns {Promise<object>} updated DeliveryTracking record
 */
async function updateLocation(orderId, agentId, lat, lng, io) {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId },
    include: { order: true },
  });

  if (!tracking) {
    throw new AppError(404, 'NOT_FOUND', 'Delivery tracking record not found for this order');
  }

  // Verify the requesting agent is the assigned agent (stored in riderName)
  if (tracking.riderName !== String(agentId)) {
    throw new AppError(403, 'FORBIDDEN', 'You are not the assigned agent for this order');
  }

  const updated = await prisma.deliveryTracking.update({
    where: { orderId },
    data: { currentLat: lat, currentLng: lng },
  });

  // Emit real-time location to the customer's room
  if (io) {
    io.to(`user:${tracking.order.userId}`).emit('delivery_location', {
      order_id: orderId,
      lat,
      lng,
    });
  }

  return updated;
}

/**
 * Complete an order — sets status to delivered and emits order_status_update
 * to the customer's room.
 *
 * @param {string} orderId
 * @param {string} agentId
 * @param {import('socket.io').Server} io
 * @returns {Promise<object>} updated order
 */
async function completeOrder(orderId, agentId, io) {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId },
    include: { order: true },
  });

  if (!tracking) {
    throw new AppError(404, 'NOT_FOUND', 'Delivery tracking record not found for this order');
  }

  // Verify the requesting agent is the assigned agent
  if (tracking.riderName !== String(agentId)) {
    throw new AppError(403, 'FORBIDDEN', 'You are not the assigned agent for this order');
  }

  if (tracking.order.status !== OUT_FOR_DELIVERY) {
    throw new AppError(400, 'INVALID_STATUS', `Order cannot be completed in status: ${tracking.order.status}`);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: DELIVERED },
  });

  // Emit real-time status update to the customer's room
  if (io) {
    io.to(`user:${tracking.order.userId}`).emit('order_status_update', {
      order_id: orderId,
      status: DELIVERED,
    });
  }

  return updatedOrder;
}

module.exports = { acceptOrder, updateLocation, completeOrder };
