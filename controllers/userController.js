const User = require("../models/User");
const Owner = require("../models/Owner");
const Tenant = require("../models/Tenant");

// Get user by Id
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Search user by id
    const user = await User.findById(userId).select("-hash -salt");

    // If user doesn't exist
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If user exists
    res.status(200).json(user);
  } catch (error) {
    console.error("getUserById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Assign a role to a user
const assignRole = async (req, res) => {
  try {
    const user = req.user; // Inject by isAuthenticated middleware
    const { role } = req.body;

    if (!["Propriétaire", "Locataire"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Verify is a role is already assigned
    if (user.role) {
      return res.status(400).json({ error: "Role already assigned" });
    }

    user.role = role;
    await user.save();

    if (role === "Propriétaire") {
      await new Owner({ userId: user._id }).save();
    } else if (role === "Locataire") {
      await new Tenant({ userId: user._id }).save();
    }

    res.status(200).json({ message: `Role ${role} assigned.` });
  } catch (error) {
    console.error("assignRole error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Upload avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu." });
    }

    const user = req.user;
    user.profile.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res
      .status(200)
      .json({ message: "Avatar mis à jour", avatar: user.profile.avatar });
  } catch (error) {
    console.error("uploadAvatar error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getUserById, assignRole, uploadAvatar };
