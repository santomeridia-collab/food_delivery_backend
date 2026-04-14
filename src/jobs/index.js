const logger = require('../common/utils/logger');
const otpCleanup = require('./otpCleanup');

function startJobs() {
  logger.info('[jobs] Starting background jobs...');
  otpCleanup.start();
}

module.exports = { startJobs };
