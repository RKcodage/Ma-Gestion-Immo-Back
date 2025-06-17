const User = require("../models/User");
const Invitation = require("../models/Invitation");
const Lease = require("../models/Lease");
const Tenant = require("../models/Tenant");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// SIGNUP
const signup = async (req, res) => {
  try {
    const {
      email,
      password,
      profile: { firstName, lastName, username, phone, avatar } = {},
      role,
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already used" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // Check for valid invitation
    const invitation = await Invitation.findOne({
      email,
      used: false,
      expiresAt: { $gt: Date.now() },
    });

    const forcedRole = invitation ? "Locataire" : role;

    const newUser = new User({
      email,
      hash,
      salt,
      role: forcedRole,
      profile: {
        firstName,
        lastName,
        username,
        phone,
        avatar,
      },
    });

    await newUser.save();

    // Create JWT
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    newUser.token = token;
    await newUser.save();

    // If invitation : create user Id and link with lease
    if (invitation && invitation.leaseId) {
      const tenant = await Tenant.create({ userId: newUser._id });
      await Lease.findByIdAndUpdate(invitation.leaseId, {
        tenantId: tenant._id,
      });
      invitation.used = true;
      await invitation.save();
    }

    res.status(201).json({
      token,
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

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: user not found" });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        errors: [{ field: "password", message: "Mot de passe incorrect" }],
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    user.token = token;
    await user.save();

    res.status(200).json({
      token,
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

// Forgot and Reset password

// Nodemailer config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Forgot
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Verify if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new token and expiration date
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 3600000; // one hour validity

    // Save token in database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Send e-mail with reset link
    const resetLink = `https://ma-gestion-immo.netlify.app/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: "rkabra.dev@gmail.com",
      to: user.email,
      subject: "Réinitialisation de votre mot de passe",
      html: `<p>Bonjour,</p>
            <p>Vous avez demandé une réinitialisation de mot de passe. Cliquez sur le lien ci-dessous :</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Ce lien est valide pendant 1 heure.</p>`,
    });

    res.json({ message: "Reset password email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify if token exists
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Verify if token is not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid token or expired" });
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // Update password and delete token
    user.hash = hashedPassword;
    user.salt = salt;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password successfully updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signup, login, forgotPassword, resetPassword };
