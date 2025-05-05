const express = require("express");
const router = express.Router();
const {
  createUnit,
  getUnitsByProperty,
  updateUnitById,
  deleteUnitById,
} = require("../controllers/unitController");
// middlewares
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/unit", isAuthenticated, createUnit);
router.get("/property/:propertyId/units", isAuthenticated, getUnitsByProperty);
router.put("/unit/:unitId", isAuthenticated, updateUnitById);
router.delete("/unit/:unitId", isAuthenticated, deleteUnitById);

module.exports = router;
