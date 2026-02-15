const express = require("express");
const {
  getUsers,
  getUser,
  postUser,
  putUser,
  patchUserHandler,
  deleteUser,
} = require("../controllers/userController");

const router = express.Router();

router.get("/", getUsers);
router.get("/:id", getUser);
router.post("/", postUser);
router.put("/:id", putUser);
router.patch("/:id", patchUserHandler);
router.delete("/:id", deleteUser)

module.exports = router;
