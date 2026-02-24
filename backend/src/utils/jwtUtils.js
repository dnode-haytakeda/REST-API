const jwt = require("jsonwebtoken");

/**
 * JWTトークンを生成
 * @param {Object} payload - トークンに含めるデータ（user.id, user.role等）
 * @returns {String} - JWT文字列
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * JWTトークンを検証
 * @param {String} token - 検証するトークン
 * @returns {Object} - デコードされたペイロード
 * @throws {Error} - トークンが無効な場合
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
