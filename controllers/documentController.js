const Document = require("../models/Document");
const Lease = require("../models/Lease");
const Owner = require("../models/Owner");
const Tenant = require("../models/Tenant");
const axios = require("axios");

// Upload lease document
const uploadLeaseDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file sent." });
    }

    const { name, type, leaseId, unitId } = req.body;
    const isPrivate = req.body.isPrivate === "true";

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
      isPrivate,
    });

    await document.save();
    res.status(201).json({ message: "Document added", document });
  } catch (error) {
    console.error("uploadLeaseDocument error:", error.message);
    res.status(500).json({ error: "Server error while uploading." });
  }
};

// Get documents
const getLeaseDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let leases;

    if (role === "Propriétaire") {
      const owner = await Owner.findOne({ userId });
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      leases = await Lease.find({ ownerId: owner._id });
    } else if (role === "Locataire") {
      const tenant = await Tenant.findOne({ userId });
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      leases = await Lease.find({ tenantId: tenant._id });
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const leaseIds = leases.map((lease) => lease._id);

    const documents = await Document.find({
      leaseId: { $in: leaseIds },
      ...(role === "Locataire" && { isPrivate: false }),
    }).sort({ uploadedAt: -1 });

    res.status(200).json(documents);
  } catch (error) {
    console.error("getLeaseDocument error:", error.message);
    res.status(500).json({ error: "Error while fetching document(s)" });
  }
};

// Download document
const downloadLeaseDocument = async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Access if lease exists
    if (document.leaseId) {
      const lease = await Lease.findById(document.leaseId);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const isOwner = lease.ownerId.toString() === userId.toString();
      const isTenant = lease.tenantId.toString() === userId.toString();

      // If document is private only owner can access
      if (document.isPrivate && !isOwner) {
        return res
          .status(403)
          .json({ error: "Document privé – accès refusé." });
      }

      // Security on user
      if (!isOwner && !isTenant) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Fetch file from cloudinary
    const response = await axios.get(document.url, {
      responseType: "stream",
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.name}"`
    );
    res.setHeader("Content-Type", response.headers["content-type"]);

    response.data.pipe(res);
  } catch (error) {
    console.error("Download error:", error.message);
    res
      .status(500)
      .json({ error: "Erreur lors du téléchargement du fichier." });
  }
};

module.exports = {
  uploadLeaseDocument,
  getLeaseDocument,
  downloadLeaseDocument,
};
