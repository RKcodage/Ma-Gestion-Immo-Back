const User = require("../models/User");

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

module.exports = { getUserById };
