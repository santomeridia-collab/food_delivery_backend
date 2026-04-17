'use strict';

const path = require('path');

module.exports = async function globalSetup() {
  // Load test env vars
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

  // Ensure TEST_DATABASE_URL is set
  if (!process.env.TEST_DATABASE_URL) {
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
  }
  if (!process.env.TEST_REDIS_URL) {
    process.env.TEST_REDIS_URL = process.env.REDIS_URL;
  }

  // Point Prisma at the test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.REDIS_URL = process.env.TEST_REDIS_URL;

  // MongoDB does not use SQL migrations — Prisma manages the schema automatically.
  // Skip migrate deploy for MongoDB provider.
  console.log('[Test Setup] Using MongoDB — skipping prisma migrate deploy.');
  console.log('[Test Setup] Environment loaded from .env.test');
};
