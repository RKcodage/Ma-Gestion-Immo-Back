const express = require("express");
const router = express.Router();
const multer = require("multer");
const isAuthenticated = require("../middlewares/isAuthenticated");
const { leaseDocStorage } = require("../config/cloudinary");
const { uploadLeaseDocument } = require("../controllers/documentController");

const upload = multer({ storage: leaseDocStorage });

router.post(
  "/document",
  isAuthenticated,
  upload.single("file"),
  uploadLeaseDocument
);

module.exports = router;
