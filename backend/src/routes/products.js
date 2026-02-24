const express = require("express");
const {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
} = require("../controllers/productController");

const router = express.Router();

// カテゴリーエンドポイント
router.get("/categories", getCategories);

// 製品エンドポイント
router.get("/", getProducts);
router.post("/", postProduct);
router.get("/:id", getProductDetail);
router.put("/:id", putProduct);
router.delete("/:id", deleteProductHandler);

module.exports = router;
