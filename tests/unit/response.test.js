'use strict';

/**
 * Unit tests for src/common/utils/response.js
 *
 * The actual response.js signature:
 *   success(res, message, data, statusCode)
 *   error(res, message, statusCode, details)
 *
 * Response shapes:
 *   success: { success: true, message, data }
 *   error:   { success: false, message, details }
 */

const { success, error } = require('../../src/common/utils/response');

// ─── Mock Express res object ──────────────────────────────────────────────────

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

// ─── success() ───────────────────────────────────────────────────────────────

describe('success()', () => {
  it('returns { success: true, message, data } with default 200', () => {
    const res = createMockRes();
    success(res, 'OK', { id: 1 });
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ success: true, message: 'OK', data: { id: 1 } });
  });

  it('uses provided statusCode', () => {
    const res = createMockRes();
    success(res, 'Created', { id: 2 }, 201);
    expect(res._status).toBe(201);
    expect(res._body.success).toBe(true);
  });

  it('data can be an array', () => {
    const res = createMockRes();
    success(res, 'List', [1, 2, 3]);
    expect(res._body.data).toEqual([1, 2, 3]);
    expect(res._body.success).toBe(true);
  });

  it('data can be null', () => {
    const res = createMockRes();
    success(res, 'No content', null);
    expect(res._body.data).toBeNull();
    expect(res._body.success).toBe(true);
  });

  it('data can be a string', () => {
    const res = createMockRes();
    success(res, 'Done', 'some string value');
    expect(res._body.data).toBe('some string value');
    expect(res._body.success).toBe(true);
  });

  it('data can be an empty object', () => {
    const res = createMockRes();
    success(res, 'Empty', {});
    expect(res._body.data).toEqual({});
    expect(res._body.success).toBe(true);
  });

  it('uses default message "Success" when not provided', () => {
    const res = createMockRes();
    success(res);
    expect(res._body.message).toBe('Success');
    expect(res._body.success).toBe(true);
  });

  it('status 200 — standard success', () => {
    const res = createMockRes();
    success(res, 'OK', { token: 'abc' }, 200);
    expect(res._status).toBe(200);
  });

  it('status 201 — resource created', () => {
    const res = createMockRes();
    success(res, 'Created', { id: 42 }, 201);
    expect(res._status).toBe(201);
  });
});

// ─── error() ─────────────────────────────────────────────────────────────────

describe('error()', () => {
  it('returns { success: false, message, details } with default 500', () => {
    const res = createMockRes();
    error(res, 'Something went wrong');
    expect(res._status).toBe(500);
    expect(res._body).toMatchObject({ success: false, message: 'Something went wrong' });
  });

  it('uses provided statusCode', () => {
    const res = createMockRes();
    error(res, 'Not found', 404);
    expect(res._status).toBe(404);
    expect(res._body.success).toBe(false);
  });

  it('includes details when provided', () => {
    const res = createMockRes();
    const details = [{ field: 'email', message: 'Invalid email' }];
    error(res, 'Validation failed', 422, details);
    expect(res._body.details).toEqual(details);
  });

  it('details is null when not provided', () => {
    const res = createMockRes();
    error(res, 'Error', 400);
    expect(res._body.details).toBeNull();
  });

  it('status 400 — bad request', () => {
    const res = createMockRes();
    error(res, 'Bad request', 400);
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
  });

  it('status 401 — unauthorized', () => {
    const res = createMockRes();
    error(res, 'Unauthorized', 401);
    expect(res._status).toBe(401);
    expect(res._body.success).toBe(false);
  });

  it('status 403 — forbidden', () => {
    const res = createMockRes();
    error(res, 'Forbidden', 403);
    expect(res._status).toBe(403);
    expect(res._body.success).toBe(false);
  });

  it('status 404 — not found', () => {
    const res = createMockRes();
    error(res, 'Not found', 404);
    expect(res._status).toBe(404);
    expect(res._body.success).toBe(false);
  });

  it('status 409 — conflict', () => {
    const res = createMockRes();
    error(res, 'Conflict', 409);
    expect(res._status).toBe(409);
    expect(res._body.success).toBe(false);
  });

  it('status 422 — validation error', () => {
    const res = createMockRes();
    error(res, 'Validation failed', 422, [{ field: 'name', message: '"name" is required' }]);
    expect(res._status).toBe(422);
    expect(res._body.success).toBe(false);
    expect(res._body.details).toHaveLength(1);
  });

  it('status 429 — rate limited', () => {
    const res = createMockRes();
    error(res, 'Too many requests', 429);
    expect(res._status).toBe(429);
    expect(res._body.success).toBe(false);
  });

  it('status 500 — internal server error', () => {
    const res = createMockRes();
    error(res, 'Internal server error', 500);
    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });

  it('uses default message when not provided', () => {
    const res = createMockRes();
    error(res);
    expect(res._body.message).toBe('Something went wrong');
    expect(res._body.success).toBe(false);
  });
});

// ─── Shape invariants ─────────────────────────────────────────────────────────

describe('Response shape invariants', () => {
  it('success response always has success=true', () => {
    const res = createMockRes();
    success(res, 'Test', { x: 1 });
    expect(res._body.success).toBe(true);
  });

  it('error response always has success=false', () => {
    const res = createMockRes();
    error(res, 'Test error', 400);
    expect(res._body.success).toBe(false);
  });

  it('success and error responses never share the same success value', () => {
    const successRes = createMockRes();
    const errorRes = createMockRes();
    success(successRes, 'OK', {});
    error(errorRes, 'Fail', 400);
    expect(successRes._body.success).not.toBe(errorRes._body.success);
  });
});
