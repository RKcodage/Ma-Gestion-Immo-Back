const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Lease = require("../models/Lease");
const Owner = require("../models/Owner");
const Tenant = require("../models/Tenant");
const Notification = require("../models/Notification");

// Send Message
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId, content, topic } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ error: "Missing required fields !" });
    }

    const message = await Message.create({
      senderId,
      recipientId,
      content,
      topic: topic || "Autre",
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("sendMessage:", err.message);
    res.status(500).json({ error: "Message not sent" });
  }
};

// Get conversation between users
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // ✅ Vérification de la validité de l'ObjectId
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId },
      ],
    })
      .sort({ sentAt: 1 })
      .populate("senderId", "profile")
      .populate("recipientId", "profile");

    res.status(200).json(messages);
  } catch (err) {
    console.error("getMessagesWithUser:", err.message);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des messages" });
  }
};

// Get user conversations
const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: currentUserId }, { recipientId: currentUserId }],
    }).sort({ sentAt: -1 });

    const conversationMap = new Map();

    for (const msg of messages) {
      const otherUserId =
        msg.senderId.toString() === currentUserId.toString()
          ? msg.recipientId.toString()
          : msg.senderId.toString();

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg);
      }
    }

    const conversationList = await Promise.all(
      Array.from(conversationMap.entries()).map(
        async ([otherId, lastMessage]) => {
          const user = await User.findById(otherId).select("profile");
          return {
            user,
            lastMessage,
          };
        }
      )
    );

    res.status(200).json(conversationList);
  } catch (err) {
    console.error("getUserConversations:", err.message);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

// Get recipients
const getRecipients = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === "Propriétaire") {
      const owner = await Owner.findOne({ userId });
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      // Find leases linked
      const leases = await Lease.find({ ownerId: owner._id }).populate({
        path: "tenantId",
        populate: {
          path: "userId",
          select: "profile role",
        },
      });

      // Extract only valid tenants
      const tenantUsers = leases
        .map((lease) => lease.tenantId?.userId)
        .filter((user) => user && user.role === "Locataire")
        .reduce((acc, user) => {
          if (!acc.find((u) => u._id.toString() === user._id.toString())) {
            acc.push(user);
          }
          return acc;
        }, []);

      return res.status(200).json(tenantUsers);
    }

    if (userRole === "Locataire") {
      const tenant = await Tenant.findOne({ userId });
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const lease = await Lease.findOne({ tenantId: tenant._id }).populate({
        path: "ownerId",
        populate: {
          path: "userId",
          select: "profile role",
        },
      });

      const ownerUser = lease?.ownerId?.userId;
      if (!ownerUser || ownerUser.role !== "Propriétaire") {
        return res.status(404).json({ error: "Valid owner not found" });
      }

      return res.status(200).json([ownerUser]);
    }

    res.status(400).json({ error: "Invalid role" });
  } catch (err) {
    console.error("getRecipients error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get unread messages count
const getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Message.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    res.status(200).json({ count });
  } catch (err) {
    console.error("getUnreadMessagesCount:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        senderId: otherUserId,
        recipientId: currentUserId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("markMessagesAsRead:", err.message);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUserConversations,
  getRecipients,
  getUnreadMessagesCount,
  markMessagesAsRead,
};
