const { pool } = require("../config/db");

const findAll = async () => {
  const [rows] = await pool.query(
    "SELECT id, name, email, created_at FROM users",
  );
  return rows;
};

module.exports = { findAll };
