# バックエンド改善手順書

## 📋 目次
1. [現状分析](#現状分析)
2. [改善項目概要](#改善項目概要)
3. [改善手順](#改善手順)
   - [手順1: サーバー側バリデーションの強化](#手順1-サーバー側バリデーションの強化)
   - [手順2: 検索ロジックの改善とドキュメント化](#手順2-検索ロジックの改善とドキュメント化)
   - [手順3: 人気製品APIの実装](#手順3-人気製品apiの実装)
   - [手順4: エラーレスポンスの統一](#手順4-エラーレスポンスの統一)
4. [テスト方法](#テスト方法)
5. [学習ポイント](#学習ポイント)

---

## 現状分析

### 現在の構成
```
backend/
├── src/
│   ├── controllers/
│   │   └── productController.js    # 製品関連のエンドポイント処理
│   ├── services/
│   │   └── productService.js       # ビジネスロジック
│   ├── models/
│   │   └── productModel.js         # データベースアクセス
│   ├── validators/
│   │   ├── productValidator.js     # 製品バリデーション（未使用）
│   │   └── authValidator.js        # 認証バリデーション
│   └── routes/
│       └── products.js             # ルーティング定義
```

### 現在の問題点

#### 1. **バリデーションが一貫していない**

現状:
- `productValidator.js`にバリデーション関数があるが、**ほとんど使われていない**
- コントローラーやサービスで個別にバリデーション実装
- エラーメッセージの形式がバラバラ

例（`productController.js`）:
```javascript
// 入力バリデーション
if (!category_id || !name || !price || stock === undefined) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Missing required fields",
      details: { ... }
    }
  });
}
```

例（`productService.js`）:
```javascript
if (!Number.isFinite(price) || price <= 0) {
  throw new Error("Price must be a positive number");
}
```

→ **同じバリデーションロジックが複数箇所に散在**

---

#### 2. **検索ロジックが不明確**

現在の検索実装（`productModel.js`）:
```javascript
if (filters.search) {
  query += " AND MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE)";
  params.push(filters.search);
}
```

問題点:
- **AND検索なのかOR検索なのか不明**
  - 実際は`MATCH AGAINST`でOR検索に近い動作
  - ただし、ドキュメント化されていない
- **ベストプラクティスに沿っているか不明**
  - FULLTEXT検索は適切か？
  - 日本語検索の対応は十分か？

---

#### 3. **人気製品取得機能がない**

現在のエンドポイント:
- `GET /api/products` - 製品一覧
- `GET /api/products/:id` - 製品詳細

**注意:** バックエンドのルーティングは `/api` プレフィックスが付いています（`app.js` で設定）。

必要なエンドポイント:
- `GET /api/products/popular` - 人気製品（閲覧数順）
- `GET /api/products/trending` - トレンド製品（オプション）

また、製品の**閲覧数トラッキング**機能自体が存在しない:
- 製品詳細ページを開いても閲覧数が記録されない
- データベースに`product_views`テーブルがない

---

#### 4. **エラーレスポンス形式の不統一**

パターン1（コントローラー）:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields"
  }
}
```

パターン2（サービス層からのthrow）:
```json
{
  "error": "Price must be a positive number"
}
```

→ フロントエンドでエラー処理が複雑になる

---

## 改善項目概要

| 改善項目 | 目的 | 優先度 |
|---------|------|--------|
| バリデーションの統一 | コード品質・保守性向上 | 高 |
| 検索ロジックの明確化 | ドキュメント化・仕様明確化 | 中 |
| 人気製品API実装 | ホームページ充実化 | 高 |
| エラーレスポンス統一 | API設計の一貫性 | 中 |

---

## 改善手順

### 手順1: サーバー側バリデーションの強化

#### 📘 解説

**サーバー側バリデーション**は、セキュリティとデータ整合性の最後の砦です。

**なぜサーバー側バリデーションが必須か:**
1. **クライアント側は改竄可能**: ブラウザの開発者ツールでJavaScriptを無効化・改変できる
2. **API直接呼び出し**: curlやPostmanで直接APIを叩かれる可能性がある
3. **データベース整合性**: 不正なデータがDBに入るとシステム全体に影響

**バリデーションの原則:**
- **コントローラー層**: 基本的な必須項目チェック、型チェック
- **サービス層**: ビジネスルール検証（価格範囲、在庫数など）
- **モデル層**: データベース制約の確認

---

#### 1.1 バリデーターの改善

**ファイルパス:** `backend/src/validators/productValidator.js`

既存のバリデーターを強化します:

```javascript
/**
 * 製品バリデーション関数集
 * 
 * 各関数は { valid: boolean, error: string|null } を返す
 * エラー時は error にメッセージを設定
 */

// 価格バリデーション
const validatePrice = (price) => {
  if (price === undefined || price === null) {
    return { valid: false, error: "価格は必須です" };
  }
  if (typeof price !== "number") {
    return { valid: false, error: "価格は数値で指定してください" };
  }
  if (price <= 0) {
    return { valid: false, error: "価格は0より大きい値を指定してください" };
  }
  if (!Number.isFinite(price)) {
    return { valid: false, error: "価格に無限大は指定できません" };
  }
  if (price > 100000000) {
    return { valid: false, error: "価格は1億円以下にしてください" };
  }
  return { valid: true, error: null };
};

// 在庫バリデーション
const validateStock = (stock) => {
  if (stock === undefined || stock === null) {
    return { valid: false, error: "在庫数は必須です" };
  }
  if (!Number.isInteger(stock)) {
    return { valid: false, error: "在庫数は整数で指定してください" };
  }
  if (stock < 0) {
    return { valid: false, error: "在庫数は0以上にしてください" };
  }
  if (stock > 1000000) {
    return { valid: false, error: "在庫数は100万個以下にしてください" };
  }
  return { valid: true, error: null };
};

// 製品名バリデーション
const validateProductName = (name) => {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "製品名は必須です" };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "製品名は空白のみにできません" };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: "製品名は200文字以内にしてください" };
  }
  return { valid: true, error: null };
};

// ↓↓↓ 追加: 価格帯フィルターのバリデーション
const validatePriceRange = (minPrice, maxPrice) => {
  // 両方未指定はOK
  if (minPrice === undefined && maxPrice === undefined) {
    return { valid: true, error: null };
  }

  // 最小価格チェック
  if (minPrice !== undefined) {
    if (typeof minPrice !== "number" || minPrice < 0) {
      return { valid: false, error: "最小価格は0以上の数値で指定してください" };
    }
    if (minPrice > 100000000) {
      return { valid: false, error: "最小価格は1億円以下にしてください" };
    }
  }

  // 最大価格チェック
  if (maxPrice !== undefined) {
    if (typeof maxPrice !== "number" || maxPrice < 0) {
      return { valid: false, error: "最大価格は0以上の数値で指定してください" };
    }
    if (maxPrice > 100000000) {
      return { valid: false, error: "最大価格は1億円以下にしてください" };
    }
  }

  // 最小 > 最大のチェック
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { valid: false, error: "最小価格は最大価格以下にしてください" };
  }

  return { valid: true, error: null };
};

// ↓↓↓ 追加: カテゴリーIDバリデーション
const validateCategoryId = (categoryId) => {
  if (categoryId === undefined || categoryId === null) {
    return { valid: false, error: "カテゴリーIDは必須です" };
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { valid: false, error: "カテゴリーIDは正の整数で指定してください" };
  }
  return { valid: true, error: null };
};

// ↓↓↓ 追加: SKUバリデーション（オプション項目）
const validateSKU = (sku) => {
  // SKUは任意項目
  if (sku === undefined || sku === null || sku === "") {
    return { valid: true, error: null };
  }
  if (typeof sku !== "string") {
    return { valid: false, error: "SKUは文字列で指定してください" };
  }
  if (sku.length > 100) {
    return { valid: false, error: "SKUは100文字以内にしてください" };
  }
  // SKUフォーマットの例: 英数字とハイフンのみ
  if (!/^[A-Za-z0-9\-]+$/.test(sku)) {
    return { valid: false, error: "SKUは英数字とハイフンのみ使用できます" };
  }
  return { valid: true, error: null };
};

module.exports = {
  validatePrice,
  validateStock,
  validateProductName,
  validatePriceRange,
  validateCategoryId,
  validateSKU,
};
```

**解説:**
1. **統一されたレスポンス形式**: `{ valid, error }`
2. **詳細なエラーメッセージ**: ユーザーが修正しやすいメッセージ
3. **境界値チェック**: 極端な値（1億円、100万個など）を防ぐ
4. **型チェック**: `typeof`で型を確認
5. **新しいバリデーション関数**: `validatePriceRange`, `validateCategoryId`, `validateSKU`

---

#### 1.2 productServiceでのバリデーター活用

**ファイルパス:** `backend/src/services/productService.js`

既存のバリデーションをvalidatorに置き換えます:

```javascript
const productModel = require("../models/productModel");
const productCategoryModel = require("../models/productCategoryModel");
const {
  validatePrice,
  validateStock,
  validateProductName,
  validatePriceRange,
  validateCategoryId,
  validateSKU,
} = require("../validators/productValidator");

// 全カテゴリー取得（既存のまま）
const listCategories = async (isActive = true) => {
  return await productCategoryModel.findAll(isActive);
};

// 全製品取得(ページング・フィルター付き)
const listProducts = async (filters = {}) => {
  // ↓↓↓ 修正: バリデーターを使用
  const priceValidation = validatePriceRange(filters.min_price, filters.max_price);
  if (!priceValidation.valid) {
    throw new Error(priceValidation.error);
  }

  // ページング検証
  if (filters.page && filters.page < 1) {
    throw new Error("ページ番号は1以上で指定してください");
  }
  if (filters.limit && filters.limit < 1) {
    throw new Error("取得件数は1以上で指定してください");
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

// 製品詳細取得（既存のまま）
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
  // ↓↓↓ 修正: バリデーターを使用
  const categoryValidation = validateCategoryId(categoryId);
  if (!categoryValidation.valid) throw new Error(categoryValidation.error);

  const nameValidation = validateProductName(name);
  if (!nameValidation.valid) throw new Error(nameValidation.error);

  const priceValidation = validatePrice(price);
  if (!priceValidation.valid) throw new Error(priceValidation.error);

  const stockValidation = validateStock(stock);
  if (!stockValidation.valid) throw new Error(stockValidation.error);

  const skuValidation = validateSKU(sku);
  if (!skuValidation.valid) throw new Error(skuValidation.error);

  // カテゴリーが存在するか確認
  const category = await productCategoryModel.findById(categoryId);
  if (!category) throw new Error("指定されたカテゴリーが見つかりません");
  if (!category.is_active) throw new Error("無効なカテゴリーは使用できません");

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

  // ↓↓↓ 修正: バリデーターを使用
  if (fields.price !== undefined) {
    const priceValidation = validatePrice(fields.price);
    if (!priceValidation.valid) throw new Error(priceValidation.error);
  }

  if (fields.stock !== undefined) {
    const stockValidation = validateStock(fields.stock);
    if (!stockValidation.valid) throw new Error(stockValidation.error);
  }

  if (fields.name !== undefined) {
    const nameValidation = validateProductName(fields.name);
    if (!nameValidation.valid) throw new Error(nameValidation.error);
  }

  if (fields.sku !== undefined) {
    const skuValidation = validateSKU(fields.sku);
    if (!skuValidation.valid) throw new Error(skuValidation.error);
  }

  // カテゴリー変更時の検証
  if (fields.category_id && fields.category_id !== product.category_id) {
    const categoryValidation = validateCategoryId(fields.category_id);
    if (!categoryValidation.valid) throw new Error(categoryValidation.error);

    const category = await productCategoryModel.findById(fields.category_id);
    if (!category) throw new Error("指定されたカテゴリーが見つかりません");
    if (!category.is_active) throw new Error("無効なカテゴリーは使用できません");
  }

  const affected = await productModel.update(id, fields);
  if (affected === 0) throw new Error("Product not found");

  return { id, ...fields };
};

// 製品削除（既存のまま）
const deleteProduct = async (id) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

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

**解説:**
- **バリデーターのインポート**: `require("../validators/productValidator")`
- **各バリデーションを関数化**: コードの重複を削減
- **エラーメッセージの統一**: 全てvalidatorから返されるメッセージを使用
- **カテゴリーの存在チェック強化**: `is_active`も確認

---

### 手順2: 検索ロジックの改善とドキュメント化

#### 📘 解説

現在の検索は**MySQL FULLTEXT検索（BOOLEAN MODE）**を使用しています。

**FULLTEXT検索の特徴:**
- **利点**: 
  - 高速（インデックスを使用）
  - 複数カラムを同時検索可能
  - 自然言語処理に近い検索
- **欠点**:
  - 日本語は**3文字以上**でないとヒットしにくい（`ft_min_word_len`設定に依存）
  - ANDとORの組み合わせは複雑

**改善方針:**
1. 検索ロジックを**明示的にOR検索**として設計
2. ドキュメントコメントで仕様を明確化
3. オプション: AND検索モードの追加

---

#### 2.1 検索ロジックのドキュメント化

**ファイルパス:** `backend/src/models/productModel.js`

検索部分にコメントを追加し、ロジックを明確化します:

```javascript
const { pool } = require("../config/db");

/**
 * 全製品取得（フィルタリング・ページング対応）
 * 
 * @param {Object} filters - フィルター条件
 * @param {number} [filters.category_id] - カテゴリーID
 * @param {number} [filters.min_price] - 最小価格
 * @param {number} [filters.max_price] - 最大価格
 * @param {boolean} [filters.is_featured] - 注目製品フラグ
 * @param {string} [filters.search] - 検索キーワード（OR検索）
 * @param {string} [filters.sort] - ソート項目（price, rating, created_at）
 * @param {string} [filters.order] - ソート順（asc, desc）
 * @param {number} [filters.page] - ページ番号（1から開始）
 * @param {number} [filters.limit] - 取得件数（デフォルト20、最大100）
 * 
 * @returns {Promise<Array>} 製品リスト
 * 
 * 【検索仕様】
 * - `filters.search`が指定された場合、FULLTEXT検索（BOOLEAN MODE）を使用
 * - 検索対象: name（製品名）、description（説明文）
 * - 検索モード: OR検索（いずれかのカラムにキーワードが含まれればヒット）
 * - 複数キーワード: スペース区切りで入力すると、各キーワードでOR検索
 *   例: "ノートパソコン 軽量" → name/descriptionに「ノートパソコン」OR「軽量」が含まれる製品
 * 
 * 【FULLTEXT検索の注意点】
 * - MySQLのデフォルト設定では、3文字未満の単語は無視される（ft_min_word_len）
 * - 日本語は形態素解析されないため、単語単位でインデックス化される
 * - ストップワード（"の"、"は"など）は検索対象外
 */
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

  // ↓↓↓ 修正: 検索ロジックのドキュメント化
  if (filters.search) {
    // FULLTEXT検索（BOOLEAN MODE）
    // - nameとdescriptionの両方を対象にOR検索
    // - 複数キーワードはスペース区切りで入力可能
    // - 例: "ノート 軽量" → いずれかのキーワードが含まれる製品
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

// 以下は既存のまま...
// （findById, create, update, deleteById は変更なし）

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

**解説:**
- **JSDocコメント**: 関数の引数と戻り値を明記
- **検索仕様の明示**: OR検索であることを明記
- **FULLTEXT検索の注意点**: 3文字未満、ストップワードについて記載

---

### 手順3: 人気製品APIの実装

#### 📘 解説

人気製品を表示するには、**製品の閲覧数（view count）をトラッキング**する必要があります。

**実装方針:**
1. **データベース**: `product_views`テーブルを作成（DB手順書で実装）
2. **バックエンド**: 
  - 製品詳細取得時に閲覧数を記録（**認証必須**）
  - `/api/products/popular`エンドポイントで閲覧数上位を取得

**重要方針（この手順書では必須）:**
- 閲覧数トラッキングは「ユーザー単位」で行うため、`GET /api/products/:id` は `authenticate` を必ず通す
- これにより `req.user.id` を確実に取得できる

---

#### 3.1 productModelに人気製品取得関数を追加

**ファイルパス:** `backend/src/models/productModel.js`

既存の`module.exports`の上に以下を追加:

```javascript
// ↓↓↓ 追加: 人気製品取得（閲覧数順）
/**
 * 人気製品取得（閲覧数上位）
 * 
 * @param {number} limit - 取得件数（デフォルト10件）
 * @returns {Promise<Array>} 人気製品リスト
 * 
 * 【仕様】
 * - 過去30日間の閲覧数でソート
 * - 閲覧数が同じ場合はrating（評価）でソート
 * - product_viewsテーブルが存在しない場合はエラー
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

// ↓↓↓ 追加: 製品閲覧を記録
/**
 * 製品閲覧を記録
 * 
 * @param {number} productId - 製品ID
 * @param {number|null} userId - ユーザーID（未ログインの場合はnull）
 * @param {string|null} ipAddress - IPアドレス（オプション）
 * @returns {Promise<number>} 挿入されたレコードのID
 */
const recordView = async (productId, userId = null, ipAddress = null) => {
  const [result] = await pool.query(
    `
    INSERT INTO product_views (product_id, user_id, ip_address)
    VALUES (?, ?, ?)
    `,
    [productId, userId, ipAddress]
  );
  return result.insertId;
};

// module.exportsに追加
module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  deleteById,
  findPopular,    // ← 追加
  recordView,     // ← 追加
};
```

**解説:**
- **`findPopular`**: 
  - `LEFT JOIN product_views`で閲覧数を集計
  - `DATE_SUB(NOW(), INTERVAL 30 DAY)`で過去30日間に絞る
  - `GROUP BY`で製品ごとの閲覧数を算出
- **`recordView`**: 
  - 製品詳細を見たときに呼び出す
  - `user_id`はログイン済みユーザーのID（未ログインの場合はnull）
  - `ip_address`は将来の重複防止に使用可能

---

#### 3.2 productServiceに人気製品取得を追加

**ファイルパス:** `backend/src/services/productService.js`

既存の`module.exports`の上に以下を追加:

```javascript
// ↓↓↓ 追加: 人気製品取得
const getPopularProducts = async (limit = 10) => {
  if (limit < 1 || limit > 100) {
    throw new Error("取得件数は1〜100の範囲で指定してください");
  }
  return await productModel.findPopular(limit);
};

// ↓↓↓ 修正: 製品詳細取得時に閲覧を記録
const getProduct = async (id, userId = null, ipAddress = null) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // 閲覧を記録（エラーが起きても製品は返す）
  try {
    await productModel.recordView(id, userId, ipAddress);
  } catch (err) {
    console.error("Failed to record view:", err);
    // エラーは無視して製品を返す
  }

  return product;
};

// module.exportsに追加
module.exports = {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPopularProducts,  // ← 追加
};
```

**解説:**
- **`getPopularProducts`**: 取得件数のバリデーション後、`findPopular`を呼び出し
- **`getProduct`の修正**: 
  - `recordView`を呼び出して閲覧を記録
  - エラーが起きても製品データは返す（閲覧記録失敗でページが表示されないのは避ける）

---

#### 3.3 productControllerに人気製品エンドポイントを追加

**ファイルパス:** `backend/src/controllers/productController.js`

既存の`module.exports`の上に以下を追加:

```javascript
const {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPopularProducts,  // ← 追加
} = require("../services/productService");

// 既存のコントローラー関数...

// ↓↓↓ 追加: 人気製品取得エンドポイント
/**
 * GET /api/products/popular
 * 
 * クエリパラメータ:
 * - limit: 取得件数（デフォルト10、最大100）
 */
const getPopularProductsHandler = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const products = await getPopularProducts(limit);
    
    res.status(200).json({
      data: products,
      count: products.length,
    });
  } catch (err) {
    next(err);
  }
};

