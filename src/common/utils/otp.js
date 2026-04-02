const redisClient = require("../../config/redis");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = async (phone, otp) => {
  const key = `otp:${phone}`;
  await redisClient.set(key, otp, "EX", 300);
};

const verifyOTP = async (phone, otp) => {
  const key = `otp:${phone}`;
  const storedOtp = await redisClient.get(key);

  if (!storedOtp) return false;
  if (storedOtp !== otp) return false;

  await redisClient.del(key);
  return true;
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP
};