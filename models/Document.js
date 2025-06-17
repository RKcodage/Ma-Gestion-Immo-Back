const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "Contrat",
      "Récépissé",
      "Diagnostic",
      "Justificatif de domicile",
      "Fiche de paie",
      "Avis d'imposition",
    ],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  leaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lease",
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
  },
  isPrivate: { type: Boolean, default: false },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Document", documentSchema);
