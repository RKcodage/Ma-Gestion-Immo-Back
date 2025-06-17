const express = require("express");
const router = express.Router();
// Controllers
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
// Validations
const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../middlewares/validations/authValidation");
const handleValidation = require("../middlewares/handleValidation");

router.post("/user/signup", validateSignup, handleValidation, signup);
router.post("/user/login", validateLogin, handleValidation, login);

// Forget password
router.post(
  "/user/forgot-password",
  validateForgotPassword,
  handleValidation,
  forgotPassword
);
router.post(
  "/user/reset-password",
  validateResetPassword,
  handleValidation,
  resetPassword
);

module.exports = router;
