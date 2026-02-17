const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");
const productRoutes = require("./products");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);

module.exports = router;
