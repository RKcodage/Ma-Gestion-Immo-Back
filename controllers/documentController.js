const Document = require("../models/Document");
const User = require("../models/User");
const Lease = require("../models/Lease");
const Owner = require("../models/Owner");
const Tenant = require("../models/Tenant");
const Notification = require("../models/Notification");
const axios = require("axios");
const { cloudinary } = require("../config/cloudinary");

// Upload lease document
const uploadLeaseDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file sent." });
    }

    const { name, type, leaseId, unitId } = req.body;
    const isPrivate = req.body.isPrivate === "true";

    if (!name || !type || !leaseId) {
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

    // Create notification if document created
    const lease = await Lease.findById(leaseId)
      .populate("tenantId")
      .populate("ownerId");

    if (lease) {
      const uploader = await User.findById(uploaderId);
      const isOwner = uploader.role === "Propriétaire";

      const recipientUserId = isOwner
        ? lease.tenantId?.userId
        : lease.ownerId?.userId;

      if (recipientUserId?.toString() !== uploaderId.toString()) {
        await Notification.create({
          userId: recipientUserId,
          senderId: uploaderId,
          message: `Un document a été ajouté au bail par ${
            isOwner ? "votre propriétaire" : "votre locataire"
          }.`,
          link: `/dashboard/documents?documentId=${document._id}`,
        });
      }
    }

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

    const { unitId, propertyId } = req.query;

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

    const documentFilter = {
      leaseId: { $in: leaseIds },
      ...(role === "Locataire" && { isPrivate: false }),
    };

    let documents = await Document.find(documentFilter)
      .populate({
        path: "leaseId",
        populate: [
          {
            path: "tenantId",
            populate: { path: "userId", select: "profile" },
          },
          {
            path: "unitId",
            populate: {
              path: "propertyId",
              ...(propertyId && {
                match: { _id: propertyId },
              }),
            },
          },
        ],
      })
      .populate({
        path: "unitId",
        populate: { path: "propertyId" },
      })
      .sort({ uploadedAt: -1 });

    // 🔁 Filtres manuels après population
    if (propertyId) {
      documents = documents.filter(
        (doc) => doc.leaseId?.unitId?.propertyId?._id?.toString() === propertyId
      );
    }

    if (unitId) {
      documents = documents.filter(
        (doc) => doc.leaseId?.unitId?._id?.toString() === unitId
      );
    }

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

      let isOwner = false;
      let isTenant = false;

      if (userRole === "Propriétaire") {
        const owner = await Owner.findOne({ userId });
        if (owner) {
          isOwner = lease.ownerId.toString() === owner._id.toString();
        }
      } else if (userRole === "Locataire") {
        const tenant = await Tenant.findOne({ userId });
        if (tenant) {
          isTenant = lease.tenantId.toString() === tenant._id.toString();
        }
      }

      // If document is private only owner can access
      if (document.isPrivate && !isOwner) {
        return res
          .status(403)
          .json({ error: "Private document : access denied for tenants" });
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

// Delete document
const deleteLeaseDocument = async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.user._id;
    const role = req.user.role;

    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Verify rights with the role
    let canDelete = false;

    if (role === "Propriétaire") {
      const owner = await Owner.findOne({ userId });
      const lease = await Lease.findById(document.leaseId);
      if (owner && lease && lease.ownerId.toString() === owner._id.toString()) {
        canDelete = true;
      }
    } else if (role === "Locataire") {
      const tenant = await Tenant.findOne({ userId });
      const lease = await Lease.findById(document.leaseId);
      if (
        tenant &&
        lease &&
        lease.tenantId.toString() === tenant._id.toString()
      ) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ error: "Access forbidden" });
    }

    // Delete document on Cloudinary
    const publicId = getCloudinaryPublicId(document.url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    // Delete in database
    await document.deleteOne();

    res.status(200).json({ message: "Document successfully deleted" });
  } catch (error) {
    console.error("deleteLeaseDocument error:", error.message);
    res.status(500).json({ error: "Error while deleting" });
  }
};

// Extract Cloudinary public_id from URL
function getCloudinaryPublicId(url) {
  try {
    const parts = url.split("/");
    const fileWithExtension = parts[parts.length - 1];
    const publicId = fileWithExtension.split(".")[0];
    const folderIndex = parts.findIndex((part) => part === "leases-documents");
    if (folderIndex === -1) return null;
    const folder = parts.slice(folderIndex, parts.length - 1).join("/");
    return `${folder}/${publicId}`;
  } catch {
    return null;
  }
}

module.exports = {
  uploadLeaseDocument,
  getLeaseDocument,
  downloadLeaseDocument,
  deleteLeaseDocument,
};
