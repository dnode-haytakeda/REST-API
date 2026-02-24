const express = require("express");
const {
  getUsers,
  getUser,
  postUser,
  putUser,
  patchUserHandler,
  deleteUser,
} = require("../controllers/userController");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

const router = express.Router();

// 全てのルートに認証 + 管理者権限を要求
router.use(authenticate);
router.use(authorize("admin"));

router.get("/", getUsers);
router.get("/:id", getUser);
router.post("/", postUser);
router.put("/:id", putUser);
router.patch("/:id", patchUserHandler);
router.delete("/:id", deleteUser);

module.exports = router;
