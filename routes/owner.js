const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  getOwnerById,
  updateOwner,
  getOwnerByUserId,
} = require("../controllers/ownerController");

router.get("/owner/:id", isAuthenticated, getOwnerById);
router.get("/owner/by-user/:userId", getOwnerByUserId);
router.put("/owner/update", updateOwner);

module.exports = router;
