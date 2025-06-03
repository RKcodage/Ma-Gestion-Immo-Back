const Notification = require("../models/Notification");

// Create notification
const createNotification = async (req, res) => {
  try {
    const { userId, message, link } = req.body;
    const senderId = req.user._id;

    if (!userId || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const notification = await Notification.create({
      userId,
      senderId,
      message,
      link,
    });

    res.status(201).json(notification);
  } catch (err) {
    console.error("createNotification:", err.message);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

// Get notifications for a user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json(notifications);
  } catch (err) {
    console.error("getNotifications:", err.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId },
      {
        isRead: true,
        readAt: new Date(), // necessary to start up TTL
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("markAsRead:", err.message);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("markAllAsRead:", err.message);
    res.status(500).json({ error: "Failed to update notifications" });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
