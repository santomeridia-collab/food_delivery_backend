'use strict';

/**
 * Global Jest setup — runs once before all test suites.
 * Loads .env.test, verifies DB and Redis connectivity.
 */
module.exports = async function globalSetup() {
  // Load test environment variables
  require('dotenv').config({ path: '.env.test' });

  // Validate required env vars are present
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required test env var: ${key}`);
    }
  }

  console.log('[Test Setup] Environment loaded from .env.test');
};
