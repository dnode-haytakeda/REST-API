const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const apiRoutes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error");

const app = express();

// 基本ミドルウェア
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ルーティング
app.use("/api", apiRoutes);

// エラーハンドリング
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
