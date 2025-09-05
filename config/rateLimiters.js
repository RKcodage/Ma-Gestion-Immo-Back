const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Global limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    // skip CORS preflights
    req.method === "OPTIONS" ||
    req.path.startsWith("/uploads/") ||
    // skip connections with Socket.IO
    req.path.startsWith("/socket.io/"),
});

// Login limit
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req)}:${(req.body?.email || "no-email").toLowerCase()}`,
});

module.exports = {
  globalLimiter,
  loginLimiter,
};
