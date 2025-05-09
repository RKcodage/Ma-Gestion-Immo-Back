const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.post("/notifications", isAuthenticated, createNotification);
router.get("/notifications", isAuthenticated, getNotifications);
router.patch("/notifications/:id/read", isAuthenticated, markAsRead);
router.patch("/notifications/read-all", isAuthenticated, markAllAsRead);

module.exports = router;
