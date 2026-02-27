# プロフェッショナルなREST APIアプリケーション開発ガイド

## フェーズ1-3: バックエンド完全実装ガイド

---

## 概要

このガイドは、既存の簡単なユーザー管理APIを、**注文管理・レビュー機能を備えた本格的なEコマースAPI**へ完全実装するためのバックエンド開発ガイドです。

### 学習目標

- ✅ Phase 1: ユーザー管理API（既存）
- ✅ Phase 2: 製品・カテゴリーAPIの実装
- ✅ Phase 3: 注文・レビューAPIの実装
- ✅ リレーション（FK）に基づく複雑なクエリ処理
- ✅ ページング・フィルタリング機能
- ✅ ビジネスロジック層（Services）の設計
- ✅ エラーハンドリングの標準化

### 実装順序

```
Phase 1: ユーザー管理 (Week 1) ✅ 完了
   ↓
Phase 2: 製品・カテゴリー管理 (Week 2)
   ├── productCategoryModel.js
   ├── productModel.js
   ├── productService.js
   ├── productController.js
   └── products ルート
   ↓
Phase 3: 注文・レビュー管理 (Week 3)
   ├── orderModel.js
   ├── orderService.js
   ├── orderController.js
   ├── reviewModel.js
   ├── reviewService.js
   └── reviewController.js
```

---

## 作成するファイル一覧

### 📁 ファイル構成（Phase 2 + Phase 3）

```
backend/src/
├── models/
│   ├── userModel.js                  ← Phase 1（完了）
│   ├── productCategoryModel.js        ← ★ Phase 2 で作成
│   ├── productModel.js               ← ★ Phase 2 で作成
│   ├── orderModel.js                 ← ★★ Phase 3 で作成
│   ├── reviewModel.js                ← ★★ Phase 3 で作成
│   └── ...
├── services/
│   ├── userService.js                ← Phase 1（完了）
│   ├── productService.js             ← ★ Phase 2 で作成
│   ├── orderService.js               ← ★★ Phase 3 で作成
│   ├── reviewService.js              ← ★★ Phase 3 で作成
│   └── ...
├── controllers/
│   ├── userController.js             ← Phase 1（完了）
│   ├── productController.js          ← ★ Phase 2 で作成
│   ├── orderController.js            ← ★★ Phase 3 で作成
│   ├── reviewController.js           ← ★★ Phase 3 で作成
│   └── ...
├── routes/
│   ├── index.js                      ← 既存（更新：products, orders, reviews ルート追加）
│   ├── products.js                   ← ★ Phase 2 で作成
│   ├── orders.js                     ← ★★ Phase 3 で作成
│   ├── reviews.js                    ← ★★ Phase 3 で作成
│   └── ...
└── ...
```

### 実装順序（推奨）

#### Phase 2: 製品・カテゴリー API

| 順番 | ファイル                  | 保存先パス                                     | 説明                |
| ---- | ------------------------- | ---------------------------------------------- | ------------------- |
| 1️⃣   | `productCategoryModel.js` | `backend/src/models/productCategoryModel.js`   | カテゴリーDB操作    |
| 2️⃣   | `productModel.js`         | `backend/src/models/productModel.js`           | 製品DB操作          |
| 3️⃣   | `productService.js`       | `backend/src/services/productService.js`       | ビジネスロジック    |
| 4️⃣   | `productController.js`    | `backend/src/controllers/productController.js` | HTTPリクエスト処理  |
| 5️⃣   | `products.js`             | `backend/src/routes/products.js`               | エンドポイント定義  |
| 6️⃣   | `routes/index.js`         | `backend/src/routes/index.js`                  | products ルート統合 |

#### Phase 3: 注文・レビュー API

