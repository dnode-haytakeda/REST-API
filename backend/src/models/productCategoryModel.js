const { pool } = require("../config/db");

// 全カテゴリー取得(active フィルター付き)
const findAll = async (isActive = true) => {
  const [rows] = await pool.query(
    "SELECT * FROM product_categories WHERE is_active = ? ORDER BY display_order ASC",
    [isActive],
  );
  return rows;
};

// IDカテゴリー取得
const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM product_categories WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

// カテゴリー作成
const create = async (name, description, iconUrl, displayOrder = 0) => {
  const [result] = await pool.query(
    "INSERT INTO product_categories (name, description, icon_url, display_order) VALUES (?, ?, ?, ?)",
    [name, description, iconUrl, displayOrder],
  );
  return result.insertId;
};

// ID:カテゴリー更新
const update = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const [result] = await pool.query(
    `UPDATE product_categories SET ${setClause} WHERE id = ?`,
    [...values, id],
  );
};

// IDでカテゴリー削除
const deleteById = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM product_categories WHERE id = ?",
    [id],
  );
  return result.affectedRows;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  deleteById,
};
