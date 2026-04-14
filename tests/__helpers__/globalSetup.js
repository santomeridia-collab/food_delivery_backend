'use strict';

const { execSync } = require('child_process');
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

  // Run migrations on the test database
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  }
};
