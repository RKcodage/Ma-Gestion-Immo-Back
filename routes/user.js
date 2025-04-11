const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const { getUserById } = require("../controllers/userController");

router.get("/user/:id", isAuthenticated, getUserById);

module.exports = router;
