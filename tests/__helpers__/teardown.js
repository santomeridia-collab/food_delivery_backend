'use strict';

/**
 * Global Jest teardown — runs once after all test suites complete.
 */
module.exports = async function globalTeardown() {
  console.log('[Test Teardown] All tests complete.');
};
