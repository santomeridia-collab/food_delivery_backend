const jwt = require("jsonwebtoken");
const env = require("../../config/env");

const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? env.JWT_REFRESH_SECRET : env.JWT_SECRET;
  return jwt.verify(token, secret);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken
};