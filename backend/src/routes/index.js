const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/users", userRoutes);

module.exports = router;
