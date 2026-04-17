'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');
const ORDER_STATUS = require('../../common/constants/orderStatus');

const VALID_TRANSITIONS = {
  [ORDER_STATUS.PENDING]:          [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]:        [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]:        [ORDER_STATUS.OUT_FOR_DELIVERY],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]:        [],
  [ORDER_STATUS.CANCELLED]:        [],
};

const CANCELLABLE_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];

/**
 * Create a new order.
 */
async function createOrder(customerId, { restaurant_id, address_id, items }) {
  const menuItemIds = items.map((i) => i.menu_item_id);

  // Fetch all requested menu items that belong to the restaurant
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId: restaurant_id },
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new AppError(400, 'INVALID_ITEMS', 'One or more items do not belong to the specified restaurant');
  }

  const priceMap = Object.fromEntries(menuItems.map((m) => [m.id, m.price]));
  const total = items.reduce((sum, item) => sum + priceMap[item.menu_item_id] * item.quantity, 0);

  const order = await prisma.order.create({
    data: {
      userId: customerId,
      restaurantId: restaurant_id,
      status: ORDER_STATUS.PENDING,
      totalAmount: total,
      items: {
        create: items.map((item) => ({
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          price: priceMap[item.menu_item_id],
        })),
      },
    },
    include: { items: true },
  });

  return order;
}

/**
 * Cancel an order. Only allowed from PENDING or CONFIRMED statuses.
 */
async function cancelOrder(orderId, customerId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (order.userId !== customerId) throw new AppError(403, 'FORBIDDEN', 'You do not own this order');

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
 * tab: 'active' returns pending/confirmed/preparing/out_for_delivery
 * tab: 'past' returns delivered/cancelled
 */
async function getOrders(customerId, { page = 1, limit = 20, tab } = {}) {
  const skip = (page - 1) * limit;

  const ACTIVE_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.OUT_FOR_DELIVERY];
  const PAST_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];

  const where = { userId: customerId };
  if (tab === 'active') where.status = { in: ACTIVE_STATUSES };
  else if (tab === 'past') where.status = { in: PAST_STATUSES };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
        restaurant: { select: { id: true, name: true, imageUrl: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page, limit };
}

/**
 * Update order status with state machine validation.
 * Also emits socket events: order_status_update to customer, new_delivery_request to delivery_agents on CONFIRMED.
 */
async function updateOrderStatus(orderId, newStatus, io) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(400, 'INVALID_TRANSITION', `Cannot transition from ${order.status} to ${newStatus}`);
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  if (io) {
    io.to(`user:${order.userId}`).emit('order_status_update', {
      order_id: orderId,
      status: newStatus,
    });

    // Broadcast to all delivery agents when order is confirmed and ready for pickup
    if (newStatus === ORDER_STATUS.CONFIRMED) {
      io.to('delivery_agents').emit('new_delivery_request', {
        order_id: orderId,
        status: newStatus,
      });
    }
  }

  return updated;
}

module.exports = { createOrder, cancelOrder, getOrders, updateOrderStatus };
