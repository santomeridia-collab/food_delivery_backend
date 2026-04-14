'use strict';

/**
 * Unit tests for src/common/middleware/validate.js
 *
 * The validate middleware:
 *   - Calls next() when body is valid
 *   - Returns 422 with { success: false, message, errors: [{field, message}] } on failure
 */

const validate = require('../../src/common/middleware/validate');
const { registerSchema } = require('../../src/modules/auth/validation');
const { addAddressSchema } = require('../../src/modules/user/validation');
const { createOrderSchema } = require('../../src/modules/order/validation');

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function createMockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

function createMockReq(body = {}) {
  return { body };
}

function runMiddleware(schema, body) {
  return new Promise((resolve) => {
    const req = createMockReq(body);
    const res = createMockRes();
    const next = jest.fn();
    validate(schema)(req, res, next);
    resolve({ req, res, next });
  });
}

// ─── Valid requests pass through ──────────────────────────────────────────────

describe('validate() — valid requests', () => {
  it('calls next() for valid auth register body (phone)', async () => {
    const { next, res } = await runMiddleware(registerSchema, {
      name: 'Test User',
      phone: '+1234567890',
      password: 'Password123!',
      role: 'customer',
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // no error argument
    expect(res._status).toBeNull(); // no response sent
  });

  it('calls next() for valid auth register body (email)', async () => {
    const { next, res } = await runMiddleware(registerSchema, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      role: 'customer',
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBeNull();
  });

  it('calls next() for valid address body', async () => {
    const { next, res } = await runMiddleware(addAddressSchema, {
      address: '123 Main Street',
      lat: 40.7128,
      lng: -74.006,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBeNull();
  });

  it('calls next() for valid order body', async () => {
    const { next, res } = await runMiddleware(createOrderSchema, {
      restaurant_id: 1,
      address_id: 1,
      items: [{ menu_item_id: 1, quantity: 2 }],
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBeNull();
  });
});

// ─── Invalid requests return 422 ─────────────────────────────────────────────

describe('validate() — invalid requests return 422', () => {
  it('returns 422 for empty register body', async () => {
    const { next, res } = await runMiddleware(registerSchema, {});
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(422);
    expect(res._body.success).toBe(false);
    expect(res._body.message).toBe('Validation failed');
    expect(Array.isArray(res._body.errors)).toBe(true);
    expect(res._body.errors.length).toBeGreaterThan(0);
  });

  it('returns 422 with per-field errors for register — missing name', async () => {
    const { res } = await runMiddleware(registerSchema, {
      phone: '+1234567890',
      password: 'Password123!',
      role: 'customer',
    });
    expect(res._status).toBe(422);
    const fields = res._body.errors.map((e) => e.field);
    expect(fields).toContain('name');
  });

  it('returns 422 with per-field errors for register — missing password', async () => {
    const { res } = await runMiddleware(registerSchema, {
      name: 'Test',
      phone: '+1234567890',
      role: 'customer',
    });
    expect(res._status).toBe(422);
    const fields = res._body.errors.map((e) => e.field);
    expect(fields).toContain('password');
  });

  it('returns 422 with per-field errors for register — invalid role', async () => {
    const { res } = await runMiddleware(registerSchema, {
      name: 'Test',
      phone: '+1234567890',
      password: 'Password123!',
      role: 'superadmin',
    });
    expect(res._status).toBe(422);
    const fields = res._body.errors.map((e) => e.field);
    expect(fields).toContain('role');
  });

  it('returns 422 with per-field errors for register — missing both email and phone', async () => {
    const { res } = await runMiddleware(registerSchema, {
      name: 'Test',
      password: 'Password123!',
      role: 'customer',
    });
    expect(res._status).toBe(422);
    expect(res._body.errors.length).toBeGreaterThan(0);
  });

  it('returns 422 with per-field errors for address — missing address field', async () => {
    const { res } = await runMiddleware(addAddressSchema, {
      lat: 40.7128,
      lng: -74.006,
    });
    expect(res._status).toBe(422);
    const fields = res._body.errors.map((e) => e.field);
    expect(fields).toContain('address');
  });

  it('returns 422 with per-field errors for address — missing lat and lng', async () => {
    const { res } = await runMiddleware(addAddressSchema, {
      address: '123 Main St',
    });
    expect(res._status).toBe(422);
    const fields = res._body.errors.map((e) => e.field);
    expect(fields).toContain('lat');
    expect(fields).toContain('lng');
  });

  it('returns 422 with per-field errors for order — missing restaurant_id', async () => {
    const { res } = await runMiddleware(createOrderSchema, {
      address_id: 1,
      items: [{ menu_item_id: 1, quantity: 1 }],
    });
    expect(res._status).toBe(422);
    const fields = res._body.errors.map((e) => e.field);
    expect(fields).toContain('restaurant_id');
  });

  it('returns 422 with per-field errors for order — empty items array', async () => {
    const { res } = await runMiddleware(createOrderSchema, {
      restaurant_id: 1,
      address_id: 1,
      items: [],
    });
    expect(res._status).toBe(422);
    expect(res._body.errors.length).toBeGreaterThan(0);
  });

  it('returns 422 with per-field errors for order — missing items', async () => {
    const { res } = await runMiddleware(createOrderSchema, {
      restaurant_id: 1,
      address_id: 1,
    });
    expect(res._status).toBe(422);
    const fields = res._body.errors.map((e) => e.field);
    expect(fields).toContain('items');
  });
});

// ─── Error shape invariants ───────────────────────────────────────────────────

describe('validate() — error shape', () => {
  it('each error entry has field and message properties', async () => {
    const { res } = await runMiddleware(registerSchema, {});
    res._body.errors.forEach((err) => {
      expect(err).toHaveProperty('field');
      expect(err).toHaveProperty('message');
      expect(typeof err.field).toBe('string');
      expect(typeof err.message).toBe('string');
    });
  });

  it('collects all field errors at once (abortEarly: false)', async () => {
    // Missing name, password, role, and both email/phone
    const { res } = await runMiddleware(registerSchema, {});
    // Should have multiple errors, not just the first one
    expect(res._body.errors.length).toBeGreaterThan(1);
  });

  it('does not call next() when validation fails', async () => {
    const { next } = await runMiddleware(registerSchema, { name: 'only name' });
    expect(next).not.toHaveBeenCalled();
  });
});