// ↓↓↓ 修正: 製品詳細取得時にユーザーID（必須）とIPアドレスを渡す
const getProductDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // ユーザーID（authenticate を通過しているため常に存在）
    const userId = req.user.id;
    
    // IPアドレス取得
    const ipAddress = req.ip || req.connection.remoteAddress;

    const product = await getProduct(id, userId, ipAddress);
    res.status(200).json(product);
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ message: "Product not found" });
    }
    next(err);
  }
};

// module.exportsに追加
module.exports = {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
  getPopularProductsHandler,  // ← 追加
};
```

**解説:**
- **`getPopularProductsHandler`**: 
  - `limit`クエリパラメータを受け取る
  - `getPopularProducts`を呼び出して結果を返す
- **`getProductDetail`の修正**: 
  - `authenticate` を前段で適用し、`req.user.id` を必ず取得する
  - 未認証リクエストは 401 で遮断する（トラッキング品質担保）
  - `req.ip`から`ipAddress`を取得
  - `getProduct`に渡す

---

#### 3.4 ルーティングに人気製品エンドポイントを追加

**ファイルパス:** `backend/src/routes/products.js`

```javascript
const express = require("express");
const { authenticate } = require("../middlewares/authMiddleware");
const {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
  getPopularProductsHandler,  // ← 追加
} = require("../controllers/productController");

