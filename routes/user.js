const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  getUserById,
  assignRole,
  uploadAvatar,
  updateUserById,
  deleteUserById,
} = require("../controllers/userController");

// GET
router.get("/user/:id", isAuthenticated, getUserById);
// PUT
router.put("/user/role", isAuthenticated, assignRole);
router.put(
  "/user/avatar",
  isAuthenticated,
  upload.single("avatar"),
  uploadAvatar
);
router.put("/user/:id", isAuthenticated, updateUserById);
// DELETE
router.delete("/user/:id", isAuthenticated, deleteUserById);

module.exports = router;
