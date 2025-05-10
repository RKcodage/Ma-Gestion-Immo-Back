const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  token: String,
  hash: String,
  salt: String,
  role: {
    type: String,
    enum: ["Propriétaire", "Locataire"],
  },
  profile: {
    firstName: String,
    lastName: String,
    username: String,
    phone: String,
    avatar: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

module.exports = mongoose.model("User", userSchema);
