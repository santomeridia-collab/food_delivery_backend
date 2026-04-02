class AppError extends Error {
    constructor(statusCode, code, message) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.message = message;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = AppError;