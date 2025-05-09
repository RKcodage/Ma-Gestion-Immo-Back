const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

router.post("/user/signup", signup);
router.post("/user/login", login);

// Forget password
router.post("/user/forgot-password", forgotPassword);
router.post("/user/reset-password", resetPassword);

module.exports = router;
