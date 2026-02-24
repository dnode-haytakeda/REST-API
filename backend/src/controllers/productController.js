const {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../services/productService");

// カテゴリー一覧
const getCategories = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const categories = await listCategories(
      is_active === "false" ? false : true,
    );
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

// 製品一覧(フィルター・ページング)
const getProducts = async (req, res, next) => {
  try {
    const filters = {
      category_id: req.query.category_id
        ? parseInt(req.query.category_id)
        : undefined,
      min_price: req.query.min_price
        ? parseFloat(req.query.min_price)
        : undefined,
      max_price: req.query.max_price
        ? parseFloat(req.query.max_price)
        : undefined,
      is_featured: req.query.is_featured === "true" ? true : undefined,
      search: req.query.search,
      sort: req.query.sort,
      order: req.query.order,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await listProducts(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// 製品情報
const getProductDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const product = await getProduct(id);
    res.status(200).json(product);
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ message: "Product not found" });
    }
    next(err);
  }
};

// 製品作成
const postProduct = async (req, res, next) => {
  try {
    const { category_id, name, description, price, stock, sku, image_url } =
      req.body;

    // 入力バリデーション
    if (!category_id || !name || !price || stock === undefined) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          details: {
            category_id: !category_id ? "required" : undefined,
            name: !name ? "required" : undefined,
            price: !price ? "required" : undefined,
            stock: stock === undefined ? "required" : undefined,
          },
        },
      });
    }

    const product = await createProduct(
      category_id,
      name,
      description,
      price,
      stock,
      sku,
      image_url,
    );
    res.status(201).json(product);
  } catch (err) {
    if (err.message.includes("Category not found")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

// 製品更新
const putProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const fields = {};

    // 更新フィールドを収集
    if (req.body.name !== undefined) fields.name = req.body.name;
    if (req.body.description !== undefined)
      fields.description = req.body.description;
    if (req.body.price !== undefined) fields.price = req.body.price;
    if (req.body.stock !== undefined) fields.stock = req.body.stock;
    if (req.body.image_url !== undefined) fields.image_url = req.body.image_url;
    if (req.body.is_featured !== undefined)
      fields.is_featured = req.body.is_featured;

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields to update " });
    }

    const product = await updateProduct(id, fields);
    res.status(200).json(product);
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ error: "Product not found" });
    }
    next(err);
  }
};

// 製品削除
const deleteProductHandler = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    await deleteProduct(id);
    res.status(204).send();
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ error: "Product not found" });
    }
    next(err);
  }
};

module.exports = {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
};
