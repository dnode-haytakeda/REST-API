const mysql = require("mysql2/promise");
const { getEnv } = require("./env");

const pool = mysql.createPool({
  host: getEnv("DB_HOST", "127.0.0.1"),
  port: Number(getEnv("DB_PORT", "3306")),
  user: getEnv("DB_USER", "app"),
  password: getEnv("DB_PASSWORD", "app_password"),
  database: getEnv("DB_NAME", "app_db"),
  connectionLimit: 10,
  charset: "utf8mb4",
});

module.exports = { pool };