| 順番 | ファイル                                                      | 保存先パス                                   | 説明                    |
| ---- | ------------------------------------------------------------- | -------------------------------------------- | ----------------------- |
| 7️⃣   | `orderModel.js`                                               | `backend/src/models/orderModel.js`           | 注文DB操作              |
| 8️⃣   | `orderService.js`                                             | `backend/src/services/orderService.js`       | 注文ビジネスロジック    |
| 9️⃣   | `orderController.js`                                          | `backend/src/controllers/orderController.js` | 注文HTTPリクエスト処理  |
| 🔟   | `orders.js`                                                   | `backend/src/routes/orders.js`               | 注文エンドポイント      |
| 1️⃣1️⃣ | `reviewModel.js` + `reviewService.js` + `reviewController.js` | `backend/src/models/reviews...`              | レビュー実装            |
| 1️⃣2️⃣ | `reviews.js`                                                  | `backend/src/routes/reviews.js`              | レビュー エンドポイント |

---

## 現在のバックエンド構造

### ディレクトリツリー

```
backend/
├── src/
│   ├── app.js                          ← Express アプリケーションメイン
│   ├── server.js                       ← サーバー起動
│   ├── config/
│   │   ├── db.js                       ← MySQL接続プール
│   │   └── env.js                      ← 環境変数読み込み
│   ├── controllers/
│   │   ├── healthController.js
│   │   └── userController.js
│   ├── models/
│   │   └── userModel.js                ← DB問い合わせロジック
│   ├── services/
│   │   ├── healthService.js
│   │   └── userService.js              ← ビジネスロジック
│   ├── routes/
│   │   ├── index.js                    ← ルート定義（エントリーポイント）
│   │   ├── health.js
│   │   └── users.js
│   ├── middlewares/
│   │   └── error.js                    ← エラーハンドリング
│   └── validators/
│       └── exampleValidator.js
├── package.json
└── README.md
```

### 現在の実装パターン

**リクエスト処理フロー:**

```
Request
   ↓
routes/users.js (GET /api/users)
   ↓
controllers/userController.js (getUsers())
   ↓
services/userService.js (listUsers())
   ↓
models/userModel.js (findAll())
   ↓
Database
```

**各層の責務:**

| 層          | 役割                               | 例                           |
| ----------- | ---------------------------------- | ---------------------------- |
| Routes      | HTTPメソッド・パスの定義           | GET /api/users               |
| Controllers | リクエスト受け取り、バリデーション | `if (!name) res.status(400)` |
| Services    | ビジネスロジック実装               | 「ユーザーが既に存在？」     |
| Models      | DB操作（SQL実行）                  | `SELECT * FROM users`        |

---

## アーキテクチャパターン

### MVC（Model-View-Controller）

当プロジェクトは **Model-Service-Controller** パターンを採用：

```
┌──────────────┐
│   Request    │
└───────┬──────┘
        │
   ┌────▼─────────────────────┐
   │   Routes (Router)         │  HTTPルーティング
   │  GET /api/users           │
   └────┬────────────────────┬┘
        │                    │
   ┌────▼──────────────┐    │
   │   Controllers      │    │  バリデーション
   │  getUsers()        │    │  リクエスト処理
   └────┬──────────────┘    │
        │                    │
   ┌────▼──────────────┐    │
   │   Services         │    │  ビジネスロジック
   │  listUsers()       │    │  「どのユーザーが見られる？」
   └────┬──────────────┘    │
        │                    │
   ┌────▼──────────────┐    │
   │   Models           │    │  DB操作
   │  findAll()         │    │  SELECT実行
   └────┬──────────────┘    │
        │                    │
   ┌────▼──────────────┐    │
   │   Database         │    │  MySQLサーバー
   │ (MySQL 8.0)        │    │
   └────────────────────┘    │
                              │
         ┌────────────────────┘
         │
    ┌────▼──────────────┐
    │Response (JSON)     │
    │ { users: [...] }   │
    └────────────────────┘
```

### 設計原則

**関心の分離（Separation of Concerns）:**

