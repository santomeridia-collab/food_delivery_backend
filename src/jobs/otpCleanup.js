const prisma = require('../config/db');
const logger = require('../common/utils/logger');

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function cleanupExpiredOtps() {
  try {
    const result = await prisma.oTP.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      logger.info(`[otpCleanup] Deleted ${result.count} expired OTP record(s)`);
    }
  } catch (err) {
    logger.error('[otpCleanup] Failed to clean up expired OTPs', err);
  }
}

function start() {
  logger.info('[otpCleanup] Scheduled to run every 10 minutes');
  // Run immediately on start, then on interval
  cleanupExpiredOtps();
  return setInterval(cleanupExpiredOtps, INTERVAL_MS);
}

module.exports = { start, cleanupExpiredOtps };
