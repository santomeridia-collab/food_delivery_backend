const Redis = require("ioredis");
const env = require("./env");

const redisClient = global.redisClient || new Redis(env.REDIS_URL);

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

if (process.env.NODE_ENV !== "production") {
  global.redisClient = redisClient;
}

module.exports = redisClient;