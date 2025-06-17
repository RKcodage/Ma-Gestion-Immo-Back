const { body } = require("express-validator");

// Regex password
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?{}[\]~]).{8,}$/;

const validateSignup = [
  body("email").isEmail().withMessage("Email invalide"),

  body("password")
    .matches(passwordRegex)
    .withMessage(
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial"
    ),

  body("profile.firstName").notEmpty().withMessage("Le prénom est requis"),

  body("profile.lastName").notEmpty().withMessage("Le nom est requis"),

  body("profile.username")
    .optional()
    .isLength({ min: 2 })
    .withMessage("Le nom d'utilisateur doit contenir au moins 2 caractères"),

  body("profile.phone")
    .optional()
    .isMobilePhone("fr-FR")
    .withMessage("Numéro de téléphone invalide"),
];

const validateLogin = [
  body("email").isEmail().withMessage("Email invalide"),

  body("password").notEmpty().withMessage("Le mot de passe est requis"),
];

const validateForgotPassword = [
  body("email").isEmail().withMessage("Email invalide"),
];

const validateResetPassword = [
  body("token").notEmpty().withMessage("Le token est requis"),

  body("newPassword")
    .matches(passwordRegex)
    .withMessage(
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial"
    ),
];

module.exports = {
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
};
