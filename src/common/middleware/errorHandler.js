const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code || "APP_ERROR",
      message: err.message
    });
  }

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong"
  });
};

module.exports = errorHandler;