const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getRecipients,
  getMessages,
  getUserConversations,
  getUnreadMessagesCount,
  markMessagesAsRead,
} = require("../controllers/messageController");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/messages", isAuthenticated, sendMessage);
router.get("/messages/unread-count", isAuthenticated, getUnreadMessagesCount);
router.get("/messages/conversations", isAuthenticated, getUserConversations);
router.get("/messages/recipients", isAuthenticated, getRecipients);
router.get("/messages/:userId", isAuthenticated, getMessages);
router.put("/messages/read/:userId", isAuthenticated, markMessagesAsRead);

module.exports = router;
