const redisClient = require("../../config/redis");

const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip;
    const key = `rate:${ip}`;
    const limit = 100;
    const windowSeconds = 60;

    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    if (current > limit) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later."
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = rateLimiter;