const router = express.Router();

// カテゴリーエンドポイント
router.get("/categories", getCategories);

// ↓↓↓ 追加: 人気製品エンドポイント（/products/:idより前に配置）
// 理由: /popularが/:idに誤マッチするのを防ぐ
router.get("/popular", getPopularProductsHandler);

// 製品エンドポイント
router.get("/", getProducts);
router.post("/", postProduct);
router.get("/:id", authenticate, getProductDetail);
router.put("/:id", putProduct);
router.delete("/:id", deleteProductHandler);

module.exports = router;
```

**解説:**
- **ルートの順序が重要**: 
  - `/popular`は`/:id`より**前**に配置
  - なぜなら、`/:id`は全てのパスにマッチするため、後ろに配置すると`/popular`が`/:id`として解釈される
  - Express.jsは**上から順に**ルートをチェックする
- **認証の必須化**:
  - `GET /:id` に `authenticate` を挟むことで、`getProductDetail` で `req.user.id` を安全に利用できる
  - 人気製品の閲覧記録をユーザー単位で正確に集計できる

---

### 手順4: エラーレスポンスの統一

#### 📘 解説

現在、エラーレスポンスの形式が統一されていません。フロントエンドでのエラー処理を簡単にするため、統一します。

**標準形式:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {}
  }
}
```

