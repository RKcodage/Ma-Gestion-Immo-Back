const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  emailPro: {
    type: String,
  },
  companyName: {
    type: String,
  },
  companyNumber: {
    type: String,
  },
  companyPhone: {
    type: String,
  },
  billingAddress: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Professionnel", "Particulier"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Owner", ownerSchema);
