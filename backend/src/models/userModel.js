const { pool } = require("../config/db");

const findAll = async () => {
  const [rows] = await pool.query(
    "SELECT id, name, email, created_at FROM users",
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

const create = async (name, email) => {
  const [result] = await pool.query(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [name, email],
  );
  return result.insertId;
};

const update = async (id, name, email) => {
  const [result] = await pool.query(
    "UPDATE users SET name = ?, email = ? WHERE id = ?",
    [name, email, id],
  );
  return result.affectedRows;
};

const partialUpdate = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const [result] = await pool.query(
    `UPDATE users SET ${setClause} WHERE id = ?`,
    [...values, id],
  );
  return result.affectedRows;
};

const deleteById = async (id) => {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  partialUpdate,
  deleteById,
};