---

#### 4.1 エラーハンドリングミドルウェアの拡張

**注意:** `backend/src/middlewares/error.js`は既に存在しています。このファイルを拡張します。

**ファイルパス:** `backend/src/middlewares/error.js`

既存のerrorHandlerを以下のように**拡張**します:

```javascript
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
    message.includes("範囲")
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
```

**解説:**
- **統一されたレスポンス形式**: `{ error: { code, message, details } }`
- **ステータスコード自動判定**: エラーメッセージから適切なステータスコードを判定
- **環境別の動作**: 
  - 開発環境: スタックトレースを含める
  - 本番環境: スタックトレースを非表示
- **ログ出力**: サーバー側でエラーをコンソールに記録

---

#### 4.2 app.jsの確認

**ファイルパス:** `backend/src/app.js`

**注意:** 既存の`app.js`には既にエラーハンドラーが設定されています:

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
app.use("/api", apiRoutes);  // ← 注意: /api プレフィックスが付いている

// エラーハンドリング（既に設定済み）
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
```

**解説:**
- **配置場所**: 全てのルーティングの**後**に配置
- エラーハンドラーは`next(err)`で渡されたエラーを全て受け取る
- 既存の `middlewares/error.js` が拡張されているため、特に追加作業は不要です

---

## テスト方法

### 1. バリデーションのテスト

**ツール:** curl または Postman

**テストケース: 製品作成**

```bash
# 正常ケース
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "テスト製品",
    "description": "説明文",
    "price": 1000,
    "stock": 10
  }'

