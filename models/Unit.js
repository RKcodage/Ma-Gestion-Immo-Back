const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  floor: {
    type: String,
  },
  surface: {
    type: Number,
  },
  rentAmount: {
    type: Number,
  },
  chargesAmount: {
    type: Number,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Unit", unitSchema);
