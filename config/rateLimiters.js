const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// Extract the userId from the Authorization header when present.
// Returns null if there's no Bearer token or verification fails.
function getUserIdFromAuth(req) {
  try {
    const auth = req.headers?.authorization || "";
    const m = auth.match(/^Bearer\s+(\S+)$/i);
    if (!m) return null;
    const token = m[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload?.userId || null;
  } catch (_) {
    return null;
  }
}

// Global limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // Key per IP + userId (when authenticated) so each logged-in user
  // gets their own budget even if multiple users share the same IP (proxy/NAT).
  // Falls back to "anon" when no valid JWT is provided.
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req);
    const uid = getUserIdFromAuth(req);
    // "anon" = "anonymous"
    return `${ipKey}:${uid || "anon"}`;
  },
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
