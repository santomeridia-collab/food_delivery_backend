'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');

const OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY';
const DELIVERED = 'DELIVERED';
const CONFIRMED = 'CONFIRMED';

// Flat delivery fee per completed order
const DELIVERY_FEE = 5.00;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function startOfWeek() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); return d;
}
function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Full dashboard summary for a delivery agent.
 * Returns: total deliveries, earnings (total/week/month/today),
 * online hours (total/week/month), active order, and recent history.
 */
async function getDashboard(agentId) {
  const now = new Date();

  // All completed trackings for this agent
  const allCompleted = await prisma.deliveryTracking.findMany({
    where: { agentId, order: { status: DELIVERED } },
    include: { order: { select: { totalAmount: true, createdAt: true } } },
  });

  // Earnings aggregation
  const earningsTotal = allCompleted.reduce((s, t) => s + (t.earnings || 0), 0);
  const earningsThisWeek = allCompleted
    .filter(t => t.completedAt && t.completedAt >= startOfWeek())
    .reduce((s, t) => s + (t.earnings || 0), 0);
  const earningsThisMonth = allCompleted
    .filter(t => t.completedAt && t.completedAt >= startOfMonth())
    .reduce((s, t) => s + (t.earnings || 0), 0);
  const earningsToday = allCompleted
    .filter(t => t.completedAt && t.completedAt >= startOfToday())
    .reduce((s, t) => s + (t.earnings || 0), 0);

  // Delivery counts
  const totalDeliveries = allCompleted.length;
  const deliveriesToday = allCompleted.filter(t => t.completedAt && t.completedAt >= startOfToday()).length;
  const deliveriesThisWeek = allCompleted.filter(t => t.completedAt && t.completedAt >= startOfWeek()).length;
  const deliveriesThisMonth = allCompleted.filter(t => t.completedAt && t.completedAt >= startOfMonth()).length;

  // Online hours from AgentSession
  const sessions = await prisma.agentSession.findMany({ where: { agentId } });
  const totalOnlineMinutes = sessions.reduce((s, sess) => s + (sess.durationMinutes || 0), 0);
  const weekSessions = sessions.filter(s => s.goOnlineAt >= startOfWeek());
  const monthSessions = sessions.filter(s => s.goOnlineAt >= startOfMonth());
  const weekOnlineMinutes = weekSessions.reduce((s, sess) => s + (sess.durationMinutes || 0), 0);
  const monthOnlineMinutes = monthSessions.reduce((s, sess) => s + (sess.durationMinutes || 0), 0);

  // Check if currently online (open session)
  const openSession = await prisma.agentSession.findFirst({
    where: { agentId, goOfflineAt: null },
  });

  // Active delivery
  const activeTracking = await prisma.deliveryTracking.findFirst({
    where: { agentId, order: { status: OUT_FOR_DELIVERY } },
    include: {
      order: {
        include: {
          restaurant: { select: { id: true, name: true, address: true } },
          items: { include: { menuItem: { select: { name: true, price: true } } } },
        },
      },
    },
  });

  return {
    isOnline: !!openSession,
    totalDeliveries,
    deliveries: { today: deliveriesToday, thisWeek: deliveriesThisWeek, thisMonth: deliveriesThisMonth },
    earnings: {
      total: +earningsTotal.toFixed(2),
      today: +earningsToday.toFixed(2),
      thisWeek: +earningsThisWeek.toFixed(2),
      thisMonth: +earningsThisMonth.toFixed(2),
      avgPerDelivery: totalDeliveries > 0 ? +(earningsTotal / totalDeliveries).toFixed(2) : 0,
    },
    onlineHours: {
      totalMinutes: totalOnlineMinutes,
      totalHours: +(totalOnlineMinutes / 60).toFixed(2),
      thisWeekMinutes: weekOnlineMinutes,
      thisMonthMinutes: monthOnlineMinutes,
    },
    activeDelivery: activeTracking,
  };
}

// ─── Online / Offline toggle ──────────────────────────────────────────────────

async function goOnline(agentId) {
  const open = await prisma.agentSession.findFirst({ where: { agentId, goOfflineAt: null } });
  if (open) return { message: 'Already online', session: open };
  const session = await prisma.agentSession.create({ data: { agentId } });
  return { message: 'You are now online', session };
}

async function goOffline(agentId) {
  const open = await prisma.agentSession.findFirst({ where: { agentId, goOfflineAt: null } });
  if (!open) return { message: 'Already offline' };

  const now = new Date();
  const durationMinutes = Math.round((now - open.goOnlineAt) / 60000);
  const session = await prisma.agentSession.update({
    where: { id: open.id },
    data: { goOfflineAt: now, durationMinutes },
  });
  return { message: 'You are now offline', session };
}

