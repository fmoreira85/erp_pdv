const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const JWT_SECRET = env.auth.jwtSecret;
const JWT_EXPIRES_IN = env.auth.jwtExpiresIn;

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  JWT_EXPIRES_IN,
  generateToken,
  verifyToken,
};
