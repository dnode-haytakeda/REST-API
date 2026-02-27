const { validateProductListQuery } = require("../validators/queryValidator");

/**
 * 製品一覧クエリパラメータのバリデーションミドルウェア
 *
 * 役割:
 * 1. req.query のパラメータをバリデーション
 * 2. バリデーション済みの値を req.validatedQuery に格納
 * 3. エラーがあれば 400 Bad Request を返す
 *
 * これにより、コントローラー以降は req.validatedQuery を使うだけで安全
 */
const validateProductQuery = (req, res, next) => {
  const result = validateProductListQuery(req.query);
  if (!result.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_QUERY_PARAMETER",
        message: "クエリパラメータが不正です",
        details: result.errors,
      },
    });
  }

  // バリデーション済みの安全な値を req に追加
  req.validateQuery = result.sanitized;
  next();
};

module.exports = { validateProductQuery };