- **Routes**: 「URLマッピングだけ」
- **Controllers**: 「入力チェックと応答返却」
- **Services**: 「複雑なビジネスロジック」
- **Models**: 「CRUDだけ」

**メリット:**

- ✅ テストしやすい（各層を独立してテスト可能）
- ✅ 保守しやすい（変更の影響が局所的）
- ✅ 再利用しやすい（Serviceは複数ControllerやルートJobから使用可能）

---

## APIエンドポイント設計

### RESTful API設計原則

**リソース指向設計:**

```
リソース: Users, Products, Orders, Reviews
操作: Create, Read, Update, Delete (CRUD)

パターン:
GET    /api/{resource}           → 一覧取得
POST   /api/{resource}           → 作成
GET    /api/{resource}/{id}      → 詳細取得
PUT    /api/{resource}/{id}      → 全置き換え
PATCH  /api/{resource}/{id}      → 部分更新
DELETE /api/{resource}/{id}      → 削除
```

### 製品エンドポイント仕様

**8個のエンドポイント（Phase 2）:**

#### 1. 製品カテゴリー一覧

```
GET /api/categories

请求:
  Query:
    - is_active: boolean (optional, default: true)
    - order_by: 'name' | 'display_order' (optional, default: 'display_order')

応答 (200 OK):
[
  {
    "id": 1,
    "name": "エレクトロニクス",
    "description": "スマートフォン...",
    "display_order": 1,
    "is_active": true,
    "created_at": "2026-02-16T10:00:00.000Z"
  },
  ...
]
```

#### 2. 製品一覧（フィルタリング・ページング対応）

```
GET /api/products

Query Parameters:
  - category_id: number (optional, e.g., ?category_id=1)
  - min_price: number (optional, e.g., ?min_price=10000)
  - max_price: number (optional, e.g., ?max_price=200000)
  - search: string (optional, e.g., ?search=iphone)
  - is_featured: boolean (optional, ?is_featured=true)
  - sort: 'price' | 'rating' | 'created_at' (optional, default: 'created_at')
  - order: 'asc' | 'desc' (optional, default: 'asc')
  - page: number (optional, default: 1)
  - limit: number (optional, default: 20, max: 100)

応答 (200 OK):
{
  "data": [
    {
      "id": 1,
      "name": "iPhone 15 Pro",
      "category_id": 1,
      "price": 150000.00,
      "rating": 4.8,
      "reviews_count": 125,
      "is_featured": true,
      "stock": 50,
      "image_url": "/images/iphone15.jpg",
      "description": "...",
      "created_at": "2026-02-16T10:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

#### 3. 製品詳細取得

```
GET /api/products/{id}

応答 (200 OK):
{
  "id": 1,
  "name": "iPhone 15 Pro",
  "category_id": 1,
  "category_name": "エレクトロニクス",  ← JOINで取得
  "price": 150000.00,
  "description": "高性能A17 Proチップ...",
  "stock": 50,
  "rating": 4.8,
  "reviews_count": 125,
  "image_url": "/images/iphone15.jpg",
  "sku": "SKU-IP15P-001",
  "is_featured": true,
  "similar_products": [        ← 関連製品（同カテゴリー）
    { "id": 2, "name": "...", "price": ... }
  ],
  "created_at": "2026-02-16T10:00:00.000Z"
}
```

#### 4. 製品作成

```
POST /api/products

リクエストボディ:
{
  "category_id": 1,
  "name": "Galaxy S25",
  "description": "最新型Samsung",
  "price": 145000.00,
  "stock": 25,
  "sku": "SKU-GS25-001",
  "image_url": "/images/galaxy-s25.jpg",
  "is_featured": false
}

応答 (201 Created):
{
  "id": 42,  ← 新規IDが自動付与
  "category_id": 1,
  "name": "Galaxy S25",
  ...
  "created_at": "2026-02-16T14:30:00.000Z"
}

