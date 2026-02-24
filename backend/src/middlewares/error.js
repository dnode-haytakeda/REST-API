const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Resource not found",
    },
  });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // MySQL外部キー制約エラー
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(409).json({
      error: {
        code: "FOREIGN_KEY_CONSTRAINT",
        message: "Referenced resource does not exist",
      },
    });
  }

  // MySQL一意制約エラー
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(400).json({
      error: {
        code: "DUPLICATE_ENTRY",
        message: "Duplicate entry",
      },
    });
  }

  // デフォルト
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    },
  });
};

module.exports = { notFoundHandler, errorHandler };
