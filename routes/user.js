const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const { getUserById, assignRole } = require("../controllers/userController");

router.get("/user/:id", isAuthenticated, getUserById);
router.put("/user/role", isAuthenticated, assignRole);

module.exports = router;
