const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  createLease,
  getLeasesByOwner,
  getLeasesByRole,
  updateLease,
  deleteLease,
  getUpcomingPayments,
  getPaymentsHistoric,
} = require("../controllers/leaseController");

router.post("/lease", isAuthenticated, createLease);
router.get("/lease/:ownerId", isAuthenticated, getLeasesByOwner);
router.get("/leases", isAuthenticated, getLeasesByRole);
router.get("/leases/upcoming-payments", isAuthenticated, getUpcomingPayments);
router.get("/leases/historic", isAuthenticated, getPaymentsHistoric);
router.put("/lease/:leaseId", updateLease);
router.delete("/lease/:leaseId", deleteLease);

module.exports = router;
