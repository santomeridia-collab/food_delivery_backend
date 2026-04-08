'use strict';

/**
 * Custom application error class.
 * All service-layer errors should be thrown as AppError instances
 * so the global error handler can map them deterministically.
 */
class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 409, 422, 429)
   * @param {string} code - Machine-readable error code (e.g. 'NOT_FOUND', 'FORBIDDEN')
   * @param {string} message - Human-readable error message
   */
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    // Capture stack trace, excluding the constructor call from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

module.exports = AppError;
