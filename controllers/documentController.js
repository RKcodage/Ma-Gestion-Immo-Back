const Document = require("../models/Document");

const uploadLeaseDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file sent." });
    }

    const { name, type, leaseId, unitId } = req.body;

    if (!name || !type || (!leaseId && !unitId)) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const uploaderId = req.user._id;

    const document = new Document({
      name,
      type,
      leaseId,
      unitId,
      url: req.file.path,
      uploaderId,
    });

    await document.save();
    res.status(201).json({ message: "Document added", document });
  } catch (error) {
    console.error("uploadLeaseDocument error:", error.message);
    res.status(500).json({ error: "Server error while uploading." });
  }
};

module.exports = {
  uploadLeaseDocument,
};
