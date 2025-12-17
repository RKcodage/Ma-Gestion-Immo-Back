const User = require("../models/User");
const Invitation = require("../models/Invitation");
const Lease = require("../models/Lease");
const Tenant = require("../models/Tenant");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendMail } = require("../config/mailer");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// LINK LEASE TO USER WITH INVITATION
const processInvitationForUser = async (invitation, userId) => {
  // If there is no invitation or no leaseId, nothing to do
  if (!invitation || !invitation.leaseId) {
    return;
  }

  // Create a Tenant for this user
  const tenant = await Tenant.create({ userId });

  // Attach tenant to the lease
  await Lease.findByIdAndUpdate(
    invitation.leaseId,
    { $addToSet: { tenants: tenant._id } },
    { new: true }
  );

  // Mark invitation as used
  invitation.used = true;
  await invitation.save();
};

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

    // If invitation: create Tenant and push into lease.tenants array
    if (invitation && invitation.leaseId) {
      const tenant = await Tenant.create({ userId: newUser._id });
      await Lease.findByIdAndUpdate(
        invitation.leaseId,
        { $addToSet: { tenants: tenant._id } },
        { new: true }
      );
      invitation.used = true;
      await invitation.save();
    }

    res.status(201).json({
      message: "User created, please log in",
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
      expiresIn: process.env.JWT_EXPIRES_IN,
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

// FORGOT AND RESET PASSWORD

// FORGOT
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

    await sendMail({
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

// RESET
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

// GOOGLE AUTH
const googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;

    // 1) Check that we received the Google ID token from the frontend
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    // 2) Verify the token with Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID, // must match your .env name
      });
      payload = ticket.getPayload();
    } catch (error) {
      console.error("Google token verification failed:", error.message);
      return res.status(401).json({ error: "Invalid Google token" });
    }

    // 3) Extract useful information from the Google token
    const {
      email,
      given_name: firstName,
      family_name: lastName,
      picture: avatar,
    } = payload || {};

    if (!email) {
      return res
        .status(400)
        .json({ error: "Google account does not include an email" });
    }

    // 4) Look for an existing user with this email
    let user = await User.findOne({ email });

    // 5) If user does not exist yet, create it (similar to signup)
    if (!user) {
      // Check if there is a valid invitation for this email
      const invitation = await Invitation.findOne({
        email,
        used: false,
        expiresAt: { $gt: Date.now() },
      });

      // If invitation exists, force role to 'Locataire'
      const forcedRole = invitation ? "Locataire" : role || "Locataire";

      user = new User({
        email,
        role: forcedRole,
        profile: {
          firstName,
          lastName,
          avatar,
        },
      });

      await user.save();

      // Process invitation: create Tenant + attach to Lease
      await processInvitationForUser(invitation, user._id);
    }

    // 6) Optionally update profile (e.g. avatar) if empty
    user.profile = user.profile || {};
    if (!user.profile.avatar && avatar) {
      user.profile.avatar = avatar;
    }

    // 7) Generate a JWT, same logic as in login()
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // Keep consistency with classic login by storing token on user
    user.token = token;
    await user.save();

    // 8) Return the token and user data to the frontend
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
    console.error("Google auth error:", error.message);
    res.status(500).json({ error: "Unable to authenticate with Google" });
  }
};

module.exports = { signup, login, forgotPassword, resetPassword, googleAuth };
