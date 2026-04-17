'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');
const ORDER_STATUS = require('../../common/constants/orderStatus');

/**
 * Get or create the cart for a user, including items with menu details.
 */
async function getCart(userId) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
  });

  if (!cart) return { items: [], total: 0, restaurantId: null };

  const total = cart.items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
  return { ...cart, total };
}

/**
 * Add an item to the cart. If the cart already has items from a different
 * restaurant, throw 400. If the item already exists, increment quantity.
 */
async function addItem(userId, { menuItemId, quantity }) {
  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) throw new AppError(404, 'NOT_FOUND', 'Menu item not found');

  let cart = await prisma.cart.findUnique({ where: { userId } });

  if (cart && cart.restaurantId && cart.restaurantId !== menuItem.restaurantId) {
    throw new AppError(400, 'CART_CONFLICT', 'Cart already has items from a different restaurant. Clear cart first.');
  }

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId, restaurantId: menuItem.restaurantId },
    });
  } else if (!cart.restaurantId) {
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: { restaurantId: menuItem.restaurantId },
    });
  }

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, menuItemId },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, menuItemId, quantity },
    });
  }

  return getCart(userId);
}

/**
 * Remove a specific item from the cart. Clears restaurantId if cart becomes empty.
 */
async function removeItem(userId, cartItemId) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new AppError(404, 'NOT_FOUND', 'Cart not found');

  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found');

  await prisma.cartItem.delete({ where: { id: cartItemId } });

  const remaining = await prisma.cartItem.count({ where: { cartId: cart.id } });
  if (remaining === 0) {
    await prisma.cart.update({ where: { id: cart.id }, data: { restaurantId: null } });
  }

  return getCart(userId);
}

/**
 * Update the quantity of a cart item. Quantity must be >= 1.
 */
async function updateItemQuantity(userId, cartItemId, quantity) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new AppError(404, 'NOT_FOUND', 'Cart not found');

  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found');

  await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });

  return getCart(userId);
}

/**
 * Clear all items from the cart.
 */
async function clearCart(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { restaurantId: null } });
}

/**
 * Convert the cart to an order. Requires an addressId.
 * Clears the cart on success.
 */
async function checkoutCart(userId, addressId) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { menuItem: true } } },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, 'EMPTY_CART', 'Cart is empty');
  }

  const total = cart.items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);

  const order = await prisma.order.create({
    data: {
      userId,
      restaurantId: cart.restaurantId,
      status: ORDER_STATUS.PENDING,
      totalAmount: total,
      items: {
        create: cart.items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          price: i.menuItem.price,
        })),
      },
    },
    include: { items: true },
  });

  await clearCart(userId);

  return order;
}

module.exports = { getCart, addItem, removeItem, updateItemQuantity, clearCart, checkoutCart };
