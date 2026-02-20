const { verifyToken } = require("../utils/iwtUtils");
const { pool } = require("../config/db");

/**
 * 認証ミドルウェア
 * リクエストヘッダからJWTを取得・検証し、req.userに情報を追加
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. ヘッダーからトークン取得
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
          code: "NO_TOKEN",
        },
      });
    }

    // 2. "Bearer TOKEN" から TOKEN 部分を抽出
    const token = authHeader.substring(7);

    // 3. トークン検証
    const decoded = verifyToken(token);

    // 4. DBからユーザー情報を取得（最新のis_active状態を確認）
    const [rows] = await pool.query(
      "SELECT id, name, email, role, is_active FROM users WHERE id = ?",
      [decoded.userId],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: "User not found",
          code: "USER_NOT_FOUND",
        },
      });
    }

    const user = rows[0];

    // 5. アカウント有効性チェック
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Account is disabled",
          code: "ACCOUNT_DISABLED",
        },
      });
    }

    // 6. req.user にユーザー情報を追加（次のミドルウェア・コントローラーで使用可能）
    req.user = user;

    next();
  } catch (err) {
    console.error("Authentication error:", err);

    return res.status(401).json({
      success: false,
      error: {
        message: err.message || "Invalid token",
        code: "INVALID_TOKEN",
      },
    });
  }
};

/**
 * 役割確認のミドルウェア
 * 特定の役割（admin等）のみアクセス可能にする
 * @param {...String} allowedRoles - 許可する役割('admin', 'user'等)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // authenticate ミドルウェアの後に呼ばれることが前提
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    // ユーザーの役割が許可リストにあるか確認
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Access denied. Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