// ─── Available / Active / History ────────────────────────────────────────────

async function getAvailableOrders({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { status: CONFIRMED, tracking: null },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true, address: true } },
        user: { select: { name: true } },
        items: true,
      },
    }),
    prisma.order.count({ where: { status: CONFIRMED, tracking: null } }),
  ]);

  const enriched = orders.map((o) => ({
    ...o,
    customerName: o.user?.name || 'Customer',
    itemCount: o.items.length,
    deliveryFee: DELIVERY_FEE,
  }));

  return { orders: enriched, total, page, limit };
}

async function getActiveDelivery(agentId) {
  const tracking = await prisma.deliveryTracking.findFirst({
    where: { agentId, order: { status: OUT_FOR_DELIVERY } },
    include: {
      order: {
        include: {
          restaurant: { select: { id: true, name: true, address: true } },
          user: { select: { name: true } },
          items: { include: { menuItem: { select: { name: true, price: true } } } },
        },
      },
    },
  });
  if (!tracking) return null;

  return {
    ...tracking,
    customerName: tracking.order.user?.name || 'Customer',
    customerAddress: tracking.order.deliveryAddress,
    restaurantAddress: tracking.order.restaurant?.address,
  };
}

async function getDeliveryHistory(agentId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [trackings, total] = await Promise.all([
    prisma.deliveryTracking.findMany({
      where: { agentId, order: { status: DELIVERED } },
      skip, take: limit,
      orderBy: { completedAt: 'desc' },
      include: { order: { include: { restaurant: { select: { id: true, name: true } } } } },
    }),
    prisma.deliveryTracking.count({ where: { agentId, order: { status: DELIVERED } } }),
  ]);
  return { deliveries: trackings, total, page, limit };
}

// ─── Accept / Location / Complete ────────────────────────────────────────────

async function acceptOrder(orderId, agentId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tracking: true },
  });

  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (order.status !== CONFIRMED) throw new AppError(400, 'INVALID_STATUS', `Order cannot be accepted in status: ${order.status}`);
  if (order.tracking) throw new AppError(409, 'CONFLICT', 'Order has already been assigned to a delivery agent');

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: OUT_FOR_DELIVERY } }),
    prisma.deliveryTracking.create({ data: { orderId, agentId, riderName: agentId } }),
  ]);

  return updatedOrder;
}

async function updateLocation(orderId, agentId, lat, lng, io) {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId },
    include: { order: true },
  });

  if (!tracking) throw new AppError(404, 'NOT_FOUND', 'Delivery tracking record not found for this order');
  if (tracking.agentId !== agentId && tracking.riderName !== String(agentId)) {
    throw new AppError(403, 'FORBIDDEN', 'You are not the assigned agent for this order');
  }

  const updated = await prisma.deliveryTracking.update({
    where: { orderId },
    data: { currentLat: lat, currentLng: lng },
  });

  if (io) {
    io.to(`order:${orderId}`).emit('delivery_location', { order_id: orderId, lat, lng });
  }

  return updated;
}

async function completeOrder(orderId, agentId, io) {
  const tracking = await prisma.deliveryTracking.findUnique({
    where: { orderId },
    include: { order: true },
  });

  if (!tracking) throw new AppError(404, 'NOT_FOUND', 'Delivery tracking record not found for this order');
  if (tracking.agentId !== agentId && tracking.riderName !== String(agentId)) {
    throw new AppError(403, 'FORBIDDEN', 'You are not the assigned agent for this order');
  }
  if (tracking.order.status !== OUT_FOR_DELIVERY) {
    throw new AppError(400, 'INVALID_STATUS', `Order cannot be completed in status: ${tracking.order.status}`);
  }

  const now = new Date();
  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: DELIVERED } }),
    prisma.deliveryTracking.update({
      where: { orderId },
      data: { earnings: DELIVERY_FEE, completedAt: now },
    }),
  ]);

  if (io) {
    io.to(`user:${tracking.order.userId}`).emit('order_status_update', {
      order_id: orderId,
      status: DELIVERED,
    });
  }

  return updatedOrder;
}

module.exports = {
  getDashboard,
  goOnline,
  goOffline,
  getAvailableOrders,
  getActiveDelivery,
  getDeliveryHistory,
  acceptOrder,
  updateLocation,
  completeOrder,
};
