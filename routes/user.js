const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  getUserById,
  assignRole,
  uploadAvatar,
} = require("../controllers/userController");

router.get("/user/:id", isAuthenticated, getUserById);
router.put("/user/role", isAuthenticated, assignRole);
router.put(
  "/user/avatar",
  isAuthenticated,
  upload.single("avatar"),
  uploadAvatar
);

module.exports = router;