エラー (400 Bad Request):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "必須フィールドがありません",
    "details": {
      "category_id": "required",
      "price": "must be >= 0"
    }
  }
}
```

#### 5. 製品更新

```
PUT /api/products/{id}

リクエストボディ:
{
  "name": "Galaxy S25（2026年版）",
  "price": 155000.00,
  "stock": 30
}

応答 (200 OK):
{
  "id": 42,
  "name": "Galaxy S25（2026年版）",
  "price": 155000.00,
  "stock": 30,
  "updated_at": "2026-02-16T15:00:00.000Z"
}
```

#### 6. 製品削除

```
DELETE /api/products/{id}

応答 (204 No Content):
(ボディなし)

※注意: 注文に含まれている製品は削除不可
エラー (409 Conflict):
{
  "error": {
    "code": "FOREIGN_KEY_CONSTRAINT",
    "message": "この製品を含む注文が存在するため削除できません"
  }
}
```

---

## 実装ステップ

### Step 1: 製品カテゴリーモデルの実装

### 📁 ファイル: `backend/src/models/productCategoryModel.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/models/productCategoryModel.js`

```javascript
const { pool } = require("../config/db");

// 全カテゴリー取得（active フィルター付き）
const findAll = async (isActive = true) => {
  const [rows] = await pool.query(
    "SELECT id, name, description, icon_url, display_order, is_active, created_at, updated_at FROM product_categories WHERE is_active = ? ORDER BY display_order ASC",
    [isActive],
  );
  return rows;
};

// IDでカテゴリー取得
const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, description, icon_url, display_order, is_active, created_at, updated_at FROM product_categories WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

// カテゴリー作成
const create = async (name, description, iconUrl, displayOrder = 0) => {
  const [result] = await pool.query(
    "INSERT INTO product_categories (name, description, icon_url, display_order) VALUES (?, ?, ?, ?)",
    [name, description, iconUrl, displayOrder],
  );
  return result.insertId;
};

// ID:でカテゴリー更新
const update = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const [result] = await pool.query(
    `UPDATE product_categories SET ${setClause} WHERE id = ?`,
    [...values, id],
  );
  return result.affectedRows;
};

// IDでカテゴリー削除
const deleteById = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM product_categories WHERE id = ?",
    [id],
  );
  return result.affectedRows;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  deleteById,
};
```

**説明:**

- `findAll()`: WHERE句で`is_active`フィルター。ORDER BYで並び順制御
- `findById()`: 単一レコード取得
- `create()`: 新規レコード挿入。`insertId`で自動採番IDを返す
- `update()`: 動的なSET句を生成（柔軟な部分更新対応）
- `deleteById()`: 削除

---

### Step 2: 製品モデルの実装

### 📁 ファイル: `backend/src/models/productModel.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/models/productModel.js`

```javascript
const { pool } = require("../config/db");

