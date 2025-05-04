const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  createLease,
  getLeasesByOwner,
} = require("../controllers/leaseController");

router.post("/lease", isAuthenticated, createLease);
router.get("/lease/:ownerId", isAuthenticated, getLeasesByOwner);

module.exports = router;
