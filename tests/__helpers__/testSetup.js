'use strict';

/**
 * Per-test-file setup — runs after the test framework is installed.
 * Loads .env.test so process.env is populated for each test file.
 */
require('dotenv').config({ path: '.env.test' });
