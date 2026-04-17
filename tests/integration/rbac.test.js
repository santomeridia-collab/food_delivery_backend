'use strict';

/**
 * Integration tests for RBAC (Role-Based Access Control).
 * Verifies that each role-restricted endpoint returns 403 for non-permitted roles.
 */

require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const { createApp } = require('../__helpers__/testApp');
const { cleanDatabase, disconnectPrisma } = require('../__helpers__/factories');
const { signAccessToken } = require('../../src/common/utils/jwt');
const redis = require('../../src/config/redis');

let app;
let server;

// Pre-signed tokens for each role (no DB needed — just valid JWTs)
const tokens = {};

beforeAll(async () => {
  const instance = createApp();
  app = instance.app;
  server = instance.server;

  // Create tokens for each role using the actual role strings used in routes
  const roles = ['customer', 'restaurant_owner', 'delivery', 'admin'];
  for (const role of roles) {
    tokens[role] = signAccessToken({ id: 'test-user-id', phone: '+10000000001', role });
  }
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectPrisma();
  await redis.quit();
  server.close();
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function authHeader(role) {
  return { Authorization: `Bearer ${tokens[role]}` };
}

// ─── POST /api/users/addresses — only customer ────────────────────────────────

describe('POST /api/users/addresses — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/users/addresses')
      .set(authHeader(role))
      .send({ address: '123 Test St', lat: 0, lng: 0 });
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/users/addresses/:id — only customer ─────────────────────────

describe('DELETE /api/users/addresses/:id — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .delete('/api/users/addresses/some-id')
      .set(authHeader(role));
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/restaurants/:id/menu — only restaurant_owner ──────────────────

describe('POST /api/restaurants/:id/menu — only restaurant_owner', () => {
  const nonOwnerRoles = ['customer', 'delivery', 'admin'];

  test.each(nonOwnerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/restaurants/some-id/menu')
      .set({ Authorization: `Bearer ${tokens[role]}` })
      .send({ name: 'Item', price: 9.99, category: 'Main' });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/restaurants/:id/menu/:itemId — only restaurant_owner ─────────

describe('PATCH /api/restaurants/:id/menu/:itemId — only restaurant_owner', () => {
  const nonOwnerRoles = ['customer', 'delivery', 'admin'];

  test.each(nonOwnerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .patch('/api/restaurants/some-id/menu/some-item-id')
      .set({ Authorization: `Bearer ${tokens[role]}` })
      .send({ price: 12.99 });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/orders — only customer ────────────────────────────────────────

describe('POST /api/orders — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/orders')
      .set(authHeader(role))
      .send({ restaurant_id: 1, address_id: 1, items: [{ menu_item_id: 1, quantity: 1 }] });
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/orders — only customer ─────────────────────────────────────────

describe('GET /api/orders — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .get('/api/orders')
      .set(authHeader(role));
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/orders/:id/cancel — only customer ─────────────────────────────

describe('POST /api/orders/:id/cancel — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/orders/1/cancel')
      .set(authHeader(role));
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/orders/:id/status — only restaurant_owner and delivery ────────

describe('PATCH /api/orders/:id/status — only restaurant_owner and delivery', () => {
  const nonPermittedRoles = ['customer', 'admin'];

  test.each(nonPermittedRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .patch('/api/orders/1/status')
      .set(authHeader(role))
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/delivery/:orderId/accept — only delivery ──────────────────────

describe('POST /api/delivery/:orderId/accept — only delivery', () => {
  const nonDeliveryRoles = ['customer', 'restaurant_owner', 'admin'];

  test.each(nonDeliveryRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/delivery/1/accept')
      .set(authHeader(role))
      .send({});
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/delivery/:orderId/location — only delivery ────────────────────

describe('POST /api/delivery/:orderId/location — only delivery', () => {
  const nonDeliveryRoles = ['customer', 'restaurant_owner', 'admin'];

  test.each(nonDeliveryRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/delivery/1/location')
      .set(authHeader(role))
      .send({ lat: 0, lng: 0 });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/delivery/:orderId/complete — only delivery ────────────────────

describe('POST /api/delivery/:orderId/complete — only delivery', () => {
  const nonDeliveryRoles = ['customer', 'restaurant_owner', 'admin'];

  test.each(nonDeliveryRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/delivery/1/complete')
      .set(authHeader(role))
      .send({});
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/payments — only customer ──────────────────────────────────────

describe('POST /api/payments — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/payments')
      .set(authHeader(role))
      .send({ orderId: 'some-id', amount: 10, method: 'CARD' });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/payments/verify — only customer ───────────────────────────────

describe('POST /api/payments/verify — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/payments/verify')
      .set(authHeader(role))
      .send({ paymentId: 'some-id', success: true });
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/payments/:id/refund — only customer ───────────────────────────

describe('POST /api/payments/:id/refund — only customer', () => {
  const nonCustomerRoles = ['restaurant_owner', 'delivery', 'admin'];

  test.each(nonCustomerRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/payments/some-id/refund')
      .set(authHeader(role))
      .send({});
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/admin/restaurants/:id/approve — only admin ────────────────────

describe('POST /api/admin/restaurants/:id/approve — only admin', () => {
  const nonAdminRoles = ['customer', 'restaurant_owner', 'delivery'];

  test.each(nonAdminRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/admin/restaurants/some-id/approve')
      .set(authHeader(role));
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/admin/agents/:id/approve — only admin ─────────────────────────

describe('POST /api/admin/agents/:id/approve — only admin', () => {
  const nonAdminRoles = ['customer', 'restaurant_owner', 'delivery'];

  test.each(nonAdminRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .post('/api/admin/agents/some-id/approve')
      .set(authHeader(role));
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/admin/analytics — only admin ───────────────────────────────────

describe('GET /api/admin/analytics — only admin', () => {
  const nonAdminRoles = ['customer', 'restaurant_owner', 'delivery'];

  test.each(nonAdminRoles)('%s → 403', async (role) => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set(authHeader(role));
    expect(res.status).toBe(403);
  });
});

// ─── Unauthenticated requests return 401 ─────────────────────────────────────

describe('Unauthenticated requests', () => {
  const protectedEndpoints = [
    ['GET', '/api/orders'],
    ['POST', '/api/orders'],
    ['POST', '/api/payments'],
    ['GET', '/api/admin/analytics'],
  ];

  test.each(protectedEndpoints)('%s %s → 401 without token', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
  });
});
