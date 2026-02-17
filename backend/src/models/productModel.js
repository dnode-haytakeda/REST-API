const { pool } = require("../config/db");

// 全製品取得（フィルタリング・ページング対応）
const findAll = async (filters = {}) => {
  let query = `
    SELECT 
      p.id, p.category_id, p.name, p.description, p.price,
      p.stock, p.image_url, p.sku, p.is_featured, p.rating,
      p.reviews_count, p.created_at, p.updated_at
    FROM products p
    WHERE 1=1
  `;
  const params = [];

  // フィルター構築
  if (filters.category_id) {
    query += " AND p.category_id = ?";
    params.push(filters.category_id);
  }
  if (filters.min_price) {
    query += " AND p.price >= ?";
    params.push(filters.min_price);
  }
  if (filters.max_price) {
    query += " AND p.price <= ?";
    params.push(filters.max_price);
  }
  if (filters.is_featured !== undefined) {
    query += " AND p.is_featured = ?";
    params.push(filters.is_featured);
  }
  if (filters.search) {
    query += " AND MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE)";
    params.push(filters.search);
  }

  // ソート
  const sortField =
    {
      price: "p.price",
      rating: "p.rating",
      created_at: "p.created_at",
    }[filters.sort] || "p.created_at";
  const sortOrder = filters.order === "desc" ? "DESC" : "ASC";
  query += ` ORDER BY ${sortField} ${sortOrder}`;

  // ページング
  const page = parseInt(filters.page || 1);
  const limit = Math.min(parseInt(filters.limit || 20), 100);
  const offset = (page - 1) * limit;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

// ページング用の総件数取得
const countAll = async (filters = {}) => {
  let query = "SELECT COUNT(*) as count FROM products WHERE 1=1";
  const params = [];

  if (filters.category_id) {
    query += " AND category_id = ?";
    params.push(filters.category_id);
  }
  if (filters.min_price) {
    query += " AND price >= ?";
    params.push(filters.min_price);
  }
  if (filters.max_price) {
    query += " AND price <= ?";
    params.push(filters.max_price);
  }
  if (filters.search) {
    query += " AND MATCH(name, description) AGAINST(? IN BOOLEAN MODE)";
    params.push(filters.search);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

// IDで製品取得（関連データ含む）
const findById = async (id) => {
  const [productRows] = await pool.query(
    `
    SELECT 
      p.id, p.category_id, p.name, p.description, p.price,
      p.stock, p.image_url, p.sku, p.is_featured, p.rating,
      p.reviews_count, p.created_at, p.updated_at,
      pc.name as category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.id = ?
    `,
    [id],
  );

  if (!productRows.length) return null;

  const product = productRows[0];

  // 同カテゴリーの関連製品（最大3件）
  const [relatedRows] = await pool.query(
    `
    SELECT id, name, price, image_url, rating
    FROM products
    WHERE category_id = ? AND id != ?
    LIMIT 3
    `,
    [product.category_id, id],
  );

  product.similar_products = relatedRows;
  return product;
};

// 製品作成
const create = async (
  categoryId,
  name,
  description,
  price,
  stock,
  sku,
  imageUrl,
  isFeatured = false,
) => {
  const [result] = await pool.query(
    `
    INSERT INTO products (category_id, name, description, price, stock, sku, image_url, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [categoryId, name, description, price, stock, sku, imageUrl, isFeatured],
  );
  return result.insertId;
};

// 製品更新
const update = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return 0;

  const values = Object.values(fields);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const [result] = await pool.query(
    `UPDATE products SET ${setClause} WHERE id = ?`,
    [...values, id],
  );
  return result.affectedRows;
};

// 製品削除（外部キー制約をチェック）
const deleteById = async (id) => {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows;
};

module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  deleteById,
};