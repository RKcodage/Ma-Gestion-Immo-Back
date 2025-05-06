const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  createLease,
  getLeasesByOwner,
  getLeasesByRole,
  updateLease,
  deleteLease,
} = require("../controllers/leaseController");

router.post("/lease", isAuthenticated, createLease);
router.get("/lease/:ownerId", isAuthenticated, getLeasesByOwner);
router.get("/leases", isAuthenticated, getLeasesByRole);
router.put("/lease/:leaseId", updateLease);
router.delete("/lease/:leaseId", deleteLease);

module.exports = router;
