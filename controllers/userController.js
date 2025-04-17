const User = require("../models/User");
const Owner = require("../models/Owner");
const Tenant = require("../models/Tenant");
const bcrypt = require("bcryptjs");

// GET user by Id
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

// ASSIGN a role to a user
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

// UPLOAD user avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received." });
    }

    const user = req.user;
    user.profile.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res
      .status(200)
      .json({ message: "Avatar updated", avatar: user.profile.avatar });
  } catch (error) {
    console.error("uploadAvatar error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE user by Id
const updateUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, password, oldPassword, profile = {} } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify latest password
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ error: "Actual password required" });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Actual password not correct" });
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      user.salt = salt;
      user.hash = hash;
    }

    // Update email and profile
    if (email !== undefined) user.email = email;
    if (profile.firstName !== undefined)
      user.profile.firstName = profile.firstName;
    if (profile.lastName !== undefined)
      user.profile.lastName = profile.lastName;
    if (profile.username !== undefined)
      user.profile.username = profile.username;
    if (profile.phone !== undefined) user.profile.phone = profile.phone;

    await user.save();

    res.status(200).json({ message: "User updated" });
  } catch (error) {
    console.error("updateUserById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// DELETE user by Id
const deleteUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Verify if user is the good one
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User account erased" });
  } catch (error) {
    console.error("deleteUserById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUserById,
  assignRole,
  uploadAvatar,
  updateUserById,
  deleteUserById,
};
