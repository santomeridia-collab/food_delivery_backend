'use strict';

/**
 * Integration tests for Payment lifecycle.
 * Tests POST /api/payments/* endpoints using supertest.
 *
 * Note: payment/routes.js uses authorize("CUSTOMER") — uppercase.
 * Tokens must use role "CUSTOMER" to pass the payment RBAC check.
 */

require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const { createApp } = require('../__helpers__/testApp');
const { cleanDatabase, disconnectPrisma, prisma } = require('../__helpers__/factories');
const { signAccessToken } = require('../../src/common/utils/jwt');
const redis = require('../../src/config/redis');

let app;
let server;

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

async function createUserAndToken(phone = '+10000000080') {
  const bcrypt = require('bcryptjs');
  const user = await prisma.user.create({
    data: { name: 'Customer', phone, password: await bcrypt.hash('pass', 10), role: 'CUSTOMER' },
  });
  // Payment routes use authorize("CUSTOMER") — uppercase
  const token = signAccessToken({ id: user.id, phone: user.phone, role: 'CUSTOMER' });
  return { user, token };
}

async function createOrderForUser(userId) {
  const restaurant = await prisma.restaurant.create({
    data: { name: 'Test Restaurant', address: '123 Main St' },
  });
  return prisma.order.create({
    data: { userId, restaurantId: restaurant.id, status: 'PENDING', totalAmount: 19.99 },
  });
}

// ─── POST /api/payments ───────────────────────────────────────────────────────

describe('POST /api/payments', () => {
  it('403 — non-CUSTOMER role cannot create payment', async () => {
    const token = signAccessToken({ id: 'owner-1', phone: '+10000000001', role: 'restaurant_owner' });
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: 'some-id', amount: 10, method: 'CARD' });
    expect(res.status).toBe(403);
  });

  it('422 — missing required fields returns validation error', async () => {
    const { token } = await createUserAndToken('+10000000081');
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('422 — invalid payment method returns validation error', async () => {
    const { token } = await createUserAndToken('+10000000082');
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: 'some-id', amount: 10, method: 'BITCOIN' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('201 — creates payment with pending status and unique reference', async () => {
    const { user, token } = await createUserAndToken('+10000000083');
    const order = await createOrderForUser(user.id);

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reference');
    expect(res.body.data.status).toBe('pending');
  });

  it('400 — duplicate payment for same order returns error', async () => {
    const { user, token } = await createUserAndToken('+10000000084');
    const order = await createOrderForUser(user.id);

    // Create first payment
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    // Try to create second payment for same order
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 — unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({ orderId: 'some-id', amount: 10, method: 'CARD' });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────

describe('POST /api/payments/verify', () => {
  it('403 — non-CUSTOMER role cannot verify payment', async () => {
    const token = signAccessToken({ id: 'delivery-1', phone: '+10000000001', role: 'delivery' });
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId: 'some-id', success: true });
    expect(res.status).toBe(403);
  });

  it('422 — missing paymentId returns validation error', async () => {
    const { token } = await createUserAndToken('+10000000085');
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ success: true });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('200 — verify payment success sets status to SUCCESS', async () => {
    const { user, token } = await createUserAndToken('+10000000086');
    const order = await createOrderForUser(user.id);

    // Create payment first
    const createRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    const paymentId = createRes.body.data.id;

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId, success: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Payment status should be SUCCESS (as per payment service)
    expect(res.body.data.payment.status).toBe('SUCCESS');
  });

  it('200 — verify payment failure sets status to FAILED', async () => {
    const { user, token } = await createUserAndToken('+10000000087');
    const order = await createOrderForUser(user.id);

    const createRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    const paymentId = createRes.body.data.id;

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId, success: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.status).toBe('FAILED');
  });

  it('401 — unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post('/api/payments/verify')
      .send({ paymentId: 'some-id', success: true });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/payments/:id/refund ────────────────────────────────────────────

describe('POST /api/payments/:id/refund', () => {
  it('403 — non-CUSTOMER role cannot refund', async () => {
    const token = signAccessToken({ id: 'admin-1', phone: '+10000000001', role: 'admin' });
    const res = await request(app)
      .post('/api/payments/some-id/refund')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('200 — refund eligible payment (SUCCESS + CANCELLED order)', async () => {
    const { user, token } = await createUserAndToken('+10000000088');
    const order = await createOrderForUser(user.id);

    // Create and verify payment (success)
    const createRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    const paymentId = createRes.body.data.id;

    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId, success: true });

    // Cancel the order directly in DB
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });

    const res = await request(app)
      .post(`/api/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REFUNDED');
  });

  it('400 — refund ineligible payment (status=pending)', async () => {
    const { user, token } = await createUserAndToken('+10000000089');
    const order = await createOrderForUser(user.id);

    const createRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    const paymentId = createRes.body.data.id;

    // Try to refund without verifying (status is still pending)
    const res = await request(app)
      .post(`/api/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 — refund ineligible (SUCCESS payment but order not cancelled)', async () => {
    const { user, token } = await createUserAndToken('+10000000090');
    const order = await createOrderForUser(user.id);

    const createRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.id, amount: order.totalAmount, method: 'CARD' });

    const paymentId = createRes.body.data.id;

    // Verify payment (success) — order status becomes CONFIRMED
    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId, success: true });

    // Try to refund without cancelling the order
    const res = await request(app)
      .post(`/api/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('401 — unauthenticated request returns 401', async () => {
    const res = await request(app)
      .post('/api/payments/some-id/refund')
      .send({});
    expect(res.status).toBe(401);
  });
});
