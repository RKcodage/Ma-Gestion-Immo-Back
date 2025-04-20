const express = require("express");
const router = express.Router();

const {
  createProperty,
  updatePropertyById,
} = require("../controllers/propertyController");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/property", isAuthenticated, createProperty);
router.put("/property/:id", isAuthenticated, updatePropertyById);

module.exports = router;
