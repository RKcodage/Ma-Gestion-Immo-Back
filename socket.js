const { Server } = require("socket.io");

// Store socket.io instance
let io;

// Initialize WebSocket server
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "https://ma-gestion-immo.netlify.app/", // Only authorize my website
      methods: ["GET", "POST"],
    },
  });

  // EVENTS

  // Event triggered by user connection
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // During connection userId is sent to server
    socket.on("register-user", (userId) => {
      socket.join(userId); // private room is created with userId
      console.log(`${socket.id} registered for user : ${userId}`);
    });

    // To join a specific conversation
    socket.on("join-conversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`${socket.id} joined the conversation : ${conversationId}`);
    });

    // To leave a specific conversation
    socket.on("leave-conversation", (conversationId) => {
      socket.leave(conversationId);
      console.log(`${socket.id} leaved the conversation : ${conversationId}`);
    });

    // A message is sent to a user by his private room (with his userId)
    socket.on("send-message", (message) => {
      const { recipientId } = message;
      if (recipientId) {
        io.to(recipientId.toString()).emit("new-message", message);
        console.log(`Message sent to ${recipientId}`);
      }
    });

    // If user is disconnected
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

// Allow to fetch socket.io instance from other files
function getIO() {
  if (!io) {
    throw new Error("Socket.io non initialisé !");
  }
  return io;
}

module.exports = { initSocket, getIO };
