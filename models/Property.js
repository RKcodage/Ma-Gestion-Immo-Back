const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
  },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String },
  description: { type: String },
  type: {
    type: String,
    enum: ["Appartement", "Maison", "Local commercial", "Parking", "Boxe"],
  },
  surface: { type: Number },
  rooms: { type: Number },
  rent: { type: Number },
  charges: { type: Number },
  isOccupied: { type: Boolean, default: false },
  tenants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tenant" }],
  photos: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Property", propertySchema);
