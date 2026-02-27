# 追加開発ガイド: クエリパラメータバリデーション（バックエンド編）

> **目的:** フロントエンドから送信されるクエリパラメータ（sort, order 等）を厳密にバリデーションし、SQLインジェクションを防止する  
> **対象:** バックエンド（Node.js / Express）  
> **前提:** `docs/guides/02_BACKEND_GUIDE.md` の内容を完了していること  
> **作成日:** 2026-02-27

---

## 目次

1. [この開発で学べること](#1-この開発で学べること)
2. [現状の問題点の分析](#2-現状の問題点の分析)
3. [SQLインジェクションとは？](#3-sqlインジェクションとは)
4. [ホワイトリスト方式の解説](#4-ホワイトリスト方式の解説)
5. [手順 1: クエリバリデータの作成](#5-手順-1-クエリバリデータの作成)
6. [手順 2: バリデーションミドルウェアの作成](#6-手順-2-バリデーションミドルウェアの作成)
7. [手順 3: ルーターへのミドルウェア適用](#7-手順-3-ルーターへのミドルウェア適用)
8. [手順 4: コントローラーの修正](#8-手順-4-コントローラーの修正)
9. [手順 5: モデル層の防御強化](#9-手順-5-モデル層の防御強化)
10. [手順 6: エラーミドルウェアの拡張](#10-手順-6-エラーミドルウェアの拡張)
11. [動作確認](#11-動作確認)
12. [セキュリティチェックリスト](#12-セキュリティチェックリスト)

---

## 1. この開発で学べること

| テーマ | 学習内容 |
|---|---|
| **SQLインジェクション** | Webアプリ最大の脆弱性の仕組みと対策 |
| **ホワイトリスト方式** | 許可された値のみ受け入れるセキュリティパターン |
| **Express ミドルウェア** | リクエスト処理パイプラインの設計 |
| **関心の分離** | バリデーション・ビジネスロジック・データアクセスの責務分離 |
| **多層防御** | フロントエンド＋バックエンド＋DB層の3層防御 |

---

## 2. 現状の問題点の分析

### 現在のデータフロー

```
[ブラウザ] → Dashboard.jsx の「新着を見る」リンク
  → URL: /mypage/products?sort=created_at&order=desc
  → ProductList.jsx → useSearchParams() でクエリ取得
  → useProducts.js → productsAPI.getList(filters)
  → httpClient → GET /api/products?sort=created_at&order=desc
  → [バックエンド] productController.getProducts()
  → req.query.sort / req.query.order をそのまま使用
  → productModel.findAll() で SQL に組み込み
```

### 問題箇所

現在の `backend/src/models/productModel.js` の `findAll` 関数：

```javascript
// 現在のコード（問題あり）
const sortField =
  {
    price: "p.price",
    rating: "p.rating",
    created_at: "p.created_at",
  }[filters.sort] || "p.created_at";
const sortOrder = filters.order === "desc" ? "DESC" : "ASC";
query += ` ORDER BY ${sortField} ${sortOrder}`;
```

**良い点:** `sortField` はオブジェクトのキーマッチで制限されているため、`sort` パラメータ自体はある程度安全です。

**問題点:**
1. **バリデーションがモデル層でしか行われていない** — 不正な値がコントローラーやサービス層を通過して到達する
2. **`order` パラメータは "desc" 以外なら何でも "ASC" になる** — 不正な値（`order=xx:x;x`）がエラーにならず黙って通過する
3. **`page`, `limit` にも文字列注入が可能** — `parseInt` で NaN になるケースの処理が不十分
4. **`search` パラメータにXSSやSQLインジェクション文字列が入り得る**

### 攻撃例

```
# 正常なリクエスト
GET /api/products?sort=rating&order=desc

# 不正なリクエスト（現在はエラーにならない）
GET /api/products?sort=id;DROP TABLE products&order=xx:x;x
GET /api/products?page=-1&limit=99999
GET /api/products?search='; DROP TABLE products; --
```

> **重要:** 現在のコードでは `sort` はオブジェクトマッピングによりある程度守られていますが、それは「偶然」であり「設計」ではありません。明示的なバリデーション層を追加することで、意図的かつ堅牢なセキュリティを実現します。

---

## 3. SQLインジェクションとは？

### 3.1 基本概念

SQLインジェクションとは、**ユーザー入力を通じて意図しないSQLコマンドを注入する攻撃手法**です。

```
[正常] SELECT * FROM products ORDER BY price ASC
                                       ↑ ユーザー入力

[攻撃] SELECT * FROM products ORDER BY price; DROP TABLE products; -- ASC
                                       ↑ ユーザーが悪意ある文字列を注入
```

### 3.2 なぜ危険なのか

| リスク | 具体例 |
|---|---|
| **データ漏洩** | 全ユーザーのメールアドレス・パスワードハッシュが流出 |
| **データ改ざん** | 商品価格を0円に書き換え |
| **データ削除** | テーブルごと削除（DROP TABLE） |
| **権限昇格** | 一般ユーザーを管理者に昇格 |

### 3.3 防御の3原則

| 手法 | 説明 | 本アプリでの実装 |
|---|---|---|
| **プリペアドステートメント** | `?` プレースホルダでパラメータをバインド | ✅ `mysql2` の `pool.query(sql, params)` で実装済み |
| **ホワイトリスト** | 許可された値のみ受け入れる | ⬜ **今回追加する** |
| **入力サニタイズ** | 危険な文字をエスケープ・除去 | ⬜ **今回追加する** |

> **ポイント:** `mysql2` のプリペアドステートメントは `WHERE` 句の値（`?`）には有効ですが、`ORDER BY` や `LIMIT` のようなSQL構文の一部に変数を埋め込む場合は効きません。だからこそホワイトリスト方式が必要です。

---

## 4. ホワイトリスト方式の解説

### 考え方

```
❌ ブラックリスト方式: 「これは禁止」→ 未知の攻撃に弱い
✅ ホワイトリスト方式: 「これだけ許可」→ 未知の攻撃にも強い
```

**ブラックリスト方式**は「危険なパターンを列挙して弾く」アプローチですが、攻撃パターンは無限に存在するため完全にはなれません。

**ホワイトリスト方式**は「許可された値を明確に定義し、それ以外は全て拒否」するアプローチです。本アプリでは：

```javascript
// ホワイトリストの例
const ALLOWED_SORT_FIELDS = ["price", "rating", "created_at"];
const ALLOWED_ORDER_DIRECTIONS = ["asc", "desc"];

// バリデーション
if (!ALLOWED_SORT_FIELDS.includes(userInput.sort)) {
  throw new Error("不正なソートフィールド");
}
```

これにより、`sort=id;DROP TABLE products` のような値は「ホワイトリストに無い」ため即座に拒否されます。

---

## 5. 手順 1: クエリバリデータの作成

### なぜ専用のバリデータを作るのか？

- **再利用性:** 複数のルートで同じバリデーションを使い回せる
- **テスト容易性:** バリデーションロジックを単体テストしやすい
- **一元管理:** 許可値の変更が1箇所で済む

### ファイル: `backend/src/validators/queryValidator.js`（新規作成）

```javascript
/**
 * クエリパラメータバリデーション
 *
 * 製品一覧APIに渡されるクエリパラメータを検証し、
 * SQLインジェクションを防止する。
 *
 * 設計思想: ホワイトリスト方式
 * → 明示的に許可された値のみ受け入れ、それ以外は全て拒否する
 */

// ========================================
// ホワイトリスト定義
// ========================================

/**
 * 許可されたソートフィールド
 *
 * キー: クエリパラメータの値
 * 値: SQLで使用する実際のカラム名
 *
 * ※新しいソートフィールドを追加する場合はここに追加する
 */
const ALLOWED_SORT_FIELDS = {
  price: "p.price",
  rating: "p.rating",
  created_at: "p.created_at",
};

/**
 * 許可されたソート方向
 */
const ALLOWED_ORDER_DIRECTIONS = ["asc", "desc"];

// ========================================
// バリデーション関数
// ========================================

/**
 * ソートフィールドのバリデーション
 *
 * @param {string|undefined} sort - ソートフィールド名
 * @returns {{ valid: boolean, error: string|null, value: string }}
 *
 * 未指定の場合は "created_at" をデフォルト値として返す
 */
const validateSort = (sort) => {
  // 未指定はOK（デフォルト値を使用）
  if (sort === undefined || sort === null || sort === "") {
    return { valid: true, error: null, value: "created_at" };
  }

  // 文字列型チェック
  if (typeof sort !== "string") {
    return { valid: false, error: "sortは文字列で指定してください", value: null };
  }

  // ホワイトリスト照合（小文字に正規化してから比較）
  const normalized = sort.toLowerCase().trim();
  if (!ALLOWED_SORT_FIELDS[normalized]) {
    const allowed = Object.keys(ALLOWED_SORT_FIELDS).join(", ");
    return {
      valid: false,
      error: `不正なソートフィールドです。許可値: ${allowed}`,
      value: null,
    };
  }

  return { valid: true, error: null, value: normalized };
};

/**
 * ソート方向のバリデーション
 *
 * @param {string|undefined} order - ソート方向（asc / desc）
 * @returns {{ valid: boolean, error: string|null, value: string }}
 *
 * 未指定の場合は "asc" をデフォルト値として返す
 */
const validateOrder = (order) => {
  // 未指定はOK（デフォルト値を使用）
  if (order === undefined || order === null || order === "") {
    return { valid: true, error: null, value: "asc" };
  }

  if (typeof order !== "string") {
    return { valid: false, error: "orderは文字列で指定してください", value: null };
  }

  const normalized = order.toLowerCase().trim();
  if (!ALLOWED_ORDER_DIRECTIONS.includes(normalized)) {
    return {
      valid: false,
      error: `不正なソート方向です。許可値: ${ALLOWED_ORDER_DIRECTIONS.join(", ")}`,
      value: null,
    };
  }

  return { valid: true, error: null, value: normalized };
};

/**
 * ページ番号のバリデーション
 *
 * @param {string|undefined} page - ページ番号
 * @returns {{ valid: boolean, error: string|null, value: number }}
 */
const validatePage = (page) => {
  if (page === undefined || page === null || page === "") {
    return { valid: true, error: null, value: 1 };
  }

  const parsed = parseInt(page, 10);

  // 数値変換チェック（"abc" → NaN）
  if (isNaN(parsed)) {
    return { valid: false, error: "pageは数値で指定してください", value: null };
  }

  // 正の整数チェック
  if (parsed < 1) {
    return { valid: false, error: "pageは1以上で指定してください", value: null };
  }

  // 上限チェック（無限スクロール攻撃防止）
  if (parsed > 10000) {
    return { valid: false, error: "pageは10000以下で指定してください", value: null };
  }

  return { valid: true, error: null, value: parsed };
};

/**
 * 1ページあたりの件数バリデーション
 *
 * @param {string|undefined} limit - 1ページあたりの件数
 * @returns {{ valid: boolean, error: string|null, value: number }}
 */
const validateLimit = (limit) => {
  if (limit === undefined || limit === null || limit === "") {
    return { valid: true, error: null, value: 20 };
  }

  const parsed = parseInt(limit, 10);

  if (isNaN(parsed)) {
    return { valid: false, error: "limitは数値で指定してください", value: null };
  }

  if (parsed < 1) {
    return { valid: false, error: "limitは1以上で指定してください", value: null };
  }

  // 最大100件に制限（大量データ取得攻撃防止）
  if (parsed > 100) {
    return { valid: false, error: "limitは100以下で指定してください", value: null };
  }

  return { valid: true, error: null, value: parsed };
};

/**
 * 検索キーワードのサニタイズ
 *
 * FULLTEXT検索に使われるため、MySQL特殊文字を無害化する
 *
 * @param {string|undefined} search - 検索キーワード
 * @returns {{ valid: boolean, error: string|null, value: string|undefined }}
 */
const validateSearch = (search) => {
  if (search === undefined || search === null || search === "") {
    return { valid: true, error: null, value: undefined };
  }

  if (typeof search !== "string") {
    return { valid: false, error: "searchは文字列で指定してください", value: null };
  }

  // 長さ制限（DoS防止）
  if (search.length > 200) {
    return { valid: false, error: "検索キーワードは200文字以内にしてください", value: null };
  }

  // 制御文字の除去（\x00-\x1F）
  const sanitized = search.replace(/[\x00-\x1F]/g, "");

  return { valid: true, error: null, value: sanitized };
};

/**
 * 製品一覧クエリパラメータの一括バリデーション
 *
 * @param {Object} query - req.query（Express のクエリパラメータ）
 * @returns {{ valid: boolean, errors: string[], sanitized: Object }}
 */
const validateProductListQuery = (query) => {
  const errors = [];
  const sanitized = {};

  // 各パラメータを検証
  const sortResult = validateSort(query.sort);
  if (!sortResult.valid) errors.push(sortResult.error);
  else sanitized.sort = sortResult.value;

  const orderResult = validateOrder(query.order);
  if (!orderResult.valid) errors.push(orderResult.error);
  else sanitized.order = orderResult.value;

  const pageResult = validatePage(query.page);
  if (!pageResult.valid) errors.push(pageResult.error);
  else sanitized.page = pageResult.value;

  const limitResult = validateLimit(query.limit);
  if (!limitResult.valid) errors.push(limitResult.error);
  else sanitized.limit = limitResult.value;

  const searchResult = validateSearch(query.search);
  if (!searchResult.valid) errors.push(searchResult.error);
  else sanitized.search = searchResult.value;

  // 価格帯はparseFloatした値を渡す（既存のproductValidatorに委譲）
  if (query.category_id !== undefined) {
    const catId = parseInt(query.category_id, 10);
    if (isNaN(catId) || catId < 1) {
      errors.push("category_idは正の整数で指定してください");
    } else {
      sanitized.category_id = catId;
    }
  }

  if (query.min_price !== undefined) {
    const minPrice = parseFloat(query.min_price);
    if (isNaN(minPrice) || minPrice < 0) {
      errors.push("min_priceは0以上の数値で指定してください");
    } else {
      sanitized.min_price = minPrice;
    }
  }

  if (query.max_price !== undefined) {
    const maxPrice = parseFloat(query.max_price);
    if (isNaN(maxPrice) || maxPrice < 0) {
      errors.push("max_priceは0以上の数値で指定してください");
    } else {
      sanitized.max_price = maxPrice;
    }
  }

  if (query.is_featured !== undefined) {
    if (query.is_featured !== "true" && query.is_featured !== "false") {
      errors.push("is_featuredはtrue/falseで指定してください");
    } else {
      // 注意: 現行コードでは is_featured === "false" 時に undefined を返していたが、
      // ここでは boolean false を返す。これにより ?is_featured=false で
      // 「おすすめでない製品」のフィルターが正しく機能するようになる（動作変更）
      sanitized.is_featured = query.is_featured === "true";
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
};

module.exports = {
  ALLOWED_SORT_FIELDS,
  ALLOWED_ORDER_DIRECTIONS,
  validateSort,
  validateOrder,
  validatePage,
  validateLimit,
  validateSearch,
  validateProductListQuery,
};
```

**コード解説:**
- `ALLOWED_SORT_FIELDS` はオブジェクト形式で、フロントエンドが送る値（`price`）とSQLカラム名（`p.price`）のマッピングを兼ねています
- 各関数は `{ valid, error, value }` の統一フォーマットを返します。`value` にはバリデーション＋サニタイズ済みの値が入ります
- `validateProductListQuery` は一括バリデーションで、複数のエラーをまとめて返せるため、ユーザーが一度で全ての問題を把握できます

---

## 6. 手順 2: バリデーションミドルウェアの作成

### なぜミドルウェアにするのか？

```
[リクエスト] → [ミドルウェア:バリデーション] → [コントローラー] → [サービス] → [モデル]
                ↑ ここで不正なリクエストを弾く       コントローラー以降は安全なデータのみ受け取る
```

Express のミドルウェアは、リクエストがコントローラーに到達する前に処理を挟む仕組みです。バリデーションをミドルウェアにすることで：

1. **コントローラーが責務をシンプルに保てる**（バリデーション済みデータを受け取るだけ）
2. **複数のルートで同じバリデーションを再利用できる**
3. **不正なリクエストがビジネスロジックに到達しない**

### ファイル: `backend/src/middlewares/validateQuery.js`（新規作成）

```javascript
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
  // 以降のコントローラーはこの値だけを使う
  req.validatedQuery = result.sanitized;

  next();
};

module.exports = { validateProductQuery };
```

**コード解説:**
- `req.validatedQuery` という新しいプロパティにサニタイズ済みの値を格納します。`req.query`（生の値）を直接使わせないのが重要です
- `next()` は「次のミドルウェア（またはコントローラー）に処理を渡す」関数です。エラー時は `next()` を呼ばず、レスポンスを返して打ち切ります
- エラーレスポンスは `details` 配列に複数のエラーを含められるため、フロントエンドは一度で全てのバリデーションエラーを受け取れます

---

## 7. 手順 3: ルーターへのミドルウェア適用

### ファイル: `backend/src/routes/products.js`（修正）

```javascript
const express = require("express");
const { authenticate } = require("../middlewares/authMiddleware");
const { validateProductQuery } = require("../middlewares/validateQuery");
const {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
  getPopularProductsHandler,
} = require("../controllers/productController");

const router = express.Router();

// カテゴリーエンドポイント
router.get("/categories", getCategories);

// 人気製品エンドポイント（/products/:idより前に配置）
router.get("/popular", getPopularProductsHandler);

// 製品エンドポイント
// ↓↓↓ 変更: validateProductQuery ミドルウェアを追加
router.get("/", validateProductQuery, getProducts);
router.post("/", postProduct);
router.get("/:id", authenticate, getProductDetail);
router.put("/:id", putProduct);
router.delete("/:id", deleteProductHandler);

module.exports = router;
```

**変更点:**
- `require` に `validateProductQuery` を追加
- `router.get("/", ...)` に `validateProductQuery` ミドルウェアを挿入

**Express ミドルウェアチェーンの仕組み:**
```
router.get("/", validateProductQuery, getProducts);
                ↑ まずこれが実行         ↑ validateProductQueryがnext()を呼んだら実行
```

`validateProductQuery` はリクエストを検査し、問題なければ `next()` を呼んで `getProducts` に処理を渡します。問題があれば 400 エラーを返し、`getProducts` は実行されません。

---

## 8. 手順 4: コントローラーの修正

### ファイル: `backend/src/controllers/productController.js`（修正）

`getProducts` 関数を、`req.query` ではなく `req.validatedQuery` を使うように変更します。

```javascript
// 製品一覧(フィルター・ページング)
const getProducts = async (req, res, next) => {
  try {
    // ↓↓↓ 変更: req.query → req.validatedQuery（ミドルウェアでバリデーション済み）
    const filters = req.validatedQuery;

    const result = await listProducts(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
```

**変更前との比較:**

```javascript
// 【変更前】req.query をそのまま解析（危険）
const filters = {
  category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
  min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
  // ... 各パラメータを個別にパース
};

// 【変更後】ミドルウェアでバリデーション済みの安全な値をそのまま使用
const filters = req.validatedQuery;
```

**なぜこの変更が重要か:**
- コントローラーの責務が「バリデーション＋ビジネスロジック呼び出し」から「ビジネスロジック呼び出しのみ」に軽量化されます
- `parseInt` / `parseFloat` の重複処理がなくなります（バリデータで済んでいるため）
- コントローラーが `req.query` を直接触らないため、バリデーション漏れの危険がゼロになります

---

## 9. 手順 5: モデル層の防御強化

### なぜモデル層にも防御が必要？

「多層防御（Defense in Depth）」の考え方です：

```
第1層: フロントエンド → UIレベルの制限（select要素で値を制限）
第2層: ミドルウェア → ホワイトリストバリデーション ← 今回追加
第3層: モデル層 → SQLレベルの最終防御 ← 今回強化
```

ミドルウェアを通らないパスや、将来のコード変更でバリデーションが抜ける可能性に備えて、モデル層でも防御します。

### ファイル: `backend/src/models/productModel.js`（修正）

`findAll` 関数のソート部分を修正します。

```javascript
// findAll 関数内のソート部分を以下に変更:

  // ========================================
  // ソート（ホワイトリスト方式で安全に構築）
  // ========================================
  // ↓↓↓ 変更: バリデーター定義のホワイトリストをインポートして使用
  const { ALLOWED_SORT_FIELDS } = require("../validators/queryValidator");

  const sortField = ALLOWED_SORT_FIELDS[filters.sort] || "p.created_at";
  const sortOrder = filters.order === "desc" ? "DESC" : "ASC";
  query += ` ORDER BY ${sortField} ${sortOrder}`;
```

**変更点の解説:**
- ソートフィールドのマッピングを `queryValidator.js` の `ALLOWED_SORT_FIELDS` からインポートして使用します
- これにより、許可フィールドの定義が **バリデータとモデルで一元化** されます
- 元のコードも同じ仕組みでしたが、`ALLOWED_SORT_FIELDS` を共有することで管理が容易になります

> **注意:** `require` をファイル先頭に移動するのがベストプラクティスです。ファイル全体の修正後の `require` は以下のようになります：

```javascript
const { pool } = require("../config/db");
const { ALLOWED_SORT_FIELDS } = require("../validators/queryValidator");
```

---

## 10. 手順 6: エラーミドルウェアの拡張

### ファイル: `backend/src/middlewares/error.js`（修正）

`errorHandler` にクエリバリデーション関連のエラーパターンを追加します。

```javascript
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
```

**変更点:** `"不正な"` と `"許可値"` のパターンを追加。これにより、queryValidator のエラーメッセージも適切に 400 ステータスで返されます。

> **補足:** 通常、クエリバリデーションエラーは `validateProductQuery` ミドルウェアが直接 400 レスポンスを返すため、この `errorHandler` には到達しません。ここでのパターン追加は、ミドルウェア経由ではなく Service/Model 層で queryValidator を直接使用した場合の**多層防御（予防的措置）** です。

---

## 11. 動作確認

### REST Client（requests.http）での確認

以下のテストケースを `backend/requests.http` の末尾に追加して確認します：

```http
### ==============================
### クエリバリデーションテスト
### ==============================

### 正常: ソートと方向を指定
GET {{baseUrl}}/products?sort=price&order=asc

### 正常: デフォルト値で取得
GET {{baseUrl}}/products

### 異常: 不正なソートフィールド（400エラーを期待）
GET {{baseUrl}}/products?sort=id;DROP TABLE products

### 異常: 不正なソート方向（400エラーを期待）
GET {{baseUrl}}/products?order=xx:x;x

### 異常: 不正なページ番号（400エラーを期待）
GET {{baseUrl}}/products?page=-1

### 異常: limit超過（400エラーを期待）
GET {{baseUrl}}/products?limit=99999

### 異常: 複合エラー（複数のエラーが返ることを確認）
GET {{baseUrl}}/products?sort=invalid&order=xxx&page=-1
```

### 期待されるエラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "クエリパラメータが不正です",
    "details": [
      "不正なソートフィールドです。許可値: price, rating, created_at",
      "不正なソート方向です。許可値: asc, desc",
      "pageは1以上で指定してください"
    ]
  }
}
```

---

## 12. セキュリティチェックリスト

実装後に以下を確認してください：

- [ ] `GET /api/products?sort=price&order=desc` → 正常に製品一覧が返る
- [ ] `GET /api/products?sort=xxx` → 400エラー（不正なソートフィールド）
- [ ] `GET /api/products?order=xxx` → 400エラー（不正なソート方向）
- [ ] `GET /api/products?page=abc` → 400エラー（数値でない）
- [ ] `GET /api/products?page=-1` → 400エラー（範囲外）
- [ ] `GET /api/products?limit=999` → 400エラー（100超過）
- [ ] `GET /api/products?sort=id;DROP TABLE products` → 400エラー
- [ ] `GET /api/products` → デフォルト値で正常動作
- [ ] Dashboard の「新着を見る」「高評価を見る」リンクが正常動作
- [ ] FilterPanel のフィルター適用が正常動作

---

**次のステップ:** フロントエンド側のエラーハンドリング改善は `06_QUERY_VALIDATION_FRONTEND.md` で解説します。
