const express = require("express");
const router = express.Router();
const multer = require("multer");
const isAuthenticated = require("../middlewares/isAuthenticated");
const { leaseDocStorage } = require("../config/cloudinary");
const {
  uploadLeaseDocument,
  downloadLeaseDocument,
  getLeaseDocument,
  deleteLeaseDocument,
} = require("../controllers/documentController");

const upload = multer({ storage: leaseDocStorage });

router.post(
  "/document",
  isAuthenticated,
  upload.single("file"),
  uploadLeaseDocument
);
router.get("/documents", isAuthenticated, getLeaseDocument);
router.get("/documents/:id/download", isAuthenticated, downloadLeaseDocument);
router.delete("/document/:id", isAuthenticated, deleteLeaseDocument);

module.exports = router;
