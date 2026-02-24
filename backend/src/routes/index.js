const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");
const productRoutes = require("./products");
const authRoutes = require("./auth");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);

module.exports = router;
