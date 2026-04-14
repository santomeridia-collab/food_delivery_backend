'use strict';

/**
 * Integration tests for Order lifecycle.
 * Tests POST/GET /api/orders/* endpoints using supertest.
 *
 * Note: The order service uses integer IDs (parseInt) while the Prisma schema
 * uses String UUIDs. These tests verify the HTTP layer behavior including
 * auth, RBAC, and business logic responses.
 */

require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const { createApp } = require('../__helpers__/testApp');
const { cleanDatabase, disconnectPrisma, prisma } = require('../__helpers__/factories');
const { signAccessToken } = require('../../src/common/utils/jwt');
const redis = require('../../src/config/redis');

let app;
let server;

// Tokens for different roles
let customerToken;
let restaurantOwnerToken;
let deliveryToken;

beforeAll(async () => {
  const instance = createApp();
  app = instance.app;
  server = instance.server;
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectPrisma();
  await redis.quit();
  server.close();
});

afterEach(async () => {
  await cleanDatabase();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCustomerToken(userId = 'customer-1') {
  return signAccessToken({ id: userId, phone: '+10000000001', role: 'customer' });
}

function makeRestaurantOwnerToken(userId = 'owner-1') {
  return signAccessToken({ id: userId, phone: '+10000000002', role: 'restaurant_owner' });
}

function makeDeliveryToken(userId = 'delivery-1') {
  return signAccessToken({ id: userId, phone: '+10000000003', role: 'delivery' });
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
  it('403 — non-customer role cannot create order', async () => {
    const token = makeRestaurantOwnerToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurant_id: 1, address_id: 1, items: [{ menu_item_id: 1, quantity: 1 }] });
    expect(res.status).toBe(403);
  });

  it('422 — missing required fields returns validation error', async () => {
    const token = makeCustomerToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('422 — empty items array returns validation error', async () => {
    const token = makeCustomerToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurant_id: 1, address_id: 1, items: [] });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('400 — cross-restaurant items returns error', async () => {
    // Create a restaurant and menu item
    const restaurant = await prisma.restaurant.create({
      data: { name: 'Restaurant A', address: '123 Main St' },
    });
    const otherRestaurant = await prisma.restaurant.create({
      data: { name: 'Restaurant B', address: '456 Other St' },
    });
    const menuItem = await prisma.menuItem.create({
      data: { restaurantId: otherRestaurant.id, name: 'Item', price: 9.99 },
    });

    // Create a user for the customer token
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.create({
      data: { name: 'Customer', phone: '+10000000099', password: await bcrypt.hash('pass', 10), role: 'customer' },
    });
    const token = signAccessToken({ id: user.id, phone: user.phone, role: 'customer' });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurant_id: restaurant.id,
        address_id: 1,
        items: [{ menu_item_id: menuItem.id, quantity: 1 }],
      });

    // Should return 400 because menu item doesn't belong to the restaurant
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 — unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ restaurant_id: 1, address_id: 1, items: [{ menu_item_id: 1, quantity: 1 }] });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  it('403 — non-customer role cannot list orders', async () => {
    const token = makeDeliveryToken();
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('200 — customer gets their orders (empty list)', async () => {
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.create({
      data: { name: 'Customer', phone: '+10000000098', password: await bcrypt.hash('pass', 10), role: 'customer' },
    });
    const token = signAccessToken({ id: user.id, phone: user.phone, role: 'customer' });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('orders');
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  it('200 — customer only sees their own orders', async () => {
    const bcrypt = require('bcryptjs');

    // Create two customers
    const customer1 = await prisma.user.create({
      data: { name: 'Customer 1', phone: '+10000000097', password: await bcrypt.hash('pass', 10), role: 'customer' },
    });
    const customer2 = await prisma.user.create({
      data: { name: 'Customer 2', phone: '+10000000096', password: await bcrypt.hash('pass', 10), role: 'customer' },
    });

    const restaurant = await prisma.restaurant.create({
      data: { name: 'Test Restaurant', address: '123 Main St' },
    });

    // Create orders for each customer
    await prisma.order.create({
      data: { userId: customer1.id, restaurantId: restaurant.id, status: 'PENDING', totalAmount: 10 },
    });
    await prisma.order.create({
      data: { userId: customer2.id, restaurantId: restaurant.id, status: 'PENDING', totalAmount: 20 },
    });

    const token1 = signAccessToken({ id: customer1.id, phone: customer1.phone, role: 'customer' });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    // All returned orders should belong to customer1
    const orders = res.body.data.orders;
    orders.forEach((order) => {
      expect(order.userId || order.customer_id).toBe(customer1.id);
    });
  });

  it('401 — unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/orders/:id/cancel ──────────────────────────────────────────────

describe('POST /api/orders/:id/cancel', () => {
  it('403 — non-customer role cannot cancel order', async () => {
    const token = makeRestaurantOwnerToken();
    const res = await request(app)
      .post('/api/orders/1/cancel')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('400 — cancel order with status=preparing returns error', async () => {
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.create({
      data: { name: 'Customer', phone: '+10000000095', password: await bcrypt.hash('pass', 10), role: 'customer' },
    });
    const restaurant = await prisma.restaurant.create({
      data: { name: 'Test Restaurant', address: '123 Main St' },
    });
    const order = await prisma.order.create({
      data: { userId: user.id, restaurantId: restaurant.id, status: 'PREPARING', totalAmount: 10 },
    });

    const token = signAccessToken({ id: user.id, phone: user.phone, role: 'customer' });

    const res = await request(app)
      .post(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 — cancel order with status=out_for_delivery returns error', async () => {
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.create({
      data: { name: 'Customer', phone: '+10000000094', password: await bcrypt.hash('pass', 10), role: 'customer' },
    });
    const restaurant = await prisma.restaurant.create({
      data: { name: 'Test Restaurant', address: '123 Main St' },
    });
    const order = await prisma.order.create({
      data: { userId: user.id, restaurantId: restaurant.id, status: 'OUT_FOR_DELIVERY', totalAmount: 10 },
    });

    const token = signAccessToken({ id: user.id, phone: user.phone, role: 'customer' });

    const res = await request(app)
      .post(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 — cancel order with status=delivered returns error', async () => {
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.create({
      data: { name: 'Customer', phone: '+10000000093', password: await bcrypt.hash('pass', 10), role: 'customer' },
    });
    const restaurant = await prisma.restaurant.create({
      data: { name: 'Test Restaurant', address: '123 Main St' },
    });
    const order = await prisma.order.create({
      data: { userId: user.id, restaurantId: restaurant.id, status: 'DELIVERED', totalAmount: 10 },
    });

    const token = signAccessToken({ id: user.id, phone: user.phone, role: 'customer' });

    const res = await request(app)
      .post(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 — unauthenticated request returns 401', async () => {
    const res = await request(app).post('/api/orders/1/cancel');
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/orders/:id/status ─────────────────────────────────────────────

describe('PATCH /api/orders/:id/status', () => {
  it('403 — customer cannot update order status', async () => {
    const token = makeCustomerToken();
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(403);
  });

  it('403 — admin cannot update order status', async () => {
    const token = signAccessToken({ id: 'admin-1', phone: '+10000000004', role: 'admin' });
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(403);
  });

  it('422 — missing status field returns validation error', async () => {
    const token = makeRestaurantOwnerToken();
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('422 — invalid status value returns validation error', async () => {
    const token = makeRestaurantOwnerToken();
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INVALID_STATUS' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('401 — unauthenticated request returns 401', async () => {
    const res = await request(app)
      .patch('/api/orders/1/status')
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(401);
  });
});
