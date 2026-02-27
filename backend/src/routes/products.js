const express = require("express");
const { authenticate } = require("../middlewares/authMiddleware");
const {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
  getPopularProductsHandler,
} = require("../controllers/productController");

const router = express.Router();

// カテゴリーエンドポイント
router.get("/categories", getCategories);

// 人気製品エンドポイント（/products/:idより前に配置）
router.get("/popular", getPopularProductsHandler);

// 製品エンドポイント
router.get("/", getProducts);
router.post("/", postProduct);
router.get("/:id", authenticate, getProductDetail);
router.put("/:id", putProduct);
router.delete("/:id", deleteProductHandler);

module.exports = router;
