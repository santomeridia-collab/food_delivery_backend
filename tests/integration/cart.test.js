'use strict';

require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const { createApp } = require('../__helpers__/testApp');
const { cleanDatabase, disconnectPrisma, prisma } = require('../__helpers__/factories');
const { signAccessToken } = require('../../src/common/utils/jwt');
const redis = require('../../src/config/redis');
const bcrypt = require('bcryptjs');

let app, server;

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

async function createCustomer(phone = '+10000000010') {
  const user = await prisma.user.create({
    data: { name: 'Customer', phone, password: await bcrypt.hash('pass', 10), role: 'customer', is_verified: true, status: 'active' },
  });
  const token = signAccessToken({ id: user.id, phone: user.phone, role: 'customer' });
  return { user, token };
}

async function createRestaurantWithItem(price = 10.00) {
  const restaurant = await prisma.restaurant.create({
    data: { name: 'Test Restaurant', address: '123 Main St' },
  });
  const menuItem = await prisma.menuItem.create({
    data: { restaurantId: restaurant.id, name: 'Burger', price, isAvailable: true },
  });
  return { restaurant, menuItem };
}

// ─── GET /api/cart ────────────────────────────────────────────────────────────

describe('GET /api/cart', () => {
  it('200 — returns empty cart for new customer', async () => {
    const { token } = await createCustomer();
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it('401 — unauthenticated returns 401', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  it('403 — non-customer role returns 403', async () => {
    const token = signAccessToken({ id: 'owner-1', phone: '+10000000001', role: 'restaurant_owner' });
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/cart/items ─────────────────────────────────────────────────────

describe('POST /api/cart/items', () => {
  it('201 — adds item to cart', async () => {
    const { token } = await createCustomer('+10000000011');
    const { menuItem } = await createRestaurantWithItem();

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(res.body.data.total).toBeCloseTo(20.00);
  });

  it('201 — adding same item again increments quantity', async () => {
    const { token } = await createCustomer('+10000000012');
    const { menuItem } = await createRestaurantWithItem();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 1 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.items[0].quantity).toBe(3);
  });

  it('400 — adding item from different restaurant returns 400', async () => {
    const { token } = await createCustomer('+10000000013');
    const { menuItem: item1 } = await createRestaurantWithItem();
    const { menuItem: item2 } = await createRestaurantWithItem();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: item1.id, quantity: 1 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: item2.id, quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('404 — non-existent menu item returns 404', async () => {
    const { token } = await createCustomer('+10000000014');
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: '000000000000000000000000', quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('422 — missing menuItemId returns validation error', async () => {
    const { token } = await createCustomer('+10000000015');
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });
    expect(res.status).toBe(422);
  });

  it('422 — quantity < 1 returns validation error', async () => {
    const { token } = await createCustomer('+10000000016');
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: 'some-id', quantity: 0 });
    expect(res.status).toBe(422);
  });
});

// ─── PATCH /api/cart/items/:itemId ────────────────────────────────────────────

describe('PATCH /api/cart/items/:itemId', () => {
  it('200 — updates item quantity', async () => {
    const { token } = await createCustomer('+10000000017');
    const { menuItem } = await createRestaurantWithItem();

    const addRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 1 });

    const cartItemId = addRes.body.data.items[0].id;

    const res = await request(app)
      .patch(`/api/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(5);
  });

  it('404 — non-existent cart item returns 404', async () => {
    const { token } = await createCustomer('+10000000018');
    const { menuItem } = await createRestaurantWithItem();
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 1 });

    const res = await request(app)
      .patch('/api/cart/items/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 3 });

    expect(res.status).toBe(404);
  });

  it('422 — missing quantity returns validation error', async () => {
    const { token } = await createCustomer('+10000000019');
    const res = await request(app)
      .patch('/api/cart/items/some-id')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
  });
});

// ─── DELETE /api/cart/items/:itemId ──────────────────────────────────────────

describe('DELETE /api/cart/items/:itemId', () => {
  it('200 — removes item from cart', async () => {
    const { token } = await createCustomer('+10000000020');
    const { menuItem } = await createRestaurantWithItem();

    const addRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 2 });

    const cartItemId = addRes.body.data.items[0].id;

    const res = await request(app)
      .delete(`/api/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('404 — removing non-existent item returns 404', async () => {
    const { token } = await createCustomer('+10000000021');
    const { menuItem } = await createRestaurantWithItem();
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 1 });

    const res = await request(app)
      .delete('/api/cart/items/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/cart ─────────────────────────────────────────────────────────

describe('DELETE /api/cart', () => {
  it('200 — clears all items from cart', async () => {
    const { token } = await createCustomer('+10000000022');
    const { menuItem } = await createRestaurantWithItem();

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 3 });

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /api/cart/checkout ──────────────────────────────────────────────────

describe('POST /api/cart/checkout', () => {
  it('201 — converts cart to order', async () => {
    const { user, token } = await createCustomer('+10000000023');
    const { menuItem } = await createRestaurantWithItem(15.00);

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: menuItem.id, quantity: 2 });

    const address = await prisma.address.create({
      data: { userId: user.id, line1: '123 St', city: 'City', state: 'ST', pincode: '00000' },
    });

    const res = await request(app)
      .post('/api/cart/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ address_id: address.id });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.totalAmount).toBeCloseTo(30.00);
    expect(res.body.data.items).toHaveLength(1);

    // Cart should be empty after checkout
    const cartRes = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.data.items).toHaveLength(0);
  });

  it('400 — checkout with empty cart returns 400', async () => {
    const { token } = await createCustomer('+10000000024');
    const res = await request(app)
      .post('/api/cart/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ address_id: 'some-address-id' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('422 — missing address_id returns validation error', async () => {
    const { token } = await createCustomer('+10000000025');
    const res = await request(app)
      .post('/api/cart/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
  });
});
