const productModel = require("../models/productModel");
const productCategoryModel = require("../models/productCategoryModel");

// 全カテゴリー取得
const listCategories = async (isActive = true) => {
  return await productCategoryModel.findAll(isActive);
};

// 全製品取得(ページング・フィルター付き)
const listProducts = async (filters = {}) => {
  // フィルター検証
  if (
    filters.min_price &&
    filters.max_price &&
    filters.min_price > filters.max_price
  ) {
    throw new Error("min_price cannot be greater than max_price");
  }
  if (filters.page && filters.page < 1) {
    throw new Error("page must be >= 1");
  }
  if (filters.limit && filters.limit < 1) {
    throw new Error("limit must be >= 1");
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

// 製品詳細取得
const getProduct = async (id) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");
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
  // ビジネスロジック検証
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be a positive number");
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("Stock must be non-negative integer");
  }

  // カテゴリーが存在するか確認
  const category = await productCategoryModel.findById(categoryId);
  if (!category) throw new Error("Category not found");

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

  // 価格検証
  if (
    fields.price !== undefined &&
    (fields.price <= 0 || !Number.isFinite(fields.price))
  ) {
    throw new Error("Price must be a positive number");
  }

  // カテゴリー変更時の検証
  if (fields.category_id && fields.category_id !== product.category_id) {
    const category = await productCategoryModel.findById(fields.category_id);
    if (!category) throw new Error("Category not found");
  }

  const affected = await productModel.update(id, fields);
  if (affected === 0) throw new Error("Product not found");

  return { id, ...fields };
};

// 製品削除
const deleteProduct = async (id) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // 注文に含まれているか確認（Phase 3で実装）
  // const hasOrders = await checkOrderItems(id);
  // if (hasOrders) throw new Error("Cannot delete: product in orders");

  const affected = await productModel.deleteById(id);
  return affected > 0;
};

module.exports = {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
