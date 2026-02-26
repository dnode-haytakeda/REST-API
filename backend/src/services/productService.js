const productModel = require("../models/productModel");
const productCategoryModel = require("../models/productCategoryModel");
const {
  validatePrice,
  validateStock,
  validateProductName,
  validatePriceRange,
  validateCategoryId,
  validateSKU,
} = require("../validators/productValidator");

// 全カテゴリー取得（既存のまま）
const listCategories = async (isActive = true) => {
  return await productCategoryModel.findAll(isActive);
};

// 全製品取得(ページング・フィルター付き)
const listProducts = async (filters = {}) => {
  // ↓↓↓ 修正: バリデーターを使用
  const priceValidation = validatePriceRange(
    filters.min_price,
    filters.max_price,
  );
  if (!priceValidation.valid) {
    throw new Error(priceValidation.error);
  }

  // ページング検証
  if (filters.page && filters.page < 1) {
    throw new Error("ページ番号は1以上で指定してください");
  }
  if (filters.limit && filters.limit < 1) {
    throw new Error("取得件数は1以上で指定してください");
  }

  const products = await productModel.findAll(filters);
  const total = await productModel.countAll(filters);

  const page = parseInt(filters.page || 1);
  const limit = Math.min(parseInt(filters.limit || 20), 100);
  const pages = Math.ceil(total / limit);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
};

// 製品詳細取得時に閲覧を記録
const getProduct = async (id, userId = null, ipAddress = null) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // 閲覧を記録（エラーが起きても製品は返す）
  try {
    await productModel.recordView(id, userId, ipAddress);
  } catch (err) {
    console.error("Failed to record view:", err);
    // エラーは無視して製品を返す
  }

  return product;
};

// 製品作成
const createProduct = async (
  categoryId,
  name,
  description,
  price,
  stock,
  sku,
  imageUrl,
) => {
  // ↓↓↓ 修正: バリデーターを使用
  const categoryValidation = validateCategoryId(categoryId);
  if (!categoryValidation.valid) throw new Error(categoryValidation.error);

  const nameValidation = validateProductName(name);
  if (!nameValidation.valid) throw new Error(nameValidation.error);

  const priceValidation = validatePrice(price);
  if (!priceValidation.valid) throw new Error(priceValidation.error);

  const stockValidation = validateStock(stock);
  if (!stockValidation.valid) throw new Error(stockValidation.error);

  const skuValidation = validateSKU(sku);
  if (!skuValidation.valid) throw new Error(skuValidation.error);

  // カテゴリーが存在するか確認
  const category = await productCategoryModel.findById(categoryId);
  if (!category) throw new Error("指定されたカテゴリーが見つかりません");
  if (!category.is_active) throw new Error("無効なカテゴリーは使用できません");

  const id = await productModel.create(
    categoryId,
    name,
    description,
    price,
    stock,
    sku,
    imageUrl,
  );
  return { id, categoryId, name, description, price, stock, sku, imageUrl };
};

// 製品更新
const updateProduct = async (id, fields) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // ↓↓↓ 修正: バリデーターを使用
  if (fields.price !== undefined) {
    const priceValidation = validatePrice(fields.price);
    if (!priceValidation.valid) throw new Error(priceValidation.error);
  }

  if (fields.stock !== undefined) {
    const stockValidation = validateStock(fields.stock);
    if (!stockValidation.valid) throw new Error(stockValidation.error);
  }

  if (fields.name !== undefined) {
    const nameValidation = validateProductName(fields.name);
    if (!nameValidation.valid) throw new Error(nameValidation.error);
  }

  if (fields.sku !== undefined) {
    const skuValidation = validateSKU(fields.sku);
    if (!skuValidation.valid) throw new Error(skuValidation.error);
  }

  // カテゴリー変更時の検証
  if (fields.category_id && fields.category_id !== product.category_id) {
    const categoryValidation = validateCategoryId(fields.category_id);
    if (!categoryValidation.valid) throw new Error(categoryValidation.error);

    const category = await productCategoryModel.findById(fields.category_id);
    if (!category) throw new Error("指定されたカテゴリーが見つかりません");
    if (!category.is_active)
      throw new Error("無効なカテゴリーは使用できません");
  }

  const affected = await productModel.update(id, fields);
  if (affected === 0) throw new Error("Product not found");

  return { id, ...fields };
};

// 製品削除（既存のまま）
const deleteProduct = async (id) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  const affected = await productModel.deleteById(id);
  return affected > 0;
};

// 人気商品取得
const getPopularProducts = async (limit = 10) => {
  if (limit < 1 || limit > 100) {
    throw new Error("取得件数は1~100の範囲で指定してください");
  }
  return await productModel.findPopular(limit);
};

module.exports = {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPopularProducts,
};
