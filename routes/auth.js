const express = require("express");
const router = express.Router();
// Controllers
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
} = require("../controllers/authController");
// Limiters
const { loginLimiter } = require("../config/rateLimiters");
// Validations
const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../middlewares/validations/authValidation");
const handleValidation = require("../middlewares/handleValidation");

// Auth
router.post("/user/signup", validateSignup, handleValidation, signup);
router.post(
  "/user/login",
  loginLimiter,
  validateLogin,
  handleValidation,
  login
);

// Forget password
router.post(
  "/user/forgot-password",
  validateForgotPassword,
  handleValidation,
  forgotPassword
);

// Reset password
router.post(
  "/user/reset-password",
  validateResetPassword,
  handleValidation,
  resetPassword
);

// Google login
router.post("/user/login/google", loginLimiter, googleAuth);

module.exports = router;
