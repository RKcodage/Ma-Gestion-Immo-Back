const express = require("express");
const router = express.Router();
// Tenant controller
const {
  getTenantByUserId,
  updateTenantByUserId,
} = require("../controllers/tenantController");
// Middleware
const isAuthenticated = require("../middlewares/isAuthenticated");

router.get("tenant/:userId", isAuthenticated, getTenantByUserId);
router.put("tenant/:userId", isAuthenticated, updateTenantByUserId);

module.exports = router;
