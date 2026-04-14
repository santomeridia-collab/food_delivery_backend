'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');

const approveRestaurant = async (restaurantId) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: Number(restaurantId) },
  });

  if (!restaurant) {
    throw new AppError(404, 'NOT_FOUND', 'Restaurant not found');
  }

  return prisma.restaurant.update({
    where: { id: Number(restaurantId) },
    data: { approval_status: 'approved' },
  });
};

const approveDeliveryAgent = async (agentId) => {
  const agent = await prisma.user.findUnique({
    where: { id: Number(agentId) },
  });

  if (!agent) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  if (agent.role !== 'delivery') {
    throw new AppError(400, 'BAD_REQUEST', 'User is not a delivery agent');
  }

  return prisma.user.update({
    where: { id: Number(agentId) },
    data: { status: 'active' },
  });
};

const getAnalytics = async ({ startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const [totalOrders, revenueResult, activeRestaurants, activeAgents] = await Promise.all([
    // Total orders created within range
    prisma.order.count({
      where: {
        created_at: { gte: start, lte: end },
      },
    }),

    // Total revenue: sum of totals where payment_status = 'paid'
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        created_at: { gte: start, lte: end },
        payment_status: 'paid',
      },
    }),

    // Active restaurants: approved AND open
    prisma.restaurant.count({
      where: {
        approval_status: 'approved',
        is_open: true,
      },
    }),

    // Active delivery agents: role = 'delivery' AND status = 'active'
    prisma.user.count({
      where: {
        role: 'delivery',
        status: 'active',
      },
    }),
  ]);

  return {
    totalOrders,
    totalRevenue: revenueResult._sum.total ?? 0,
    activeRestaurants,
    activeDeliveryAgents: activeAgents,
  };
};

module.exports = { approveRestaurant, approveDeliveryAgent, getAnalytics };
