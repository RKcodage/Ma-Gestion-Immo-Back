const User = require("../models/User");
const bcrypt = require("bcryptjs");
const uid2 = require("uid2");

// SIGNUP
const signup = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      username,
      phone,
      avatar,
      role,
    } = req.body;

    // Verify required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify is user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already used" });
    }

    // Generated hash + salt
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const token = uid2(64);

    // Create new user
    const newUser = new User({
      email: email,
      token: token,
      hash: hash,
      salt: salt,
      role: role,
      profile: {
        firstName: firstName,
        lastName: lastName,
        username: username,
        phone: phone,
        avatar: avatar,
      },
    });

    await newUser.save();

    // Response
    res.status(201).json({
      token: newUser.token,
      user: {
        _id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        profile: newUser.profile,
      },
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verify email and password
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    // Search user by email
    const user = await User.findOne({ email });

    // If user doesn't exist
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: user not found" });
    }

    // Compare password with hash
    const isPasswordValid = bcrypt.compareSync(password, user.hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Unauthorized: wrong password" });
    }

    // If user login is successfull
    res.status(200).json({
      token: user.token,
      user: {
        _id: user._id,
        email: user.email,
        profile: user.profile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { signup, login };
