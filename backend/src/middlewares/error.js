const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Resource not found",
    },
  });
};

/**
 * グローバルエラーハンドリングミドルウェア（拡張版）
 *
 * 全てのエラーを統一されたJSON形式で返す
 */
const errorHandler = (err, req, res, next) => {
  // デフォルトは500エラー
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "サーバーエラーが発生しました";
  let details = err.details || null;

  // 特定のエラーメッセージから適切なステータスコードを判定
  if (message.includes("not found") || message.includes("見つかりません")) {
    statusCode = 404;
    errorCode = "NOT_FOUND";
  } else if (
    message.includes("必須") ||
    message.includes("invalid") ||
    message.includes("0以上") ||
    message.includes("範囲") ||
    message.includes("不正な") ||
    message.includes("許可値")
  ) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
  }

  // 本番環境ではスタックトレースを非表示
  const response = {
    error: {
      code: errorCode,
      message: message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  // 開発環境ではスタックトレースを含める
  if (process.env.NODE_ENV === "development") {
    response.error.stack = err.stack;
  }

  // ログ出力
  console.error(`[${errorCode}] ${message}`);
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  res.status(statusCode).json(response);
};

module.exports = { notFoundHandler, errorHandler };