// 全製品取得（フィルタリング・ページング対応）
const findAll = async (filters = {}) => {
  let query = `
    SELECT 
      p.id, p.category_id, p.name, p.description, p.price,
      p.stock, p.image_url, p.sku, p.is_featured, p.rating,
      p.reviews_count, p.created_at, p.updated_at
    FROM products p
    WHERE 1=1
  `;
  const params = [];

  // フィルター構築
  if (filters.category_id) {
    query += " AND p.category_id = ?";
    params.push(filters.category_id);
  }
  if (filters.min_price) {
    query += " AND p.price >= ?";
    params.push(filters.min_price);
  }
  if (filters.max_price) {
    query += " AND p.price <= ?";
    params.push(filters.max_price);
  }
  if (filters.is_featured !== undefined) {
    query += " AND p.is_featured = ?";
    params.push(filters.is_featured);
  }
  if (filters.search) {
    query += " AND MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE)";
    params.push(filters.search);
  }

  // ソート
  const sortField =
    {
      price: "p.price",
      rating: "p.rating",
      created_at: "p.created_at",
    }[filters.sort] || "p.created_at";
  const sortOrder = filters.order === "desc" ? "DESC" : "ASC";
  query += ` ORDER BY ${sortField} ${sortOrder}`;

  // ページング
  const page = parseInt(filters.page || 1);
  const limit = Math.min(parseInt(filters.limit || 20), 100);
  const offset = (page - 1) * limit;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

// ページング用の総件数取得
const countAll = async (filters = {}) => {
  let query = "SELECT COUNT(*) as count FROM products WHERE 1=1";
  const params = [];

  if (filters.category_id) {
    query += " AND category_id = ?";
    params.push(filters.category_id);
  }
  if (filters.min_price) {
    query += " AND price >= ?";
    params.push(filters.min_price);
  }
  if (filters.max_price) {
    query += " AND price <= ?";
    params.push(filters.max_price);
  }
  if (filters.search) {
    query += " AND MATCH(name, description) AGAINST(? IN BOOLEAN MODE)";
    params.push(filters.search);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

// IDで製品取得（関連データ含む）
const findById = async (id) => {
  const [productRows] = await pool.query(
    `
    SELECT 
      p.id, p.category_id, p.name, p.description, p.price,
      p.stock, p.image_url, p.sku, p.is_featured, p.rating,
      p.reviews_count, p.created_at, p.updated_at,
      pc.name as category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.id = ?
    `,
    [id],
  );

  if (!productRows.length) return null;

  const product = productRows[0];

  // 同カテゴリーの関連製品（最大3件）
  const [relatedRows] = await pool.query(
    `
    SELECT id, name, price, image_url, rating
    FROM products
    WHERE category_id = ? AND id != ?
    LIMIT 3
    `,
    [product.category_id, id],
  );

  product.similar_products = relatedRows;
  return product;
};

// 製品作成
const create = async (
  categoryId,
  name,
  description,
  price,
  stock,
  sku,
  imageUrl,
  isFeatured = false,
) => {
  const [result] = await pool.query(
    `
    INSERT INTO products (category_id, name, description, price, stock, sku, image_url, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [categoryId, name, description, price, stock, sku, imageUrl, isFeatured],
  );
  return result.insertId;
};

// 製品更新
const update = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return 0;

  const values = Object.values(fields);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const [result] = await pool.query(
    `UPDATE products SET ${setClause} WHERE id = ?`,
    [...values, id],
  );
  return result.affectedRows;
};

// 製品削除（外部キー制約をチェック）
const deleteById = async (id) => {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows;
};

module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  deleteById,
};
```

**重要な実装ポイント:**

1. **動的フィルタリング:**

   ```javascript
   if (filters.category_id) {
     query += " AND p.category_id = ?";
     params.push(filters.category_id);
   }
   ```

   - SQLインジェクション対策：`?`プレースホルダを使用
   - 条件が不要なら追加しない（柔軟性）

2. **FULLTEXTサーチ:**

   ```javascript
   if (filters.search) {
     query += " AND MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE)";
   }
   ```

   - テーブル定義時に `FULLTEXT INDEX` を作成済み
   - 複数カラムでの高速検索

3. **ページング実装:**

   ```javascript
   const offset = (page - 1) * limit;
   query += ` LIMIT ? OFFSET ?`;
   ```

   - Page 1 = 0-19件、Page 2 = 20-39件

---

### Step 3: サービス層の実装

### 📁 ファイル: `backend/src/services/productService.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/services/productService.js`

```javascript
const productModel = require("../models/productModel");
const productCategoryModel = require("../models/productCategoryModel");

// 全カテゴリー取得
const listCategories = async (isActive = true) => {
  return await productCategoryModel.findAll(isActive);
};

// 全製品取得（ページング・フィルター付き）
const listProducts = async (filters = {}) => {
  // フィルター検証
  if (
    filters.min_price &&
    filters.max_price &&
    filters.min_price > filters.max_price
  ) {
    throw new Error("min_price cannot be greater than max_price");
  }
  if (filters.page && filters.page < 1) {
    throw new Error("page must be >= 1");
  }
  if (filters.limit && filters.limit < 1) {
    throw new Error("limit must be >= 1");
  }

  const products = await productModel.findAll(filters);
  const total = await productModel.countAll(filters);

  const page = parseInt(filters.page || 1);
  const limit = Math.min(parseInt(filters.limit || 20), 100);
  const pages = Math.ceil(total / limit);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
};

// 製品詳細取得
const getProduct = async (id) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");
  return product;
};

// 製品作成
const createProduct = async (
  categoryId,
  name,
  description,
  price,
  stock,
  sku,
  imageUrl,
) => {
  // ビジネスロジック検証
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be a positive number");
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("Stock must be non-negative integer");
  }

  // カテゴリーが存在するか確認
  const category = await productCategoryModel.findById(categoryId);
  if (!category) throw new Error("Category not found");

  const id = await productModel.create(
    categoryId,
    name,
    description,
    price,
    stock,
    sku,
    imageUrl,
  );
  return { id, categoryId, name, description, price, stock, sku, imageUrl };
};

// 製品更新
const updateProduct = async (id, fields) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // 価格検証
  if (
    fields.price !== undefined &&
    (fields.price <= 0 || !Number.isFinite(fields.price))
  ) {
    throw new Error("Price must be a positive number");
  }

  // カテゴリー変更時の検証
  if (fields.category_id && fields.category_id !== product.category_id) {
    const category = await productCategoryModel.findById(fields.category_id);
    if (!category) throw new Error("Category not found");
  }

  const affected = await productModel.update(id, fields);
  if (affected === 0) throw new Error("Product not found");

  return { id, ...fields };
};

// 製品削除
const deleteProduct = async (id) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // 注文に含まれているか確認（Phase 3で実装）
  // const hasOrders = await checkOrderItems(id);
  // if (hasOrders) throw new Error("Cannot delete: product in orders");

  const affected = await productModel.deleteById(id);
  return affected > 0;
};

module.exports = {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
```

**ビジネスロジックの例:**

```javascript
// フィルター検証
if (filters.min_price > filters.max_price) {
  throw new Error("...");
}

// 関連データの存在確認
const category = await productCategoryModel.findById(categoryId);
if (!category) throw new Error("Category not found");
```
---

### Step 4: コントローラーの実装

### 📁 ファイル: `backend/src/controllers/productController.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/controllers/productController.js`

```javascript
const {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../services/productService");

// カテゴリー一覧
const getCategories = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const categories = await listCategories(is_active === "false" ? false : true);
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

// 製品一覧（フィルター・ページング）
const getProducts = async (req, res, next) => {
  try {
    const filters = {
      category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
      min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
      is_featured: req.query.is_featured === "true" ? true : undefined,
      search: req.query.search,
      sort: req.query.sort,
      order: req.query.order,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await listProducts(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// 製品詳細
const getProductDetail = async (req, res, next) => {
  try {
    const product = await getProduct(parseInt(req.params.id));
    res.status(200).json(product);
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ error: "Product not found" });
    }
    next(err);
  }
};

// 製品作成
const postProduct = async (req, res, next) => {
  try {
    const { category_id, name, description, price, stock, sku, image_url } = req.body;

    // 入力バリデーション
    if (!category_id || !name || !price || stock === undefined) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          details: {
            category_id: !category_id ? "required" : undefined,
            name: !name ? "required" : undefined,
            price: !price ? "required" : undefined,
            stock: stock === undefined ? "required" : undefined,
          },
        },
      });
    }

    const product = await createProduct(category_id, name, description, price, stock, sku, image_url);
    res.status(201).json(product);
  } catch (err) {
    if (err.message.includes("Category not found")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

// 製品更新
const putProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const fields = {};

    // 更新フィールドを収集
    if (req.body.name !== undefined) fields.name = req.body.name;
    if (req.body.description !== undefined) fields.description = req.body.description;
    if (req.body.price !== undefined) fields.price = req.body.price;
    if (req.body.stock !== undefined) fields.stock = req.body.stock;
    if (req.body.image_url !== undefined) fields.image_url = req.body.image_url;
    if (req.body.is_featured !== undefined) fields.is_featured = req.body.is_featured;

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const product = await updateProduct(id, fields);
    res.status(200).json(product);
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ error: "Product not found" });
    }
    next(err);
  }
};

// 製品削除
const deleteProductHandler = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await deleteProduct(id);
    res.status(204).send();
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ error: "Product not found" });
    }
    next(err);
  }
};

module.exports = {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
};
```

---

### Step 5: ルーティングの実装

### Step 5: ルーティングの設定

### 📁 ファイル: `backend/src/routes/products.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/routes/products.js`

```javascript
const express = require("express");
const {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
} = require("../controllers/productController");

const router = express.Router();

// カテゴリーエンドポイント
router.get("/categories", getCategories);

// 製品エンドポイント
router.get("/", getProducts); // 一覧（フィルター・ページング）
router.post("/", postProduct); // 作成
router.get("/:id", getProductDetail); // 詳細
router.put("/:id", putProduct); // 更新
router.delete("/:id", deleteProductHandler); // 削除

module.exports = router;
```

**ルートマッピング表:**

| メソッド | パス                       | ハンドラー           |
| -------- | -------------------------- | -------------------- |
| GET      | `/api/products/categories` | getCategories        |
| GET      | `/api/products`            | getProducts          |
| POST     | `/api/products`            | postProduct          |
| GET      | `/api/products/:id`        | getProductDetail     |
| PUT      | `/api/products/:id`        | putProduct           |
| DELETE   | `/api/products/:id`        | deleteProductHandler |

---

### Step 6: メインルーターの更新

### 📁 ファイル: `backend/src/routes/index.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/routes/index.js`

```javascript
const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");
const productRoutes = require("./products");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes); // NEW

module.exports = router;
```

---

## エラーハンドリング

### 標準エラー応答フォーマット

すべてのエラーは統一フォーマットで返す：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### エラーコード定義

| コード                   | HTTPステータス | 説明                   | 例             |
| ------------------------ | -------------- | ---------------------- | -------------- |
| `VALIDATION_ERROR`       | 400            | 入力値が無効           | 価格が負数     |
| `NOT_FOUND`              | 404            | リソースが見つからない | IDが存在しない |
| `FOREIGN_KEY_CONSTRAINT` | 409            | FK制約違反             | 削除できない   |
| `INTERNAL_SERVER_ERROR`  | 500            | サーバー内部エラー     | DB接続失敗     |

### 改善されたエラーミドルウェア

### 📁 ファイル: `backend/src/middlewares/error.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/middlewares/error.js`

```javascript
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
```

---

## 入力バリデーション

### バリデーション原則

1. **Controllers**: 基本バリデーション（存在確認）
2. **Services**: ビジネスロジック検証（有効性、関連性）
3. **Database**: 制約検証（FK、UNIQUE）

### バリデーター実装

### 📁 ファイル: `backend/src/validators/productValidator.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/validators/productValidator.js`

```javascript
// 価格バリデーション
const validatePrice = (price) => {
  if (typeof price !== "number")
    return { valid: false, error: "Price must be a number" };
  if (price <= 0) return { valid: false, error: "Price must be positive" };
  if (!Number.isFinite(price))
    return { valid: false, error: "Price must be finite" };
  return { valid: true };
};

// 在庫バリデーション
const validateStock = (stock) => {
  if (!Number.isInteger(stock))
    return { valid: false, error: "Stock must be integer" };
  if (stock < 0) return { valid: false, error: "Stock must be non-negative" };
  return { valid: true };
};

// 製品名バリデーション
const validateProductName = (name) => {
  if (!name || name.trim().length === 0)
    return { valid: false, error: "Name is required" };
  if (name.length > 200)
    return { valid: false, error: "Name must be <= 200 characters" };
  return { valid: true };
};

module.exports = {
  validatePrice,
  validateStock,
  validateProductName,
};
```

**使用例（コントローラー内）:**

```javascript
const {
  validatePrice,
  validateStock,
} = require("../validators/productValidator");

const validation = validatePrice(req.body.price);
if (!validation.valid) {
  return res.status(400).json({ error: validation.error });
}
```

---

## テスト方法

### 1. cURLでのAPI テスト

**カテゴリー一覧:**

```bash
curl -X GET "http://localhost:3000/api/products/categories" \
  -H "Content-Type: application/json"
```

**製品一覧（フィルター）:**

```bash
curl -X GET "http://localhost:3000/api/products?category_id=1&min_price=100000&max_price=200000&page=1&limit=10"
```

**製品作成:**

```bash
curl -X POST "http://localhost:3000/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "Pixel 9",
    "description": "Google最新スマートフォン",
    "price": 130000,
    "stock": 40,
    "sku": "SKU-PIX9-001",
    "image_url": "/images/pixel9.jpg"
  }'
```

**製品更新:**

```bash
curl -X PUT "http://localhost:3000/api/products/42" \
  -H "Content-Type: application/json" \
  -d '{"price": 125000, "stock": 35}'
```

**製品削除:**

```bash
curl -X DELETE "http://localhost:3000/api/products/42"
```

### 2. VS Code REST Client拡張でのテスト

**ファイル：** `backend/test-api.rest`

```rest
### Get Categories
GET http://localhost:3000/api/products/categories

### Get Products (with filters)
GET http://localhost:3000/api/products?category_id=1&min_price=100000&sort=price&order=asc&page=1&limit=10

### Get Product Detail
GET http://localhost:3000/api/products/1

### Create Product
POST http://localhost:3000/api/products
Content-Type: application/json

{
  "category_id": 1,
  "name": "iPhone 15 Max",
  "description": "大型モデル",
  "price": 160000,
  "stock": 25,
  "sku": "SKU-IP15MAX-001"
}

### Update Product
PUT http://localhost:3000/api/products/1
Content-Type: application/json

{
  "price": 145000,
  "stock": 40
}

### Delete Product
DELETE http://localhost:3000/api/products/2
```

---

## 次のステップ

✅ 製品・カテゴリーAPIの実装完了

**推奨:**

- [DATABASE_STRUCTURE_GUIDE.md](DATABASE_STRUCTURE_GUIDE.md) の Phase 3 を確認
- 注文（Order）・レビュー（Review）の Model/Service/Controller 実装
- 複雑なJOINクエリ最適化
- N+1問題対策

**同時実行:**

- [FRONTEND_APP_DEVELOPMENT.md](FRONTEND_APP_DEVELOPMENT.md) の Phase 2 UI実装

---

## 関連ドキュメント

| ドキュメント                                               | 内容               | 参照すべき箇所                 |
| ---------------------------------------------------------- | ------------------ | ------------------------------ |
| [DATABASE_STRUCTURE_GUIDE.md](DATABASE_STRUCTURE_GUIDE.md) | DB スキーマ設計    | テーブル定義・マイグレーション |
| [FRONTEND_APP_DEVELOPMENT.md](FRONTEND_APP_DEVELOPMENT.md) | フロントエンド実装 | APIハンドラ・レスポンス形式    |
| [db/ER_DIAGRAM.md](db/ER_DIAGRAM.md)                       | ER図（Mermaid）    | テーブル関係理解               |
