const express = require("express");
const router = express.Router();

const {
  createProperty,
  updatePropertyById,
  getPropertyById,
  getPropertiesByOwner,
} = require("../controllers/propertyController");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/property", isAuthenticated, createProperty);
router.get("/property/:id", isAuthenticated, getPropertyById);
router.get("/owner/:ownerId/properties", isAuthenticated, getPropertiesByOwner);
router.put("/property/:id", isAuthenticated, updatePropertyById);

module.exports = router;
