# バックエンド完全構築ガイド

> **目的:** Node.js + Express で REST API サーバーを0から構築し、認証・製品・注文管理機能を実装する

---

## 📋 目次

1. [概要](#概要)
2. [環境構築](#環境構築)
3. [ディレクトリ構成](#ディレクトリ構成)
4. [アーキテクチャパターン](#アーキテクチャパターン)
5. [基本実装](#基本実装)
6. [製品・カテゴリーAPI](#製品カテゴリーapi)
7. [注文・レビューAPI](#注文レビューapi)
8. [認証システム](#認証システム)
9. [改善機能](#改善機能)
10. [セキュリティ](#セキュリティ)
11. [テスト方法](#テスト方法)
12. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### 最終的なAPI構成

| リソース | エンドポイント | 説明 |
|---------|---------------|------|
| Health | `GET /api/health` | ヘルスチェック |
| Auth | `POST /api/auth/register,login` | 認証 |
| Users | `GET/POST/PUT/DELETE /api/users` | ユーザー管理 |
| Categories | `GET /api/categories` | カテゴリー一覧 |
| Products | `GET/POST/PUT/DELETE /api/products` | 製品管理 |
| Orders | `GET/POST /api/orders` | 注文管理 |
| Reviews | `GET/POST /api/reviews` | レビュー管理 |

### 実装フェーズ

| フェーズ | 内容 | 期間目安 |
|---------|------|---------|
| Phase 1 | 環境構築・基本API（Health, Users） | Week 1 |
| Phase 2 | 製品・カテゴリーAPI | Week 2 |
| Phase 3 | 注文・レビューAPI | Week 3 |
| Phase 4 | 認証システム（JWT） | Week 4 |
| Phase 5 | 改善・セキュリティ強化 | Week 5 |

---

## 環境構築

### 前提条件

- Node.js (LTS) v18以上
- npm または yarn
- MySQL 8.0（Docker推奨）

### プロジェクト初期化

```bash
# backendディレクトリに移動
cd /Users/haytakeda/Sites/RESTAPI/backend

# npm初期化
npm init -y

# 依存パッケージインストール
npm install express dotenv cors morgan mysql2
npm install bcrypt jsonwebtoken
npm install -D nodemon
```

### パッケージの役割

| パッケージ | バージョン | 役割 |
|-----------|----------|------|
| `express` | ^4.18+ | Webフレームワーク |
| `dotenv` | ^16.4+ | 環境変数管理 |
| `cors` | ^2.8+ | CORS設定 |
| `morgan` | ^1.10+ | HTTPログ |
| `mysql2` | ^3.6+ | MySQL接続（Promise対応） |
| `bcrypt` | ^5.1+ | パスワードハッシュ化 |
| `jsonwebtoken` | ^9.0+ | JWT生成・検証 |
| `nodemon` | ^3.0+ | 開発時の自動再起動 |

### 環境変数ファイル

**ファイル:** `backend/.env`

```bash
# データベース設定
DB_HOST=localhost
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db

# JWT設定
JWT_SECRET=your_super_secret_key_change_this_in_production_12345
JWT_EXPIRES_IN=7d

# サーバー設定
PORT=3000
NODE_ENV=development
```

**ファイル:** `backend/.env.example`（Git管理用テンプレート）

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=app_db

JWT_SECRET=
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

### package.json scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

---

## ディレクトリ構成

```
backend/
├── src/
│   ├── app.js                    # Expressアプリ定義
│   ├── server.js                 # サーバー起動
│   ├── config/
│   │   ├── db.js                 # MySQL接続プール
│   │   └── env.js                # 環境変数ヘルパー
│   ├── routes/
│   │   ├── index.js              # ルート統合
│   │   ├── health.js             # ヘルスチェック
│   │   ├── auth.js               # 認証
│   │   ├── users.js              # ユーザー
│   │   ├── products.js           # 製品
│   │   ├── orders.js             # 注文
│   │   └── reviews.js            # レビュー
│   ├── controllers/
│   │   ├── healthController.js
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── reviewController.js
│   ├── services/
│   │   ├── healthService.js
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── productService.js
│   │   ├── orderService.js
│   │   └── reviewService.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── productCategoryModel.js
│   │   ├── productModel.js
│   │   ├── orderModel.js
│   │   └── reviewModel.js
│   ├── middlewares/
│   │   ├── error.js              # エラーハンドリング
│   │   ├── authenticate.js       # JWT認証
│   │   └── authorize.js          # ロールベース認可
│   ├── validators/
│   │   ├── productValidator.js   # 製品バリデーション
│   │   └── authValidator.js      # 認証バリデーション
│   └── utils/
│       └── jwtUtils.js           # JWTユーティリティ
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### 各ディレクトリの役割

| ディレクトリ | 責務 | 例 |
|-------------|------|-----|
| `routes/` | URLマッピングのみ | `GET /api/users` |
| `controllers/` | リクエスト/レスポンス処理 | バリデーション、応答返却 |
| `services/` | ビジネスロジック | 「ユーザーが存在する？」 |
| `models/` | DB操作（SQLのみ） | `SELECT * FROM users` |
| `middlewares/` | 横断処理 | 認証、ログ、エラー |
| `validators/` | 入力検証ルール | 価格は正の数か？ |
| `utils/` | 純粋関数 | JWT生成 |

---

## アーキテクチャパターン

### Model-Service-Controller パターン

```
┌──────────────┐
│   Request    │
└───────┬──────┘
        │
   ┌────▼─────────────────────┐
   │   Routes (Router)         │  HTTPルーティング
   │  GET /api/users           │
   └────┬─────────────────────┘
        │
   ┌────▼──────────────┐
   │   Controllers      │  バリデーション・リクエスト処理
   │  getUsers()        │
   └────┬──────────────┘
        │
   ┌────▼──────────────┐
   │   Services         │  ビジネスロジック
   │  listUsers()       │
   └────┬──────────────┘
        │
   ┌────▼──────────────┐
   │   Models           │  DB操作
   │  findAll()         │
   └────┬──────────────┘
        │
   ┌────▼──────────────┐
   │   Database         │  MySQL
   └────────────────────┘
```

### リクエスト処理フロー

```
1. クライアントがリクエスト送信
   → GET /api/products?category_id=1&min_price=1000

2. routes/products.js がURLをマッチ
   → router.get("/", productController.getProducts)

3. controllers/productController.js がリクエストを受け取り
   → クエリパラメータ取得、バリデーション

4. services/productService.js でビジネスロジック実行
   → フィルタ条件の構築、ページング計算

5. models/productModel.js でSQL実行
   → SELECT * FROM products WHERE ...

6. レスポンスを返却
   → { data: [...], pagination: {...} }
```

---

## 基本実装

### src/config/env.js

```javascript
const getEnv = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value;
};

module.exports = { getEnv };
```

### src/config/db.js

```javascript
const mysql = require("mysql2/promise");
const { getEnv } = require("./env");

const pool = mysql.createPool({
  host: getEnv("DB_HOST", "127.0.0.1"),
  port: Number(getEnv("DB_PORT", "3306")),
  user: getEnv("DB_USER", "app"),
  password: getEnv("DB_PASSWORD", "app_password"),
  database: getEnv("DB_NAME", "app_db"),
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

module.exports = { pool };
```

### src/app.js

```javascript
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
```

### src/server.js

```javascript
require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
```

### src/middlewares/error.js

```javascript
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "エンドポイントが見つかりません",
    },
  });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);
  
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message,
    },
  });
};

module.exports = { notFoundHandler, errorHandler };
```

### src/routes/index.js

```javascript
const express = require("express");

const healthRoutes = require("./health");
const authRoutes = require("./auth");
const userRoutes = require("./users");
const productRoutes = require("./products");
const orderRoutes = require("./orders");
const reviewRoutes = require("./reviews");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);

module.exports = router;
```

### src/routes/health.js

```javascript
const express = require("express");
const { getHealth } = require("../controllers/healthController");

const router = express.Router();

router.get("/", getHealth);

module.exports = router;
```

### src/controllers/healthController.js

```javascript
const { buildHealth } = require("../services/healthService");

const getHealth = (req, res) => {
  const payload = buildHealth();
  res.status(200).json(payload);
};

module.exports = { getHealth };
```

### src/services/healthService.js

```javascript
const buildHealth = () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
};

module.exports = { buildHealth };
```

---

## 製品・カテゴリーAPI

### src/models/productCategoryModel.js

```javascript
const { pool } = require("../config/db");

const findAll = async (options = {}) => {
  const { isActive = true, orderBy = "display_order" } = options;

  let query = "SELECT * FROM product_categories WHERE 1=1";
  const params = [];

  if (isActive !== null) {
    query += " AND is_active = ?";
    params.push(isActive);
  }

  query += ` ORDER BY ${orderBy}`;

  const [rows] = await pool.query(query, params);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM product_categories WHERE id = ?",
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  findAll,
  findById,
};
```

### src/models/productModel.js

```javascript
const { pool } = require("../config/db");

/**
 * 製品一覧取得（フィルタリング・ページング対応）
 */
const findAll = async (filters = {}) => {
  const {
    category_id,
    min_price,
    max_price,
    search,
    is_featured,
    sort = "created_at",
    order = "desc",
    page = 1,
    limit = 20,
  } = filters;

  // 基本クエリ
  let query = `
    SELECT 
      p.id, p.category_id, p.name, p.description, p.price,
      p.stock, p.image_url, p.sku, p.is_featured, p.rating,
      p.reviews_count, p.created_at, p.updated_at,
      pc.name as category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE 1=1
  `;
  const params = [];

  // フィルター適用
  if (category_id) {
    query += " AND p.category_id = ?";
    params.push(category_id);
  }

  if (min_price !== undefined) {
    query += " AND p.price >= ?";
    params.push(min_price);
  }

  if (max_price !== undefined) {
    query += " AND p.price <= ?";
    params.push(max_price);
  }

  if (search) {
    query += " AND MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE)";
    params.push(search);
  }

  if (is_featured !== undefined) {
    query += " AND p.is_featured = ?";
    params.push(is_featured);
  }

  // カウントクエリ
  const countQuery = query.replace(
    /SELECT[\s\S]*?FROM/,
    "SELECT COUNT(*) as total FROM"
  );
  const [countResult] = await pool.query(countQuery, params);
  const total = countResult[0].total;

  // ソートとページング
  const allowedSorts = ["price", "rating", "created_at", "name"];
  const sortColumn = allowedSorts.includes(sort) ? sort : "created_at";
  const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";
  
  query += ` ORDER BY p.${sortColumn} ${sortOrder}`;
  query += " LIMIT ? OFFSET ?";
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(query, params);

  return {
    data: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * 製品詳細取得
 */
const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT 
      p.*, pc.name as category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * 人気製品取得（閲覧数順）
 */
const findPopular = async (limit = 10) => {
  const query = `
    SELECT
      p.id, p.category_id, p.name, p.description, p.price,
      p.stock, p.image_url, p.sku, p.is_featured, p.rating,
      p.reviews_count, p.created_at, p.updated_at,
      COUNT(pv.id) as view_count
    FROM products p
    LEFT JOIN product_views pv ON p.id = pv.product_id
      AND pv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY p.id
    ORDER BY view_count DESC, p.rating DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(query, [limit]);
  return rows;
};

/**
 * 製品作成
 */
const create = async (productData) => {
  const {
    category_id,
    name,
    description,
    price,
    stock,
    image_url,
    sku,
    is_featured,
  } = productData;

  const [result] = await pool.query(
    `INSERT INTO products 
      (category_id, name, description, price, stock, image_url, sku, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [category_id, name, description, price, stock, image_url, sku, is_featured || false]
  );

  return findById(result.insertId);
};

/**
 * 製品閲覧記録
 */
const recordView = async (productId, userId = null, ipAddress = null) => {
  await pool.query(
    `INSERT INTO product_views (product_id, user_id, ip_address) VALUES (?, ?, ?)`,
    [productId, userId, ipAddress]
  );
};

module.exports = {
  findAll,
  findById,
  findPopular,
  create,
  recordView,
};
```

### src/services/productService.js

```javascript
const productModel = require("../models/productModel");
const productCategoryModel = require("../models/productCategoryModel");

/**
 * 製品一覧取得
 */
const listProducts = async (filters) => {
  return await productModel.findAll(filters);
};

/**
 * 製品詳細取得（閲覧記録付き）
 */
const getProductById = async (id, userId = null, ipAddress = null) => {
  const product = await productModel.findById(id);
  
  if (!product) {
    const error = new Error("製品が見つかりません");
    error.status = 404;
    throw error;
  }

  // 閲覧記録（認証済みユーザーのみ記録推奨）
  if (userId) {
    await productModel.recordView(id, userId, ipAddress);
  }

  return product;
};

/**
 * 人気製品取得
 */
const getPopularProducts = async (limit) => {
  return await productModel.findPopular(limit);
};

/**
 * カテゴリー一覧取得
 */
const listCategories = async (options) => {
  return await productCategoryModel.findAll(options);
};

/**
 * 製品作成
 */
const createProduct = async (productData) => {
  // カテゴリー存在確認
  const category = await productCategoryModel.findById(productData.category_id);
  if (!category) {
    const error = new Error("指定されたカテゴリーが存在しません");
    error.status = 400;
    throw error;
  }

  return await productModel.create(productData);
};

module.exports = {
  listProducts,
  getProductById,
  getPopularProducts,
  listCategories,
  createProduct,
};
```

### src/controllers/productController.js

```javascript
const productService = require("../services/productService");

/**
 * 製品一覧取得
 * GET /api/products
 */
const getProducts = async (req, res, next) => {
  try {
    const filters = {
      category_id: req.query.category_id,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      search: req.query.search,
      is_featured: req.query.is_featured === "true" ? true : undefined,
      sort: req.query.sort,
      order: req.query.order,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };

    const result = await productService.listProducts(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * 製品詳細取得
 * GET /api/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip;
    
    const product = await productService.getProductById(
      req.params.id,
      userId,
      ipAddress
    );
    
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * 人気製品取得
 * GET /api/products/popular
 */
const getPopularProducts = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const products = await productService.getPopularProducts(limit);
    
    res.status(200).json({
      data: products,
      count: products.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * カテゴリー一覧取得
 * GET /api/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const options = {
      isActive: req.query.is_active !== "false",
      orderBy: req.query.order_by || "display_order",
    };
    
    const categories = await productService.listCategories(options);
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

/**
 * 製品作成
 * POST /api/products
 */
const createProduct = async (req, res, next) => {
  try {
    const { category_id, name, description, price, stock, image_url, sku, is_featured } = req.body;

    // 基本バリデーション
    if (!category_id || !name || !price || stock === undefined) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "必須項目が不足しています",
          details: { required: ["category_id", "name", "price", "stock"] },
        },
      });
    }

    const product = await productService.createProduct({
      category_id,
      name,
      description,
      price,
      stock,
      image_url,
      sku,
      is_featured,
    });

    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getPopularProducts,
  getCategories,
  createProduct,
};
```

### src/routes/products.js

```javascript
const express = require("express");
const {
  getProducts,
  getProductById,
  getPopularProducts,
  getCategories,
  createProduct,
} = require("../controllers/productController");
const { authenticate, optionalAuth } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");

const router = express.Router();

// カテゴリー
router.get("/categories", getCategories);

// 人気製品（/products/popular は /products/:id より先に定義）
router.get("/popular", getPopularProducts);

// 製品一覧
router.get("/", getProducts);

// 製品詳細（閲覧記録のため認証オプショナル）
router.get("/:id", optionalAuth, getProductById);

// 製品作成（管理者のみ）
router.post("/", authenticate, authorize("admin"), createProduct);

module.exports = router;
```

---

## 注文・レビューAPI

### src/models/orderModel.js

```javascript
const { pool } = require("../config/db");

/**
 * ユーザーの注文一覧取得
 */
const findByUserId = async (userId, options = {}) => {
  const { page = 1, limit = 10 } = options;

  const query = `
    SELECT 
      o.*,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [
    userId,
    Number(limit),
    (Number(page) - 1) * Number(limit),
  ]);

  // 総件数取得
  const [countResult] = await pool.query(
    "SELECT COUNT(*) as total FROM orders WHERE user_id = ?",
    [userId]
  );

  return {
    data: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: countResult[0].total,
      pages: Math.ceil(countResult[0].total / limit),
    },
  };
};

/**
 * 注文詳細取得（アイテム含む）
 */
const findById = async (id) => {
  // 注文情報
  const [orderRows] = await pool.query(
    "SELECT * FROM orders WHERE id = ?",
    [id]
  );
  
  if (orderRows.length === 0) return null;

  // 注文アイテム
  const [itemRows] = await pool.query(
    `SELECT 
      oi.*,
      p.name as product_name,
      p.image_url as product_image
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?`,
    [id]
  );

  return {
    ...orderRows[0],
    items: itemRows,
  };
};

/**
 * 注文作成
 */
const create = async (userId, orderData) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { shipping_address, notes, items } = orderData;

    // 合計金額計算
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.unit_price * item.quantity;
    }

    // 注文作成
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, notes)
       VALUES (?, ?, ?, ?)`,
      [userId, totalAmount, shipping_address, notes]
    );

    const orderId = orderResult.insertId;

    // 注文アイテム作成
    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }

    await connection.commit();
    return findById(orderId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = {
  findByUserId,
  findById,
  create,
};
```

### src/models/reviewModel.js

```javascript
const { pool } = require("../config/db");

/**
 * 製品のレビュー一覧取得
 */
const findByProductId = async (productId, options = {}) => {
  const { page = 1, limit = 10, sort = "created_at" } = options;

  const query = `
    SELECT 
      r.*,
      u.name as user_name
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.${sort} DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [
    productId,
    Number(limit),
    (Number(page) - 1) * Number(limit),
  ]);

  const [countResult] = await pool.query(
    "SELECT COUNT(*) as total FROM reviews WHERE product_id = ?",
    [productId]
  );

  return {
    data: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: countResult[0].total,
      pages: Math.ceil(countResult[0].total / limit),
    },
  };
};

/**
 * レビュー作成
 */
const create = async (reviewData) => {
  const { product_id, user_id, rating, title, comment } = reviewData;

  const [result] = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, title, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [product_id, user_id, rating, title, comment]
  );

  // 製品の平均評価を更新
  await updateProductRating(product_id);

  const [rows] = await pool.query("SELECT * FROM reviews WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
};

/**
 * 製品の平均評価を更新
 */
const updateProductRating = async (productId) => {
  await pool.query(
    `UPDATE products 
     SET rating = (SELECT AVG(rating) FROM reviews WHERE product_id = ?),
         reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
     WHERE id = ?`,
    [productId, productId, productId]
  );
};

module.exports = {
  findByProductId,
  create,
};
```

---

## 認証システム

### src/utils/jwtUtils.js

```javascript
const jwt = require("jsonwebtoken");

/**
 * JWTトークン生成
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * JWTトークン検証
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
```

### src/middlewares/authenticate.js

```javascript
const { verifyToken } = require("../utils/jwtUtils");
const userModel = require("../models/userModel");

/**
 * 認証ミドルウェア（必須）
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "認証が必要です",
        },
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    // ユーザー存在確認
    const user = await userModel.findById(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "無効なユーザーです",
        },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "トークンが無効または期限切れです",
      },
    });
  }
};

/**
 * 認証ミドルウェア（オプショナル）
 * トークンがあれば検証、なければスキップ
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // 認証なしで続行
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await userModel.findById(decoded.userId);
    if (user && user.is_active) {
      req.user = user;
    }
    
    next();
  } catch (err) {
    // トークンエラーは無視してスキップ
    next();
  }
};

module.exports = { authenticate, optionalAuth };
```

### src/middlewares/authorize.js

```javascript
/**
 * ロールベース認可ミドルウェア
 * @param {...string} roles - 許可するロール
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "認証が必要です",
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "この操作を実行する権限がありません",
        },
      });
    }

    next();
  };
};

module.exports = { authorize };
```

### src/services/authService.js

```javascript
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const { generateToken } = require("../utils/jwtUtils");

const SALT_ROUNDS = 10;

/**
 * ユーザー登録
 */
const register = async (name, email, password) => {
  // 既存ユーザー確認
  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    const error = new Error("このメールアドレスは既に登録されています");
    error.status = 400;
    throw error;
  }

  // パスワードハッシュ化
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // ユーザー作成
  const user = await userModel.createWithPassword(name, email, hashedPassword);

  // トークン生成
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

/**
 * ログイン
 */
const login = async (email, password) => {
  // ユーザー検索（パスワード含む）
  const user = await userModel.findByEmailWithPassword(email);
  
  if (!user) {
    const error = new Error("メールアドレスまたはパスワードが正しくありません");
    error.status = 401;
    throw error;
  }

  // アカウント有効確認
  if (!user.is_active) {
    const error = new Error("このアカウントは無効化されています");
    error.status = 401;
    throw error;
  }

  // パスワード検証
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    const error = new Error("メールアドレスまたはパスワードが正しくありません");
    error.status = 401;
    throw error;
  }

  // 最終ログイン日時更新
  await userModel.updateLastLogin(user.id);

  // トークン生成
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

/**
 * 現在のユーザー情報取得
 */
const getMe = async (userId) => {
  const user = await userModel.findById(userId);
  
  if (!user) {
    const error = new Error("ユーザーが見つかりません");
    error.status = 404;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

module.exports = {
  register,
  login,
  getMe,
};
```

### src/controllers/authController.js

```javascript
const authService = require("../services/authService");

/**
 * ユーザー登録
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // バリデーション
    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "name, email, password は必須です",
        },
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "パスワードは8文字以上にしてください",
        },
      });
    }

    const result = await authService.register(name, email, password);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * ログイン
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "email, password は必須です",
        },
      });
    }

    const result = await authService.login(email, password);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * 現在のユーザー情報取得
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({ data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * ログアウト
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  // JWTはステートレスなので、サーバー側では何もしない
  // クライアント側でトークンを削除する
  res.status(200).json({ message: "ログアウトしました" });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
```

### src/routes/auth.js

```javascript
const express = require("express");
const { register, login, getMe, logout } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authenticate");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

module.exports = router;
```

---

## 改善機能

### バリデーションの統一

**ファイル:** `src/validators/productValidator.js`

```javascript
/**
 * 価格バリデーション
 */
const validatePrice = (price) => {
  if (price === undefined || price === null) {
    return { valid: false, error: "価格は必須です" };
  }
  if (typeof price !== "number" || price <= 0) {
    return { valid: false, error: "価格は0より大きい数値で指定してください" };
  }
  if (price > 100000000) {
    return { valid: false, error: "価格は1億円以下にしてください" };
  }
  return { valid: true, error: null };
};

/**
 * 在庫バリデーション
 */
const validateStock = (stock) => {
  if (stock === undefined || stock === null) {
    return { valid: false, error: "在庫数は必須です" };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { valid: false, error: "在庫数は0以上の整数で指定してください" };
  }
  return { valid: true, error: null };
};

/**
 * 価格帯バリデーション
 */
const validatePriceRange = (minPrice, maxPrice) => {
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { valid: false, error: "最小価格は最大価格以下にしてください" };
  }
  return { valid: true, error: null };
};

module.exports = {
  validatePrice,
  validateStock,
  validatePriceRange,
};
```

### エラーレスポンスの統一

すべてのエラーは以下の形式で返す：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `VALIDATION_ERROR` | 400 | バリデーションエラー |
| `UNAUTHORIZED` | 401 | 認証エラー |
| `FORBIDDEN` | 403 | 権限エラー |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `CONFLICT` | 409 | 重複エラー |
| `INTERNAL_ERROR` | 500 | サーバーエラー |

---

## セキュリティ

### 推奨パッケージ

```bash
npm install helmet express-rate-limit
```

### src/app.js への追加

```javascript
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// セキュリティヘッダー
app.use(helmet());

// レート制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 100リクエストまで
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "リクエストが多すぎます。しばらく待ってから再試行してください。",
    },
  },
});
app.use("/api/", limiter);
```

### 認証エンドポイント用レート制限

```javascript
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 5, // 5回まで
  message: {
    error: {
      code: "AUTH_RATE_LIMIT",
      message: "ログイン試行回数が多すぎます。1時間後に再試行してください。",
    },
  },
});

// routes/auth.js で使用
router.post("/login", authLimiter, login);
```

---

## テスト方法

### ヘルスチェック

```bash
curl http://localhost:3000/api/health
```

### 認証

```bash
# 登録
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"テストユーザー","email":"test@example.com","password":"password123"}'

# ログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# 現在のユーザー取得
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 製品API

```bash
# 製品一覧
curl "http://localhost:3000/api/products?page=1&limit=10"

# フィルタリング
curl "http://localhost:3000/api/products?category_id=1&min_price=10000&max_price=100000"

# 製品詳細
curl http://localhost:3000/api/products/1

# 人気製品
curl "http://localhost:3000/api/products/popular?limit=5"

# カテゴリー一覧
curl http://localhost:3000/api/products/categories
```

---

## トラブルシューティング

### DB接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解決策:**
1. MySQLコンテナが起動しているか確認: `docker ps`
2. `.env` の `DB_HOST` を確認
3. Docker Compose 内の場合は `DB_HOST=db` に変更

### JWT エラー

```
JsonWebTokenError: invalid signature
```

**解決策:**
1. `.env` の `JWT_SECRET` が正しいか確認
2. 開発環境と本番環境で同じキーを使用しているか確認

### CORS エラー

```
Access to fetch at '...' has been blocked by CORS policy
```

**解決策:**
`app.js` で CORS を適切に設定：
```javascript
app.use(cors({
  origin: "http://localhost:5173", // Viteのデフォルトポート
  credentials: true,
}));
```

---

## 起動コマンド

```bash
# 開発モード（自動再起動）
npm run dev

# 本番モード
npm start
```

---

**このガイドに従って実装することで、認証・製品管理・注文管理機能を備えた本格的なREST APIを構築できます。**
