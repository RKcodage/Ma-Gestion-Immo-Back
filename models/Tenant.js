const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  address: {
    type: String,
  },
  birthDate: {
    type: Date,
  },
  employmentStatus: {
    type: String,
    enum: [
      "CDI",
      "CDD",
      "Indépendant",
      "Étudiant",
      "Retraité",
      "Sans emploi",
      "Autre",
    ],
  },
  guarantor: {
    type: Boolean,
    default: false,
  },
  visaleGuarantee: {
    enabled: { type: Boolean, default: false },
    contractNumber: { type: String },
    validityStart: { type: Date },
    validityEnd: { type: Date },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Tenant", tenantSchema);
