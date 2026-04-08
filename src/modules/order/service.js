'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');
const ORDER_STATUS = require('../../common/constants/orderStatus');

/**
 * Valid next statuses for each current status.
 * Defines the allowed state machine transitions.
 */
const VALID_TRANSITIONS = {
  [ORDER_STATUS.PENDING]:          [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]:        [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]:        [ORDER_STATUS.OUT_FOR_DELIVERY],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]:        [],
  [ORDER_STATUS.CANCELLED]:        [],
};

/** Statuses from which a customer can cancel. */
const CANCELLABLE_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];

/**
 * Create a new order.
 * Validates all items belong to the given restaurant, computes total,
 * and creates Order + OrderItems in a transaction.
 */
async function createOrder(customerId, { restaurant_id, address_id, items }) {
  const menuItemIds = items.map((i) => i.menu_item_id);

  // Fetch all requested menu items that belong to the restaurant
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurant_id },
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new AppError(400, 'INVALID_ITEMS', 'One or more items do not belong to the specified restaurant');
  }

  // Build a price lookup map
  const priceMap = Object.fromEntries(menuItems.map((m) => [m.id, m.price]));

  // Compute total
  const total = items.reduce((sum, item) => sum + priceMap[item.menu_item_id] * item.quantity, 0);

  const order = await prisma.order.create({
    data: {
      customer_id: customerId,
      restaurant_id,
      address_id,
      total,
      status: ORDER_STATUS.PENDING,
      payment_status: 'pending',
      items: {
        create: items.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: priceMap[item.menu_item_id],
        })),
      },
    },
    include: { items: true },
  });

  return order;
}

/**
 * Cancel an order. Only allowed from PENDING or CONFIRMED statuses.
 * Ownership is enforced — only the customer who placed the order can cancel.
 */
async function cancelOrder(orderId, customerId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (order.customer_id !== customerId) throw new AppError(403, 'FORBIDDEN', 'You do not own this order');

  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    throw new AppError(400, 'INVALID_STATUS', `Order cannot be cancelled in status: ${order.status}`);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUS.CANCELLED },
  });
}

/**
 * Get paginated orders scoped to the requesting customer.
 */
async function getOrders(customerId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customer_id: customerId },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: { items: true },
    }),
    prisma.order.count({ where: { customer_id: customerId } }),
  ]);
  return { orders, total, page, limit };
}

/**
 * Update order status with state machine validation.
 * Emits an order_status_update socket event to the customer's room.
 *
 * @param {number} orderId
 * @param {string} newStatus
 * @param {import('socket.io').Server} io
 */
async function updateOrderStatus(orderId, newStatus, io) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      400,
      'INVALID_TRANSITION',
      `Cannot transition from ${order.status} to ${newStatus}`
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  // Emit real-time event to the customer's room
  if (io) {
    io.to(`user:${order.customer_id}`).emit('order_status_update', {
      order_id: orderId,
      status: newStatus,
    });
  }

  return updated;
}

module.exports = { createOrder, cancelOrder, getOrders, updateOrderStatus };