# 異常ケース: 価格が負
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "テスト製品",
    "price": -100,
    "stock": 10
  }'
# 期待: 400エラー、"価格は0より大きい値を指定してください"

# 異常ケース: 在庫が非整数
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "テスト製品",
    "price": 1000,
    "stock": 10.5
  }'
# 期待: 400エラー、"在庫数は整数で指定してください"
```

---

### 2. 検索機能のテスト

```bash
# OR検索テスト
curl "http://localhost:3000/api/products?search=ノートパソコン"
# 期待: nameまたはdescriptionに「ノートパソコン」を含む製品

# 複数キーワード
curl "http://localhost:3000/api/products?search=ノート+軽量"
# 期待: 「ノート」OR「軽量」を含む製品
```

---

### 3. 人気製品APIのテスト

**注意:** `product_views`テーブルが作成されている必要があります（DB手順書を参照）。

```bash
# 人気製品取得
curl "http://localhost:3000/api/products/popular?limit=5"
# 期待: 閲覧数上位5件の製品

# 製品詳細を何度か開く
curl "http://localhost:3000/api/products/1"
curl "http://localhost:3000/api/products/1"
curl "http://localhost:3000/api/products/1"

# 再度人気製品取得
curl "http://localhost:3000/api/products/popular?limit=5"
# 期待: ID=1の製品のview_countが増加
```

---

### 4. エラーレスポンス統一のテスト

```bash
# 存在しない製品
curl "http://localhost:3000/api/products/99999"
# 期待形式:
# {
#   "error": {
#     "code": "NOT_FOUND",
#     "message": "Product not found"
#   }
# }

