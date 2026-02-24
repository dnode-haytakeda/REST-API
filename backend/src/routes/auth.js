const express = require("express");
const {
  register,
  login,
  getCurrentUser,
  logout,
} = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

// 公開エンドポイント（認証不要）
router.post("/register", register);
router.post("/login", login);

// 保護されたエンドポイント（認証必要）
router.get("/me", authenticate, getCurrentUser);
router.post("/logout", authenticate, logout);

module.exports = router;
