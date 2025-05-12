const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  leaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lease",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Invitation", invitationSchema);