# バリデーションエラー
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{ "name": "test" }'
# 期待形式:
# {
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "カテゴリーIDは必須です"
#   }
# }
```

---

## 学習ポイント

### 1. バリデーションの階層構造
- **コントローラー**: リクエストの形式チェック（必須項目、型）
- **サービス**: ビジネスルール検証（価格範囲、在庫数）
- **モデル**: データベース制約の確認

### 2. MySQL FULLTEXT検索
- **BOOLEAN MODE**: 複雑な検索条件を指定可能
- **NATURAL LANGUAGE MODE**: 自然言語処理風の検索
- **日本語対応**: `ft_min_word_len`設定に注意

### 3. Express.jsのルーティング順序
- **特定のルート → 動的ルート**: `/popular`は`/:id`より前に配置
- **ミドルウェアの順序**: エラーハンドラーは最後に配置

### 4. エラーハンドリングのベストプラクティス
- **try-catch**: 各コントローラーで実装
- **next(err)**: エラーを次のミドルウェアに渡す
- **グローバルエラーハンドラー**: 全てのエラーを統一形式で返す

### 5. ビューカウントの実装パターン
- **非同期記録**: 閲覧記録失敗でもページは表示
- **集計クエリ**: `COUNT`と`GROUP BY`で集計
- **期間指定**: `DATE_SUB`で過去N日間に絞る

---

## 次のステップ

バックエンドの改善が完了したら、次は**データベース手順書**に進んでください。

- `IMPROVEMENT_ROADMAP_DB.md`: `product_views`テーブルの作成、インデックスの最適化

---

## トラブルシューティング

### Q1. バリデーターでエラーが出ない
- `validatePrice`などの戻り値を確認: `{ valid, error }`形式か？
- サービス層で`throw new Error(validation.error)`を実行しているか確認

### Q2. /api/products/popularが404エラー
- ルーティングの順序を確認: `/popular`が`/:id`より前にあるか？
- `product_views`テーブルが存在するか確認: DB手順書を参照

### Q3. 閲覧数が記録されない
- `product_views`テーブルが作成されているか確認
- `recordView`関数でエラーが起きていないかコンソールログを確認
- `routes/products.js` の `GET /:id` に `authenticate` が設定されているか確認

---

**作成日:** 2026年2月25日  
**対象バージョン:** Express 5.2.1, Node.js 18+  
**作成者:** 世界トップレベルエンジニア 🚀
