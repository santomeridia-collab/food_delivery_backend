'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');

async function getFavorites(userId) {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      restaurant: {
        select: {
          id: true, name: true, cuisineType: true, imageUrl: true,
          rating: true, deliveryTimeMin: true, deliveryFee: true,
          isOpen: true, offerTag: true,
        },
      },
    },
  });
}

async function addFavorite(userId, restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new AppError(404, 'NOT_FOUND', 'Restaurant not found');

  return prisma.favorite.upsert({
    where: { userId_restaurantId: { userId, restaurantId } },
    update: {},
    create: { userId, restaurantId },
  });
}

async function removeFavorite(userId, restaurantId) {
  const fav = await prisma.favorite.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (!fav) throw new AppError(404, 'NOT_FOUND', 'Favorite not found');
  await prisma.favorite.delete({ where: { userId_restaurantId: { userId, restaurantId } } });
}

module.exports = { getFavorites, addFavorite, removeFavorite };
