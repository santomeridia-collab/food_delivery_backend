'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');

/** List all restaurants with pagination. */
async function listRestaurants({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: { id: true, name: true, description: true, rating: true, is_open: true, approval_status: true },
    }),
    prisma.restaurant.count(),
  ]);
  return { restaurants, total, page, limit };
}

/** Get a single restaurant with its menu grouped by category. 404 if not found. */
async function getRestaurantDetails(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { menu_items: { orderBy: { category: 'asc' } } },
  });
  if (!restaurant) throw new AppError(404, 'NOT_FOUND', 'Restaurant not found');

  // Group menu items by category
  const menu = restaurant.menu_items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return { ...restaurant, menu_items: undefined, menu };
}

/** Add a menu item to a restaurant. 403 if the requester is not the owner. */
async function addMenuItem(restaurantId, ownerId, data) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new AppError(404, 'NOT_FOUND', 'Restaurant not found');
  if (restaurant.owner_id !== ownerId) throw new AppError(403, 'FORBIDDEN', 'You do not own this restaurant');

  return prisma.menuItem.create({
    data: { restaurant_id: restaurantId, ...data },
  });
}

/** Update a menu item. 403 if not owner, 404 if item not found or doesn't belong to restaurant. */
async function updateMenuItem(restaurantId, itemId, ownerId, data) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new AppError(404, 'NOT_FOUND', 'Restaurant not found');
  if (restaurant.owner_id !== ownerId) throw new AppError(403, 'FORBIDDEN', 'You do not own this restaurant');

  const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurant_id: restaurantId } });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Menu item not found');

  return prisma.menuItem.update({ where: { id: itemId }, data });
}

module.exports = { listRestaurants, getRestaurantDetails, addMenuItem, updateMenuItem };
