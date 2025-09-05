const express = require("express");
const router = express.Router();
// Middlewares
const isAuthenticated = require("../middlewares/isAuthenticated");
const { ensureRole } = require("../middlewares/verifyRole");
// Controllers
const {
  createLease,
  getLeasesByOwner,
  getLeasesByRole,
  updateLease,
  deleteLease,
  getUpcomingPayments,
  getPaymentsHistoric,
} = require("../controllers/leaseController");

// CREATE lease
router.post("/lease", isAuthenticated, ensureRole("Propriétaire"), createLease);
// GET lease by ownerId
router.get("/lease/:ownerId", isAuthenticated, getLeasesByOwner);
// GET leases by role
router.get("/leases", isAuthenticated, getLeasesByRole);
// GET leases upcoming payments
router.get("/leases/upcoming-payments", isAuthenticated, getUpcomingPayments);
// GET leases historic
router.get("/leases/historic", isAuthenticated, getPaymentsHistoric);
// UPDATE lease
router.put(
  "/lease/:leaseId",
  isAuthenticated,
  ensureRole("Propriétaire"),
  updateLease
);
// DELETE lease
router.delete(
  "/lease/:leaseId",
  isAuthenticated,
  ensureRole("Propriétaire"),
  deleteLease
);

module.exports = router;
