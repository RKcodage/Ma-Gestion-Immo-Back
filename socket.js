const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

// Only allow my front urls
const FRONT_ORIGINS = (process.env.FRONT_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Extract a Bearer token for auth during the Socket.IO handshake (client and server established connection).
function getBearerToken(socket) {
  const fromAuth = socket.handshake?.auth?.token;
  if (fromAuth) return fromAuth;
  const authHeader = socket.handshake?.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

// Initialize Socket.IO
function initSocket(server) {
  io = new Server(server, {
    // Validate the "Origin" header of the incoming request.
    // - Allow requests with no Origin (native apps, curl) OR
    // - Allow only origins listed in FRONT_ORIGINS.
    // Everything else is rejected with a CORS error.
    cors: {
      origin(origin, cb) {
        if (!origin || FRONT_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error("CORS origin not allowed"));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Automatic connection recovery after brief network drops
    connectionStateRecovery: {
      // How long (in ms) the server keeps state to restore a session on reconnect.
      // If the client reconnects within this window, Socket.IO tries to resume
      // the session and replay missed events
      maxDisconnectionDuration: 120_000, // 2 minutes
      skipMiddlewares: true, // middlewares registered via io.use(...) are NOT re-run on recovery
    },
  });

  /**
   * Handshake authentication middleware:
   * - Verify the JWT using JWT_SECRET
   * - Attach a minimal `socket.user` with `_id` (and optional role)
   * Reject the connection if the token is missing or invalid.
   */
  io.use((socket, next) => {
    try {
      const token = getBearerToken(socket);
      if (!token) return next(new Error("UNAUTHORIZED"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userId = String(payload.userId || payload._id || "");
      if (!userId) return next(new Error("UNAUTHORIZED"));

      socket.user = { _id: userId, role: payload.role || null };
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  /**
   * Main connection handler:
   * - Join a private room named by the userId (so we can push targeted events)
   * - Allow joining/leaving conversation rooms
   * - Log connect/disconnect for debugging
   */
  io.on("connection", (socket) => {
    const userId = socket.user._id;

    // User private room
    socket.join(userId);
    console.log("WS connected:", socket.id, "user:", userId);

    // Join a conversation room
    socket.on("join-conversation", (conversationId, cb) => {
      if (!conversationId) return cb?.({ ok: false, error: "INVALID_PAYLOAD" });
      // TODO: contrôle d'accès si tu as un modèle Conversation
      socket.join(String(conversationId));
      cb?.({ ok: true });
    });

    // Leave a conversation room
    socket.on("leave-conversation", (conversationId) => {
      if (conversationId) socket.leave(String(conversationId));
    });

    // Connection closed
    socket.on("disconnect", () => {
      console.log("WS disconnected:", socket.id, "user:", userId);
    });
  });
}

function getIO() {
  if (!io) throw new Error("Socket.io non initialisé !");
  return io;
}

module.exports = { initSocket, getIO };
