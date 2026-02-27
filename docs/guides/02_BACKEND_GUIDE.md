# バックエンドAPI構築ガイド【完全版】

> **対象:** IT初学者  
> **目標:** Node.js + Express で REST API を0から構築する  
> **所要時間:** 約4〜5時間  
> **前提:** `01_DATABASE_GUIDE.md` の構築が完了していること

---

## 目次

1. [このガイドで構築するもの](#1-このガイドで構築するもの)
2. [バックエンドの基礎知識](#2-バックエンドの基礎知識)
3. [Phase 1: プロジェクト初期化と基盤構築](#3-phase-1-プロジェクト初期化と基盤構築)
4. [Phase 2: ユーザーCRUD API](#4-phase-2-ユーザーcrud-api)
5. [Phase 3: 製品・カテゴリーAPI](#5-phase-3-製品カテゴリーapi)
6. [Phase 4: JWT認証システム](#6-phase-4-jwt認証システム)
7. [Phase 5: セキュリティ強化とパフォーマンス最適化](#7-phase-5-セキュリティ強化とパフォーマンス最適化)
8. [APIエンドポイント一覧](#8-apiエンドポイント一覧)
9. [動作確認方法](#9-動作確認方法)
10. [トラブルシューティング](#10-トラブルシューティング)

---

## 1. このガイドで構築するもの

### 完成イメージ

```
クライアント（ブラウザ/curl）
    │
    │  HTTP リクエスト（GET /api/users）
    ▼
┌─────────────────────────────────────────────────┐
│  Express サーバー（port: 3000）                   │
│                                                   │
│  リクエスト → ミドルウェア → ルート → コントローラー│
│                                     ↓             │
│                                  サービス          │
│                                     ↓             │
│                                  モデル            │
│                                     ↓             │
│                              MySQL クエリ実行       │
└─────────────────────────────────────────────────┘
    │
    ▼
  MySQL（データベース）
```

### 構築フェーズ

| フェーズ | 内容 | 作成ファイル数 |
|---------|------|-------------|
| Phase 1 | プロジェクト初期化・基盤 | 6ファイル |
| Phase 2 | ユーザー CRUD API | 4ファイル |
| Phase 3 | 製品・カテゴリー API | 5ファイル |
| Phase 4 | JWT認証システム | 6ファイル |

### 最終的なファイル構成

```
backend/
├── .env                     ← 環境変数
├── package.json             ← 依存パッケージ定義
├── Dockerfile               ← Docker用ビルド設定
└── src/
    ├── server.js            ← エントリーポイント（起動）
    ├── app.js               ← Express アプリ本体
    ├── config/
    │   ├── db.js            ← MySQL接続設定
    │   └── env.js           ← 環境変数ユーティリティ
    ├── models/              ← データベース操作層
    │   ├── userModel.js
    │   ├── productModel.js
    │   └── productCategoryModel.js
    ├── services/            ← ビジネスロジック層
    │   ├── userService.js
    │   ├── productService.js
    │   ├── authService.js
    │   └── healthService.js
    ├── controllers/         ← リクエスト・レスポンス処理層
    │   ├── userController.js
    │   ├── productController.js
    │   ├── authController.js
    │   └── healthController.js
    ├── routes/              ← URLルーティング定義
    │   ├── index.js
    │   ├── users.js
    │   ├── products.js
    │   ├── auth.js
    │   └── health.js
    ├── middlewares/          ← 共通処理（認証・エラー等）
    │   ├── authMiddleware.js
    │   └── error.js
    ├── validators/          ← バリデーション関数
    │   ├── authValidator.js
    │   └── productValidator.js
    └── utils/               ← ユーティリティ
        └── jwtUtils.js
```

---

## 2. バックエンドの基礎知識

### REST API とは

REST APIは「Webアプリのバックエンドとの通信ルール」です。

```
例: ユーザー管理API

操作      HTTPメソッド   URL            意味
─────────────────────────────────────────────────
一覧取得   GET          /api/users      全ユーザーを返す
1件取得    GET          /api/users/1    id=1のユーザーを返す
作成       POST         /api/users      新しいユーザーを作成
更新       PUT          /api/users/1    id=1のユーザーを全項目更新
部分更新   PATCH        /api/users/1    id=1のユーザーを一部更新
削除       DELETE       /api/users/1    id=1のユーザーを削除
```

### アーキテクチャパターン: Model-Service-Controller

このプロジェクトでは **MSC（Model-Service-Controller）** パターンを採用しています。

```
リクエスト → Route → Controller → Service → Model → DB
レスポンス ← Route ← Controller ← Service ← Model ← DB

各層の責務:
┌─────────────┬──────────────────────────────────────────┐
│ Route       │ URLとHTTPメソッドをControllerに対応付ける    │
│ Controller  │ リクエスト解析・レスポンス生成              │
│ Service     │ ビジネスロジック（検証・判断）               │
│ Model       │ データベース操作（SQL実行）                  │
└─────────────┴──────────────────────────────────────────┘
```

**なぜ層を分けるのか？**
- **保守性:** 各層が独立しているので、DB変更時はModelだけ修正すればよい
- **テスト性:** Service層を単独でテストできる
- **可読性:** 各ファイルの役割が明確で理解しやすい

### 使用する技術スタック

| 技術 | バージョン | 役割 |
|------|----------|------|
| Node.js | 20+ | JavaScript実行環境 |
| Express | 5.x | Webフレームワーク |
| mysql2 | 3.x | MySQLドライバ（Promise対応） |
| bcrypt | 6.x | パスワードハッシュ化 |
| jsonwebtoken | 9.x | JWT生成・検証 |
| cors | 2.x | クロスオリジン設定 |
| morgan | 1.x | HTTPリクエストログ |
| dotenv | 17.x | 環境変数読み込み |

---

## 3. Phase 1: プロジェクト初期化と基盤構築

### 手順 1-1: プロジェクトディレクトリの作成と初期化

```bash
# プロジェクトルートから
mkdir -p backend/src
cd backend

# package.json を自動生成
npm init -y
```

### 手順 1-2: 依存パッケージのインストール

```bash
# 本番用パッケージ
npm install express@5 mysql2 cors morgan dotenv bcrypt jsonwebtoken

# 開発用パッケージ（任意）
npm install --save-dev nodemon
```

**各パッケージの役割:**

| パッケージ | 用途 | 例え |
|-----------|------|------|
| `express` | Webサーバーフレームワーク | 店舗の受付カウンター |
| `mysql2` | DB接続ドライバ | 倉庫への通路 |
| `cors` | 別ドメインからのアクセス許可 | 店の入口を他の街の客にも開放 |
| `morgan` | リクエストログ | 来客記録帳 |
| `dotenv` | `.env` ファイル読み込み | 金庫の暗証番号管理帳 |
| `bcrypt` | パスワードのハッシュ化 | パスワードを暗号化する錠前 |
| `jsonwebtoken` | 認証トークン生成 | 入場パス（有効期限付き） |
| `nodemon` | ファイル変更時の自動再起動 | 開発時の便利ツール |

### 手順 1-3: package.json にスクリプトを追加

#### ファイル: `backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "type": "commonjs",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "morgan": "^1.10.1",
    "mysql2": "^3.17.1"
  }
}
```

> **`"type": "commonjs"` とは:** `require()` / `module.exports` 構文を使うための設定です。Node.jsのデフォルト設定ですが、明示的に指定しておくと意図が明確になります。

### 手順 1-4: 環境変数ファイルの作成

#### ファイル: `backend/.env`

```env
# データベース設定
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db

# JWT設定
JWT_SECRET=nfongguenfinweiofnsdonvfbgguvnbibgveprgruetghoifnfngerpugbpeogf
JWT_EXPIRES_IN=7d

# サーバー設定
PORT=3000
NODE_ENV=development
```

**各変数の意味:**

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `DB_HOST` | 127.0.0.1 | ローカル開発時。Docker内では `db` に変更 |
| `DB_PORT` | 3306 | MySQLのポート番号 |
| `DB_USER` | app | MySQL接続ユーザー name |
| `DB_PASSWORD` | app_password | MySQL接続パスワード |
| `DB_NAME` | app_db | 使用するデータベース名 |
| `JWT_SECRET` | (ランダム文字列) | トークン署名用の秘密鍵。**絶対に外部に漏らさないこと** |
| `JWT_EXPIRES_IN` | 7d | トークンの有効期限（7日間） |
| `PORT` | 3000 | バックエンドサーバーのポート番号 |
| `NODE_ENV` | development | 実行環境（開発/本番の切替に使用） |

> **重要:** `.env` ファイルは `.gitignore` に追加し、Git管理に含めないでください。秘密情報が外部に漏洩する原因になります。

### 手順 1-5: 環境変数ユーティリティの作成

```bash
mkdir -p src/config
```

#### ファイル: `backend/src/config/env.js`

```javascript
const getEnv = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value;
};

module.exports = { getEnv };
```

**なぜユーティリティを作るのか？**
- 環境変数が未設定の場合にフォールバック値（デフォルト値）を使える
- `process.env.DB_HOST` を直接使うよりも安全で読みやすい
- 将来、型変換や検証ロジックを追加しやすい

### 手順 1-6: データベース接続設定の作成

#### ファイル: `backend/src/config/db.js`

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
  charset: "utf8mb4",
});

module.exports = { pool };
```

**設計のポイント:**

```
mysql2/promise を使う理由:
  mysql2 は通常コールバック方式だが、/promise をつけると
  async/await で使えるようになる

コネクションプール (createPool) とは:
  DBへの接続を事前に複数用意しておく仕組み
  → リクエストのたびに接続/切断する無駄を省く
  → connectionLimit: 10 = 最大10個の接続を同時利用可能

  イメージ: レストランの調理台
  ├── 台が1つしかないと、1人ずつしか料理できない
  └── 台が10個あれば、10人同時に料理できる

charset: "utf8mb4":
  日本語や絵文字を含む全てのUnicode文字を扱えるようにする
```

### 手順 1-7: Expressアプリケーション本体の作成

#### ファイル: `backend/src/app.js`

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

**各ミドルウェアの処理順序:**

```
リクエストが到着
    ↓
  cors()             → 他のドメインからのアクセスを許可するヘッダーを設定
    ↓
  express.json()     → リクエストBodyのJSON文字列をJavaScriptオブジェクトに変換
    ↓                   例: '{"name":"Alice"}' → req.body = { name: "Alice" }
  morgan("dev")      → ログを出力（例: GET /api/users 200 12.345 ms）
    ↓
  /api ルーティング   → URLに応じた処理へ分岐
    ↓
  notFoundHandler    → どのルートにもマッチしなかった場合、404エラーを返す
    ↓
  errorHandler       → 処理中にエラーが発生した場合、統一形式のJSONエラーを返す
```

> **ミドルウェアとは?** Express の「通過点」です。リクエストが順番に通過し、各地点で処理（ログ出力、認証チェック等）が行われます。`next()` を呼ぶと次のミドルウェアへ進みます。

### 手順 1-8: エラーハンドリングミドルウェアの作成

```bash
mkdir -p src/middlewares
```

#### ファイル: `backend/src/middlewares/error.js`

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
 * グローバルエラーハンドリングミドルウェア
 *
 * 全てのエラーを統一されたJSON形式で返す。
 * Express では引数が4つ (err, req, res, next) の関数がエラーミドルウェアとして認識される。
 */
const errorHandler = (err, req, res, next) => {
  // デフォルトは500エラー（サーバー内部エラー）
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "サーバーエラーが発生しました";
  let details = err.details || null;

  // 特定のエラーメッセージから適切なステータスコードを推測
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

  // レスポンスを構築
  const response = {
    error: {
      code: errorCode,
      message: message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  // 開発環境ではスタックトレースを含める（デバッグ用）
  if (process.env.NODE_ENV === "development") {
    response.error.stack = err.stack;
  }

  // コンソールにエラーログを出力
  console.error(`[${errorCode}] ${message}`);
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  res.status(statusCode).json(response);
};

module.exports = { notFoundHandler, errorHandler };
```

**エラーレスポンスの統一形式:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found",
    "stack": "Error: Product not found\n    at ..."
  }
}
```

> `stack` はNODE_ENV=development の時のみ表示されます。本番環境では内部情報の漏洩を防ぐため表示されません。

### 手順 1-9: ヘルスチェックの実装

APIサーバーが正常に動作しているか確認するためのエンドポイントです。本番運用ではロードバランサーやDockerのヘルスチェックで使用します。

```bash
mkdir -p src/services src/controllers src/routes
```

#### ファイル: `backend/src/services/healthService.js`

```javascript
const buildHealth = () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
};

module.exports = { buildHealth };
```

#### ファイル: `backend/src/controllers/healthController.js`

```javascript
const { buildHealth } = require("../services/healthService");

const getHealth = (req, res) => {
  const payload = buildHealth();
  res.status(200).json(payload);
};

module.exports = { getHealth };
```

#### ファイル: `backend/src/routes/health.js`

```javascript
const express = require("express");
const { getHealth } = require("../controllers/healthController");

const router = express.Router();

router.get("/", getHealth);

module.exports = router;
```

### 手順 1-10: ルーティング統合ファイルの作成

全てのルートを1箇所で管理するファイルです。Phase 2〜4で新しいルートを追加していきます。

#### ファイル: `backend/src/routes/index.js`（Phase 1 時点）

```javascript
const express = require("express");
const healthRoutes = require("./health");

const router = express.Router();

router.use("/health", healthRoutes);

module.exports = router;
```

> **Phase 2〜4 で順次追加していきます。** 最終版は Phase 4 で完成します。

### 手順 1-11: サーバー起動ファイルの作成

#### ファイル: `backend/src/server.js`

```javascript
require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
```

**`require("dotenv").config()` の役割:**
- `.env` ファイルの内容を `process.env` に読み込む
- **必ずファイルの先頭で実行する** こと（他のモジュールが `process.env` を参照する前に）

### 手順 1-12: 起動テスト

```bash
# backend ディレクトリで実行
cd backend

# 依存パッケージをインストール済みであることを確認
npm install

# 開発モードで起動
npm run dev

# 別ターミナルでヘルスチェック
curl http://localhost:3000/api/health
```

**期待されるレスポンス:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-16T10:00:00.000Z"
}
```

**morganログの出力例:**

```
GET /api/health 200 3.456 ms - 56
```

> **Phase 1 完了！** Express サーバーの基盤が動作しています。

---

## 4. Phase 2: ユーザーCRUD API

このフェーズでは、MSCパターンの基本をユーザーAPIで学びます。

### MSCパターンの実装順序

```
Model → Service → Controller → Route の順番で作成する

理由: 下の層（DB操作）から上の層（HTTPハンドラー）へ積み上げる
→ 各層が依存先の層に依存するため、依存先を先に作る
```

### 手順 2-1: ユーザーモデルの作成

```bash
mkdir -p src/models
```

#### ファイル: `backend/src/models/userModel.js`

```javascript
const { pool } = require("../config/db");

// 全ユーザー取得
const findAll = async () => {
  const [rows] = await pool.query(
    "SELECT id, name, email, created_at FROM users",
  );
  return rows;
};

// IDで1件取得
const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

// ユーザー作成
const create = async (name, email) => {
  const [result] = await pool.query(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [name, email],
  );
  return result.insertId;
};

// ユーザー全項目更新
const update = async (id, name, email) => {
  const [result] = await pool.query(
    "UPDATE users SET name = ?, email = ? WHERE id = ?",
    [name, email, id],
  );
  return result.affectedRows;
};

// ユーザー部分更新
const partialUpdate = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const [result] = await pool.query(
    `UPDATE users SET ${setClause} WHERE id = ?`,
    [...values, id],
  );
  return result.affectedRows;
};

// ユーザー削除
const deleteById = async (id) => {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows;
};

// メールアドレスでユーザー検索
const findByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT id, name, email FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
};

// パスワード付きでユーザー取得（認証用 - Phase 4で使用）
const findByEmailWithPassword = async (email) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, password, role, is_active FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
};

// 認証情報付きユーザー取得（Phase 4で使用）
const findByIdForAuth = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, is_active FROM users WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

// 認証ユーザー作成（Phase 4で使用）
const createAuthUser = async (name, email, hashedPassword) => {
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
    [name, email, hashedPassword, "user", true],
  );
  return result.insertId;
};

// 最終ログイン日時を更新（Phase 4で使用）
const setLastLoginAt = async (id) => {
  await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [id]);
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  partialUpdate,
  deleteById,
  findByEmail,
  findByEmailWithPassword,
  findByIdForAuth,
  createAuthUser,
  setLastLoginAt,
};
```

**モデル層の設計原則:**

```javascript
// ■ 原則1: SQLはモデル内に閉じ込める
// コントローラーやサービスにSQLを書かない → 変更の影響範囲を最小化

// ■ 原則2: プレースホルダー（?）でSQLインジェクション防止
pool.query("SELECT * FROM users WHERE id = ?", [id]);
// ❌ 危険: `SELECT * FROM users WHERE id = ${id}`
// → 悪意のある入力（例: "1 OR 1=1"）で全データ漏洩の恐れ

// ■ 原則3: pool.query() の戻り値は [rows, fields] の配列
const [rows] = await pool.query("SELECT ...");
// rows = [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}]
// 分割代入で rows のみ取得（fields は不要なため省略）

// ■ 原則4: 単一レコード取得は rows[0] || null
// 見つからない場合にundefinedではなくnullを返す
// → コントローラーで if (!user) { ... } と統一的に判定できる

// ■ 原則5: passwordカラムは通常のfindAll/findByIdでは取得しない
// SELECT で password を含めないことで、意図しないパスワード漏洩を防止
```

### 手順 2-2: ユーザーサービスの作成

#### ファイル: `backend/src/services/userService.js`

```javascript
const {
  findAll,
  findById,
  create,
  update,
  partialUpdate,
  deleteById,
} = require("../models/userModel");

const listUsers = async () => {
  return findAll();
};

const getUserById = async (id) => {
  return findById(id);
};

const createUser = async (name, email) => {
  const id = await create(name, email);
  return { id, name, email };
};

const updateUser = async (id, name, email) => {
  const affectedRows = await update(id, name, email);
  if (affectedRows === 0) return null;
  return { id, name, email };
};

const patchUser = async (id, fields) => {
  const affectedRows = await partialUpdate(id, fields);
  if (affectedRows === 0) return null;
  return findById(id);
};

const removeUser = async (id) => {
  const affectedRows = await deleteById(id);
  return affectedRows > 0;
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  patchUser,
  removeUser,
};
```

**サービス層の役割:**

```
現時点ではモデルの薄いラッパーですが、以下のような処理を追加する場所です:

├── ビジネスルール: 「管理者は削除不可」等の業務ロジック
├── データ加工: 戻り値のフォーマット変更
├── 複数モデルの呼び出し: ユーザー作成時にメール送信モデルも呼ぶ
└── トランザクション管理: 複数のDB操作をまとめて行う

サービス層を最初から設けることで、ビジネスロジックの追加時に
コントローラーを肥大化させずに済みます。
```

### 手順 2-3: ユーザーコントローラーの作成

#### ファイル: `backend/src/controllers/userController.js`

```javascript
const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  patchUser,
  removeUser,
} = require("../services/userService");

// 全ユーザー取得  GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const users = await listUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// 1件取得  GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ユーザー作成  POST /api/users
const postUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: { message: "name and email are required" },
      });
    }
    const user = await createUser(name, email);
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// 全項目更新  PUT /api/users/:id
const putUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: { message: "name and email are required" },
      });
    }
    const user = await updateUser(req.params.id, name, email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// 部分更新  PATCH /api/users/:id
const patchUserHandler = async (req, res, next) => {
  try {
    const fields = req.body;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "No fields to update" },
      });
    }
    const user = await patchUser(req.params.id, fields);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// 削除  DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const success = await removeUser(req.params.id);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUser,
  postUser,
  putUser,
  patchUserHandler,
  deleteUser,
};
```

**コントローラーの設計原則:**

```
■ try-catch + next(err) パターン
  → エラーが起きたら errorHandler ミドルウェアに処理を委譲

■ HTTPステータスコードの使い分け
  200: OK（正常取得・更新）
  201: Created（新規作成完了）
  204: No Content（削除完了、レスポンスボディなし）
  400: Bad Request（入力値エラー）
  404: Not Found（リソースが見つからない）

■ レスポンス形式の統一
  成功: { success: true,  data: { ... } }
  失敗: { success: false, error: { message: "..." } }
  → フロントエンドが success フラグで処理を分岐できる

■ PUT と PATCH の違い
  PUT   : 全項目を送る必要がある（name + email 両方必須）
  PATCH : 変更したい項目だけ送ればよい（name だけでもOK）
```

### 手順 2-4: ユーザールートの作成

#### ファイル: `backend/src/routes/users.js`（Phase 2 版: 認証なし）

Phase 2の時点では認証なしで全機能にアクセス可能にします。Phase 4で認証ミドルウェアを追加します。

```javascript
const express = require("express");
const {
  getUsers,
  getUser,
  postUser,
  putUser,
  patchUserHandler,
  deleteUser,
} = require("../controllers/userController");

const router = express.Router();

router.get("/", getUsers);              // GET    /api/users
router.get("/:id", getUser);           // GET    /api/users/:id
router.post("/", postUser);            // POST   /api/users
router.put("/:id", putUser);           // PUT    /api/users/:id
router.patch("/:id", patchUserHandler); // PATCH  /api/users/:id
router.delete("/:id", deleteUser);     // DELETE /api/users/:id

module.exports = router;
```

**`router` の仕組み:**

```
express.Router() は小さな「ミニアプリ」を作る

router.get("/:id", getUser) と定義すると:
  URL例: /api/users/5
  → req.params.id = "5" が自動的に設定される

ルートは上から順に評価される:
  router.get("/", ...)      ← /api/users にマッチ
  router.get("/:id", ...)   ← /api/users/5 にマッチ
  → "/" を先に書かないと "/:id" が全てキャッチしてしまう
```

### 手順 2-5: ルーティング統合ファイルを更新

#### ファイル: `backend/src/routes/index.js`（Phase 2 版）

```javascript
const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/users", userRoutes);

module.exports = router;
```

### 手順 2-6: 動作確認

MySQLが起動していることを確認してから、以下のコマンドを実行します。

```bash
# サーバー起動（別ターミナルで実行中のことを確認）
npm run dev

# === curlコマンドによるテスト ===

# 1. 全ユーザー取得
curl -s http://localhost:3000/api/users | jq .
# → { "success": true, "data": [{ "id": 1, "name": "Admin User", ...}, ...] }

# 2. ユーザー作成
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Charlie", "email": "charlie@example.com"}' | jq .
# → { "success": true, "data": { "id": 6, "name": "Charlie", ... } }

# 3. 特定ユーザー取得
curl -s http://localhost:3000/api/users/1 | jq .
# → { "success": true, "data": { "id": 1, "name": "Admin User", ... } }

# 4. ユーザー全更新（PUT: 全項目指定）
curl -s -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated", "email": "alice@example.com"}' | jq .

# 5. ユーザー部分更新（PATCH: 一部項目のみ）
curl -s -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}' | jq .

# 6. ユーザー削除
curl -s -X DELETE http://localhost:3000/api/users/6
# → (204 No Content: レスポンスボディなし)
```

> **`jq`** は JSON を見やすく表示するコマンドです。未インストールの場合は `brew install jq`（macOS）で導入できます。

**Phase 2 完了！** ユーザー CRUD API が動作しています。

---

## 5. Phase 3: 製品・カテゴリーAPI

### 手順 3-1: カテゴリーモデルの作成

#### ファイル: `backend/src/models/productCategoryModel.js`

```javascript
const { pool } = require("../config/db");

// 全カテゴリー取得(active フィルター付き)
const findAll = async (isActive = true) => {
  const [rows] = await pool.query(
    "SELECT * FROM product_categories WHERE is_active = ? ORDER BY display_order ASC",
    [isActive],
  );
  return rows;
};

// IDでカテゴリー取得
const findById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM product_categories WHERE id = ?",
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

// カテゴリー更新（動的フィールド更新）
const update = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const [result] = await pool.query(
    `UPDATE product_categories SET ${setClause} WHERE id = ?`,
    [...values, id],
  );
};

// カテゴリー削除
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

### 手順 3-2: 製品モデルの作成

#### ファイル: `backend/src/models/productModel.js`

```javascript
const { pool } = require("../config/db");

/**
 * 全製品取得（フィルタリング・ソート・ページング対応）
 *
 * filters:
 *   category_id, min_price, max_price, is_featured,
 *   search（全文検索）, sort, order, page, limit
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

  // === フィルター条件の動的構築 ===
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

  // === ソート ===
  const sortField =
    {
      price: "p.price",
      rating: "p.rating",
      created_at: "p.created_at",
    }[filters.sort] || "p.created_at";
  const sortOrder = filters.order === "desc" ? "DESC" : "ASC";
  query += ` ORDER BY ${sortField} ${sortOrder}`;

  // === ページング ===
  const page = parseInt(filters.page || 1);
  const limit = Math.min(parseInt(filters.limit || 20), 100);
  const offset = (page - 1) * limit;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

/**
 * 製品総件数（ページング情報用）
 */
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

/**
 * IDで製品詳細取得（カテゴリー名・関連製品付き）
 */
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

  // 同じカテゴリーの関連製品を最大3件取得
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

/**
 * 製品作成
 */
const create = async (
  categoryId, name, description, price, stock, sku, imageUrl, isFeatured = false,
) => {
  const [result] = await pool.query(
    `INSERT INTO products (category_id, name, description, price, stock, sku, image_url, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [categoryId, name, description, price, stock, sku, imageUrl, isFeatured],
  );
  return result.insertId;
};

/**
 * 製品更新（動的フィールド更新）
 */
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

/**
 * 製品削除
 */
const deleteById = async (id) => {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows;
};

/**
 * 人気製品取得(閲覧数上位)
 * - 過去30日間の閲覧数でソート
 * - 閲覧数が同じ場合はrating（評価）でソート
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
 * 製品閲覧を記録
 * 製品詳細表示時にユーザーの閲覧を product_views テーブルに記録
 */
const recordView = async (productId, userId = null, ipAddress = null) => {
  const [result] = await pool.query(
    `
    INSERT INTO product_views (product_id, user_id, ip_address)
    VALUES (?, ?, ?)
    `,
    [productId, userId, ipAddress],
  );
  return result.insertId;
};

module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  deleteById,
  findPopular,
  recordView,
};
```

**動的クエリ構築パターンの解説:**

```sql
-- WHERE 1=1 で始める理由:
-- AND で条件を追加するとき、最初の条件かどうかを気にしなくて良い

SELECT * FROM products WHERE 1=1
  AND category_id = ?     -- フィルターがあれば追加
  AND price >= ?           -- フィルターがあれば追加

-- WHERE 1=1 がなければ:
-- 最初の条件: WHERE category_id = ?
-- 2番目以降:  AND price >= ?
-- → 「最初の条件か？」の分岐が必要で複雑になる
```

```
MATCH ... AGAINST ... IN BOOLEAN MODE とは:
  MySQL の全文検索機能
  → LIKE '%keyword%' より高速で、複数キーワードに対応
  → 事前にFULLTEXTインデックスの作成が必要（DBガイドで作成済み）

LEFT JOIN とは:
  products テーブルと product_categories テーブルを結合
  → LEFT JOIN は「左のテーブル(products)の全行を保持」
  → カテゴリーが未設定の製品も結果に含まれる
```

### 手順 3-3: 製品バリデーターの作成

```bash
mkdir -p src/validators
```

#### ファイル: `backend/src/validators/productValidator.js`

```javascript
/**
 * 製品バリデーション関数集
 *
 * 各関数は { valid: boolean, error: string|null } を返す統一インターフェース
 * → 呼び出し元で result.valid を確認するだけでOK
 */

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

const validatePriceRange = (minPrice, maxPrice) => {
  if (minPrice === undefined && maxPrice === undefined) {
    return { valid: true, error: null };
  }
  if (minPrice !== undefined) {
    if (typeof minPrice !== "number" || minPrice < 0) {
      return { valid: false, error: "最小価格は0以上の数値で指定してください" };
    }
  }
  if (maxPrice !== undefined) {
    if (typeof maxPrice !== "number" || maxPrice < 0) {
      return { valid: false, error: "最大価格は0以上の数値で指定してください" };
    }
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { valid: false, error: "最小価格は最大価格以下にしてください" };
  }
  return { valid: true, error: null };
};

const validateCategoryId = (categoryId) => {
  if (categoryId === undefined || categoryId === null) {
    return { valid: false, error: "カテゴリーIDは必須です" };
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { valid: false, error: "カテゴリーIDは正の整数で指定してください" };
  }
  return { valid: true, error: null };
};

const validateSKU = (sku) => {
  if (sku === undefined || sku === null) {
    return { valid: true, error: null };  // SKUは任意項目
  }
  if (typeof sku !== "string" || sku.trim().length === 0) {
    return { valid: false, error: "SKUは空でない文字列にしてください" };
  }
  if (sku.length > 100) {
    return { valid: false, error: "SKUは100文字以内にしてください" };
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

**バリデーション設計の考え方:**

```
なぜサービス層ではなく専用のバリデーターファイルに分けるのか？

1. 再利用性: 同じバリデーションを複数のサービスから呼べる
2. テスト性: バリデーション関数を単独でテストできる
3. 一覧性: どんなバリデーションがあるか一目で分かる

返り値を { valid, error } に統一する理由:
  呼び出し元のコードが簡潔で読みやすくなる
  ↓
  const result = validatePrice(price);
  if (!result.valid) throw new Error(result.error);
```

### 手順 3-4: 製品サービスの作成

#### ファイル: `backend/src/services/productService.js`

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

/**
 * 全カテゴリー取得
 */
const listCategories = async (isActive = true) => {
  return await productCategoryModel.findAll(isActive);
};

/**
 * 全製品取得（ページング・フィルター付き）
 *
 * 戻り値の形式:
 * {
 *   data: [{ id, name, price, ... }, ...],
 *   pagination: { page, limit, total, pages }
 * }
 */
const listProducts = async (filters = {}) => {
  // 価格範囲のバリデーション
  const priceValidation = validatePriceRange(
    filters.min_price,
    filters.max_price,
  );
  if (!priceValidation.valid) {
    throw new Error(priceValidation.error);
  }

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

/**
 * 製品詳細取得時に閲覧を記録
 */
// 製品詳細取得時に閲覧を記録
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

/**
 * 製品作成（バリデーション付き）
 */
const createProduct = async (
  categoryId, name, description, price, stock, sku, imageUrl,
) => {
  // 各フィールドのバリデーション
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

  // カテゴリーが存在し、有効であることを確認
  const category = await productCategoryModel.findById(categoryId);
  if (!category) throw new Error("指定されたカテゴリーが見つかりません");
  if (!category.is_active) throw new Error("無効なカテゴリーは使用できません");

  const id = await productModel.create(
    categoryId, name, description, price, stock, sku, imageUrl,
  );
  return { id, categoryId, name, description, price, stock, sku, imageUrl };
};

/**
 * 製品更新（変更フィールドのみバリデーション）
 */
const updateProduct = async (id, fields) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // 変更されたフィールドのみバリデーション
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

  const affected = await productModel.update(id, fields);
  if (affected === 0) throw new Error("Product not found");

  return { id, ...fields };
};

/**
 * 製品削除
 */
const deleteProduct = async (id) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  const affected = await productModel.deleteById(id);
  return affected > 0;
};

/**
 * 人気製品取得（閲覧数上位）
 */
const getPopularProducts = async (limit = 10) => {
  if (limit < 1 || limit > 100) {
    throw new Error("取得件数は1~100の範囲で指定してください");
  }
  return await productModel.findPopular(limit);
};

module.exports = {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPopularProducts,
};
```

**ページネーションパターンの解説:**

```
レスポンス例: GET /api/products?page=2&limit=10

{
  "data": [ ... 10件の製品 ... ],
  "pagination": {
    "page": 2,       ← 現在のページ番号
    "limit": 10,     ← 1ページあたりの件数
    "total": 45,     ← 全件数
    "pages": 5       ← 全ページ数（Math.ceil(45/10) = 5）
  }
}

フロントエンドはこの情報を使って:
├── 「前のページ」「次のページ」ボタンの表示/非表示
├── 「全45件中11-20件を表示」のメッセージ
└── ページ番号リンクの生成
```

### 手順 3-5: 製品コントローラーの作成

#### ファイル: `backend/src/controllers/productController.js`

```javascript
const {
  listCategories,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPopularProducts,
} = require("../services/productService");

// カテゴリー一覧  GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    const categories = await listCategories(
      is_active === "false" ? false : true,
    );
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

// 製品一覧（フィルター・ページング）  GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const filters = {
      category_id: req.query.category_id
        ? parseInt(req.query.category_id) : undefined,
      min_price: req.query.min_price
        ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query.max_price
        ? parseFloat(req.query.max_price) : undefined,
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

// 製品詳細  GET /api/products/:id
const getProductDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // ユーザーID（認証済みの場合）
    const userId = req.user ? req.user.id : null;

    // IPアドレス取得
    const ipAddress = req.ip || req.connection.remoteAddress;

    const product = await getProduct(id, userId, ipAddress);
    res.status(200).json(product);
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ message: "Product not found " });
    }
    next(err);
  }
};

// 製品作成  POST /api/products
const postProduct = async (req, res, next) => {
  try {
    const { category_id, name, description, price, stock, sku, image_url } =
      req.body;

    // 必須フィールドチェック
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

    const product = await createProduct(
      category_id, name, description, price, stock, sku, image_url,
    );
    res.status(201).json(product);
  } catch (err) {
    if (err.message.includes("Category not found")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

// 製品更新  PUT /api/products/:id
const putProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // 変更対象のフィールドを収集
    const fields = {};
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

// 製品削除  DELETE /api/products/:id
const deleteProductHandler = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    await deleteProduct(id);
    res.status(204).send();
  } catch (err) {
    if (err.message === "Product not found") {
      return res.status(404).json({ error: "Product not found" });
    }
    next(err);
  }
};

// 人気製品取得  GET /api/products/popular
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

module.exports = {
  getCategories,
  getProducts,
  getProductDetail,
  postProduct,
  putProduct,
  deleteProductHandler,
  getPopularProductsHandler,
};
```

### 手順 3-6: 製品ルートの作成

#### ファイル: `backend/src/routes/products.js`

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
  getPopularProductsHandler,
} = require("../controllers/productController");

const router = express.Router();

// カテゴリーエンドポイント（公開）
router.get("/categories", getCategories);

// 人気製品エンドポイント（/products/:idより前に配置）
router.get("/popular", getPopularProductsHandler);

// 製品エンドポイント
router.get("/", getProducts);             // 一覧取得（公開）
router.post("/", postProduct);            // 作成
router.get("/:id", authenticate, getProductDetail);     // 詳細取得（認証必須）
router.put("/:id", putProduct);           // 更新
router.delete("/:id", deleteProductHandler); // 削除

module.exports = router;
```

> **ルート定義の順番に注意:** `/categories` は `/:id` より前に配置する必要があります。もし `/:id` が先だと、`/categories` という文字列が `:id` パラメータとして解釈されてしまいます。

### 手順 3-7: ルーティング統合ファイルを更新

#### ファイル: `backend/src/routes/index.js`（Phase 3 版）

```javascript
const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");
const productRoutes = require("./products");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);

module.exports = router;
```

### 手順 3-8: 動作確認

```bash
# 全製品取得
curl -s http://localhost:3000/api/products | jq .

# カテゴリー一覧
curl -s http://localhost:3000/api/products/categories | jq .

# フィルター付き取得（カテゴリーID=1、価格10000円以上）
curl -s "http://localhost:3000/api/products?category_id=1&min_price=10000" | jq .

# ページング（2ページ目、5件ずつ）
curl -s "http://localhost:3000/api/products?page=2&limit=5" | jq .

# 全文検索
curl -s "http://localhost:3000/api/products?search=スマートフォン" | jq .

# 価格の安い順
curl -s "http://localhost:3000/api/products?sort=price&order=asc" | jq .

# 製品詳細（関連製品付き）
curl -s http://localhost:3000/api/products/1 | jq .

# 製品作成
curl -s -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "MacBook Pro",
    "description": "M3チップ搭載ノートPC",
    "price": 250000,
    "stock": 10,
    "sku": "SKU-MBP-001"
  }' | jq .
```

**Phase 3 完了！** 製品・カテゴリー API が動作しています。

---

## 6. Phase 4: JWT認証システム

### 学習ポイント: JWT認証の仕組み

```
1. ユーザー登録（POST /api/auth/register）
   クライアント → サーバーに { name, email, password } を送信
   サーバー     → パスワードを bcrypt でハッシュ化してDBに保存
              → JWT トークンを生成して返却
   レスポンス   → { user: { id, name, email, role }, token: "eyJhbG..." }

2. ログイン（POST /api/auth/login）
   クライアント → サーバーに { email, password } を送信
   サーバー     → bcrypt.compare でパスワードを検証
              → JWT トークンを生成して返却
   レスポンス   → { user: { id, name, email, role }, token: "eyJhbG..." }

3. 認証付きリクエスト（GET /api/auth/me 等）
   クライアント → ヘッダーに Authorization: Bearer eyJhbG... をセット
   サーバー     → トークンを検証し、ユーザー情報を取得
              → req.user にユーザー情報をセットして次の処理へ
   レスポンス   → { user: { id, name, email, role } }
```

**JWT（JSON Web Token）の構造:**

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIn0.abcdef...
├── ヘッダー ──────┤├── ペイロード（データ）──────────────┤├── 署名 ──┤

ヘッダー  : 暗号アルゴリズム情報（HS256等）
ペイロード: ユーザーID, メールアドレス, ロール等のデータ
           （Base64エンコード。暗号化ではないので誰でも読める！）
署名      : JWT_SECRET を使って生成した改ざん防止用の文字列

重要: ペイロードは「暗号化」ではなく「エンコード」されているだけ
      → パスワードや機密情報はペイロードに入れない！

サーバーは署名を検証することで:
  1. トークンが改ざんされていないことを確認
  2. トークンの有効期限を確認
  3. ユーザー情報を取得（DBアクセスなしで）
```

### 手順 4-1: JWTユーティリティの作成

```bash
mkdir -p src/utils
```

#### ファイル: `backend/src/utils/jwtUtils.js`

```javascript
const jwt = require("jsonwebtoken");

/**
 * JWTトークンを生成
 * @param {Object} payload - トークンに含めるデータ（userId, email, role等）
 * @returns {String} - JWT文字列（例: "eyJhbGci..."）
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * JWTトークンを検証し、デコードされたペイロードを返す
 * @param {String} token - 検証するトークン
 * @returns {Object} - デコードされたペイロード（userId, email, role等）
 * @throws {Error} - トークンが無効または期限切れの場合
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

**jwt.sign() の引数:**

```javascript
jwt.sign(
  { userId: 1, email: "test@test.com", role: "user" },  // ペイロード
  "秘密鍵の文字列",                                        // JWT_SECRET
  { expiresIn: "7d" }                                     // オプション（有効期限）
);

// expiresIn の指定方法:
// "7d"  = 7日間
// "24h" = 24時間
// "30m" = 30分
// 3600  = 3600秒（1時間）
```

### 手順 4-2: 認証バリデーターの作成

#### ファイル: `backend/src/validators/authValidator.js`

```javascript
// メールアドレスの簡易バリデーション
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * ログインペイロードのバリデーション
 * @param {{ email: string, password: string }} payload
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateLoginPayload = ({ email, password }) => {
  const errors = [];
  if (!isEmail(email || "")) errors.push("email is invalid");
  if (!password || password.length < 8)
    errors.push("password must be at least 8 chars");
  return { valid: errors.length === 0, errors };
};

module.exports = { validateLoginPayload };
```

**正規表現の解説:**

```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/

^          → 文字列の先頭
[^\s@]+    → スペース(@以外)の1文字以上（ユーザー名部分）
@          → @マーク
[^\s@]+    → スペース(@以外)の1文字以上（ドメイン部分）
\.         → ドット（.）
[^\s@]+    → スペース(@以外)の1文字以上（TLD部分: com, jp等）
$          → 文字列の末尾

例: test@example.com → マッチ（有効）
例: @example.com     → 不一致（ユーザー名がない）
例: test@.com        → 不一致（ドメインがない）
```

### 手順 4-3: 認証サービスの作成

#### ファイル: `backend/src/services/authService.js`

```javascript
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwtUtils");
const {
  findByEmail,
  findByEmailWithPassword,
  createAuthUser,
  setLastLoginAt,
  findByIdForAuth,
} = require("../models/userModel");

/**
 * メールアドレスでユーザー検索（登録時の重複チェック用）
 */
const getUserByEmail = async (email) => {
  return findByEmail(email);
};

/**
 * 認証用ユーザー情報取得
 */
const getUserForAuth = async (userId) => {
  return findByIdForAuth(userId);
};

/**
 * ユーザー登録
 *
 * 処理の流れ:
 * 1. パスワードをbcryptでハッシュ化（コスト因子: 10）
 * 2. DBにユーザーを作成
 * 3. JWTトークンを生成して返却
 */
const registerUser = async ({ name, email, password }) => {
  // パスワードのハッシュ化
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = await createAuthUser(name, email, hashedPassword);

  // JWTトークン生成
  const token = generateToken({
    userId,
    email,
    role: "user",
  });

  return {
    user: { id: userId, name, email, role: "user" },
    token,
  };
};

/**
 * ログイン
 *
 * 処理の流れ:
 * 1. メールアドレスでユーザーを検索（パスワード付き）
 * 2. アカウントの有効性チェック
 * 3. bcrypt.compare でパスワードを検証
 * 4. 最終ログイン日時を更新
 * 5. JWTトークンを生成して返却
 */
const loginUser = async ({ email, password }) => {
  // 1. ユーザーを取得（パスワード含む）
  const user = await findByEmailWithPassword(email);
  if (!user) return { error: "INVALID_CREDENTIALS" };

  // 2. アカウント有効性チェック
  if (!user.is_active) return { error: "ACCOUNT_DISABLED" };

  // 3. パスワード検証
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return { error: "INVALID_CREDENTIALS" };

  // 4. 最終ログイン日時を更新
  await setLastLoginAt(user.id);

  // 5. トークン生成
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

module.exports = {
  getUserByEmail,
  getUserForAuth,
  registerUser,
  loginUser,
};
```

**bcryptの仕組みを詳しく解説:**

```
■ ハッシュ化（登録時）
  bcrypt.hash("password123", 10)
  → "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O"

  $2b$     → bcrypt バージョン
  10$      → コスト因子（2^10 = 1024回のハッシュ反復）
  Eix...   → ランダムなソルト（毎回異なる）
  ZVZ...   → ハッシュ値

  ※同じパスワードでも毎回異なるハッシュが生成される（ソルトが違うため）

■ 検証（ログイン時）
  bcrypt.compare("password123", ハッシュ値)
  → true（元のパスワードと一致）
  → false（不一致）

  ※元のパスワードを「復元」するのではなく、
    入力されたパスワードに同じソルトでハッシュ化して結果を比較する

■ コスト因子 10 の意味
  推奨値: 10〜12
  低すぎる(5以下): ブルートフォース攻撃に弱い
  高すぎる(15以上): ログインに数秒かかりUXが悪化
```

### 手順 4-4: 認証コントローラーの作成

#### ファイル: `backend/src/controllers/authController.js`

```javascript
const { validateLoginPayload } = require("../validators/authValidator");
const {
  getUserByEmail,
  registerUser,
  loginUser,
} = require("../services/authService");

/**
 * ユーザー登録
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. バリデーション
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Name, email, and password are required",
          code: "VALIDATION_ERROR",
        },
      });
    }

    // パスワードの強度チェック（最低8文字）
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Password must be at least 8 characters long",
          code: "WEAK_PASSWORD",
        },
      });
    }

    // メールアドレスの形式チェック（簡易版）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid email format",
          code: "INVALID_EMAIL",
        },
      });
    }

    // 2. 既存ユーザーチェック
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: "Email already exists",
          code: "EMAIL_EXISTS",
        },
      });
    }

    // 3. 登録処理(bcrypt/JWTはサービス層で処理)
    const { user, token } = await registerUser({ name, email, password });

    // 4. レスポンス（パスワードは含めない）
    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    console.error("Registration error", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
      },
    });
  }
};

/**
 * ログイン
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. バリデーション
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Email and password are required",
          code: "VALIDATION_ERROR",
        },
      });
    }

    // 2. ログイン処理(bcrypt/JWTはサービス層で処理)
    const result = await loginUser({ email, password });

    if (result.error === "ACCOUNT_DISABLED") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Account is disabled",
          code: "ACCOUNT_DISABLED",
        },
      });
    }

    if (result.error === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
      });
    }

    // 3. レスポンス（パスワードは含めない）
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
      },
    });
  }
};

/**
 * 現在のユーザー情報取得
 * GET /api/auth/me
 * ミドルウェア: authenticate
 */
const getCurrentUser = (req, res) => {
  // authenticate ミドルウェアで req.user が設定済み
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
};

/**
 * ログアウト
 * POST /api/auth/logout
 *
 * JWT方式ではサーバー側での処理不要（クライアント側でトークン削除）
 * 将来的にトークンブラックリストを実装する場合はここに追加
 */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: "Logged out successfully",
    },
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
};
```

**認証コントローラーのHTTPステータスコード使い分け:**

```
201 Created    → 登録成功
200 OK         → ログイン成功、ユーザー情報取得成功
400 Bad Request → 入力値不足（name/email/password）
401 Unauthorized → 認証失敗（パスワード不一致、トークン無効）
403 Forbidden  → アカウント無効化
409 Conflict   → メールアドレスが既に登録済み
500 Internal   → サーバー内部エラー
```

### 手順 4-5: 認証ミドルウェアの作成

#### ファイル: `backend/src/middlewares/authMiddleware.js`

```javascript
const { verifyToken } = require("../utils/jwtUtils");
const { pool } = require("../config/db");

/**
 * 認証ミドルウェア
 *
 * リクエストヘッダーの Authorization から JWT を取得・検証し、
 * req.user にユーザー情報を設定する。
 *
 * 使い方: router.get("/me", authenticate, handler)
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. ヘッダーからトークンを取得
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

    // 2. "Bearer eyJhbG..." から "eyJhbG..." 部分を抽出
    const token = authHeader.substring(7);

    // 3. トークンを検証してデコード
    const decoded = verifyToken(token);
    // decoded = { userId: 1, email: "...", role: "admin", iat: ..., exp: ... }

    // 4. DBからユーザーの最新情報を取得（is_active の最新状態を確認）
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

    // 5. アカウントが有効かチェック
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Account is disabled",
          code: "ACCOUNT_DISABLED",
        },
      });
    }

    // 6. req.user にユーザー情報を設定 → 後続のハンドラーで利用可能
    req.user = user;

    next();  // 次のミドルウェア or コントローラーへ
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
 * 認可ミドルウェア（役割ベースのアクセス制御）
 *
 * 使い方: router.get("/admin", authenticate, authorize("admin"), handler)
 *
 * @param {...String} allowedRoles - 許可する役割名（"admin", "user" 等）
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // authenticate が先に実行されていることが前提
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
          code: "NOT_AUTHENTICATED",
        },
      });
    }

    // ユーザーの役割が許可リストに含まれているかチェック
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Access denied. Insufficient permissions",
          code: "FORBIDDEN",
        },
      });
    }

    next();  // 権限OK → 次のハンドラーへ
  };
};

module.exports = {
  authenticate,
  authorize,
};
```

**認証フローの詳細:**

```
リクエスト: GET /api/users
Authorization: Bearer eyJhbGci...

  ↓ authenticate ミドルウェア
  ├── 1. ヘッダーから "eyJhbGci..." を取得
  ├── 2. JWT_SECRET で署名を検証 → { userId: 1, role: "admin" }
  ├── 3. DB query: SELECT ... FROM users WHERE id = 1
  ├── 4. is_active = true を確認
  └── 5. req.user = { id: 1, name: "管理者", role: "admin" } をセット
         ↓ next()
  ↓ authorize("admin") ミドルウェア
  ├── 6. req.user.role === "admin" → ["admin"].includes("admin") → true
  └── 7. OK!
         ↓ next()
  ↓ getUsers コントローラー
  └── 8. 通常の処理を実行（ユーザー一覧取得）

もし一般ユーザー（role: "user"）が /api/users にアクセスすると:
  ↓ authorize("admin")
  └── req.user.role === "user" → ["admin"].includes("user") → false
      → 403 Forbidden: "Access denied. Insufficient permissions"
```

### 手順 4-6: 認証ルートの作成

#### ファイル: `backend/src/routes/auth.js`

```javascript
const express = require("express");
const {
  register,
  login,
  getCurrentUser,
  logout,
} = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

// 公開エンドポイント（認証不要）
router.post("/register", register);   // POST /api/auth/register
router.post("/login", login);         // POST /api/auth/login

// 保護されたエンドポイント（認証必要）
router.get("/me", authenticate, getCurrentUser);   // GET  /api/auth/me
router.post("/logout", authenticate, logout);      // POST /api/auth/logout

module.exports = router;
```

### 手順 4-7: ユーザールートに認証を追加

Phase 2で作成したユーザールートを修正し、全エンドポイントに認証+管理者権限を要求するようにします。

#### ファイル: `backend/src/routes/users.js`（Phase 4 最終版）

```javascript
const express = require("express");
const {
  getUsers,
  getUser,
  postUser,
  putUser,
  patchUserHandler,
  deleteUser,
} = require("../controllers/userController");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

const router = express.Router();

// router.use() で全ルートに共通のミドルウェアを適用
// → このファイル内の全エンドポイントが認証 + admin権限を要求
router.use(authenticate);
router.use(authorize("admin"));

router.get("/", getUsers);
router.get("/:id", getUser);
router.post("/", postUser);
router.put("/:id", putUser);
router.patch("/:id", patchUserHandler);
router.delete("/:id", deleteUser);

module.exports = router;
```

### 手順 4-8: ルーティング統合ファイルの最終版

#### ファイル: `backend/src/routes/index.js`（最終版）

```javascript
const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");
const productRoutes = require("./products");
const authRoutes = require("./auth");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);

module.exports = router;
```

### 手順 4-9: 動作確認

```bash
# === 1. ユーザー登録 ===
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テスト太郎",
    "email": "test@example.com",
    "password": "password123"
  }' | jq .

# 期待: { "success": true, "data": { "user": { ... }, "token": "eyJ..." } }

# === 2. ログイン（シードデータの管理者アカウント） ===
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.data.token')

echo "Admin Token: $ADMIN_TOKEN"

# === 3. 自分の情報取得 ===
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 期待: { "success": true, "data": { "user": { "id": 1, "role": "admin", ... } } }

# === 4. ユーザー一覧取得（管理者トークン必須） ===
curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# === 5. 認証なしでアクセス → 401エラー ===
curl -s http://localhost:3000/api/users | jq .
# → { "success": false, "error": { "code": "NO_TOKEN", ... } }

# === 6. 一般ユーザーでアクセス → 403エラー ===
USER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.token')

curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $USER_TOKEN" | jq .
# → { "success": false, "error": { "code": "FORBIDDEN", ... } }

# === 7. ログアウト ===
curl -s -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
# → { "success": true, "data": { "message": "Logged out successfully" } }
```

**Phase 4 完了！** JWT認証システムが動作しています。

---

## 7. Phase 5: セキュリティ強化とパフォーマンス最適化

Phase 4 までで基本機能は完成しました。Phase 5 では、実運用を見据えた **クエリパラメータバリデーション**（SQLインジェクション対策）と **閲覧履歴キャッシュ**（DB負荷軽減）を実装します。

### 7.1 この Phase で学べること

| テーマ | 学習内容 |
|---|---|
| **SQLインジェクション** | Webアプリ最大の脆弱性の仕組みと対策 |
| **ホワイトリスト方式** | 許可された値のみ受け入れるセキュリティパターン |
| **多層防御** | フロントエンド＋バックエンド＋DB層の3層防御 |
| **Write-Behind キャッシュ** | 書き込みをバッファリングして遅延実行するパターン |
| **バッチ INSERT** | 複数レコードを1回のSQL文で挿入する手法 |
| **DBトランザクション** | ACID特性、トランザクションの使いどころ |
| **グレースフルシャットダウン** | サーバー停止時にバッファデータを失わない方法 |

---

### 7.2 クエリパラメータバリデーション — SQLインジェクション対策

#### 7.2.1 現状の問題点

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

**良い点:** `sortField` はオブジェクトのキーマッチで制限されているため、`sort` パラメータ自体はある程度安全。

**問題点:**
1. **バリデーションがモデル層でしか行われていない** — 不正な値がコントローラーやサービス層を通過して到達する
2. **`order` パラメータは "desc" 以外なら何でも "ASC" になる** — 不正な値（`order=xx:x;x`）がエラーにならず黙って通過する
3. **`page`, `limit` にも文字列注入が可能** — `parseInt` で NaN になるケースの処理が不十分
4. **`search` パラメータにXSSやSQLインジェクション文字列が入り得る**

#### 7.2.2 SQLインジェクションとは？

SQLインジェクションとは、**ユーザー入力を通じて意図しないSQLコマンドを注入する攻撃手法**です。

```
[正常] SELECT * FROM products ORDER BY price ASC
                                       ↑ ユーザー入力

[攻撃] SELECT * FROM products ORDER BY price; DROP TABLE products; -- ASC
                                       ↑ ユーザーが悪意ある文字列を注入
```

| リスク | 具体例 |
|---|---|
| **データ漏洩** | 全ユーザーのメールアドレス・パスワードハッシュが流出 |
| **データ改ざん** | 商品価格を0円に書き換え |
| **データ削除** | テーブルごと削除（DROP TABLE） |
| **権限昇格** | 一般ユーザーを管理者に昇格 |

**防御の3原則:**

| 手法 | 説明 | 本アプリでの実装 |
|---|---|---|
| **プリペアドステートメント** | `?` プレースホルダでパラメータをバインド | ✅ `mysql2` の `pool.query(sql, params)` で実装済み |
| **ホワイトリスト** | 許可された値のみ受け入れる | ⬜ **今回追加する** |
| **入力サニタイズ** | 危険な文字をエスケープ・除去 | ⬜ **今回追加する** |

> **ポイント:** `mysql2` のプリペアドステートメントは `WHERE` 句の値（`?`）には有効ですが、`ORDER BY` や `LIMIT` のようなSQL構文の一部に変数を埋め込む場合は効きません。だからこそホワイトリスト方式が必要です。

#### 7.2.3 ホワイトリスト方式の解説

```
❌ ブラックリスト方式: 「これは禁止」→ 未知の攻撃に弱い
✅ ホワイトリスト方式: 「これだけ許可」→ 未知の攻撃にも強い
```

```javascript
// ホワイトリストの例
const ALLOWED_SORT_FIELDS = ["price", "rating", "created_at"];
if (!ALLOWED_SORT_FIELDS.includes(userInput.sort)) {
  throw new Error("不正なソートフィールド");
}
```

これにより、`sort=id;DROP TABLE products` のような値は「ホワイトリストに無い」ため即座に拒否されます。

#### 手順 5-1: クエリバリデータの作成

##### ファイル: `backend/src/validators/queryValidator.js`（新規作成）

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
 * キー: クエリパラメータの値 / 値: SQLで使用する実際のカラム名
 * ※新しいソートフィールドを追加する場合はここに追加する
 */
const ALLOWED_SORT_FIELDS = {
  price: "p.price",
  rating: "p.rating",
  created_at: "p.created_at",
};

/** 許可されたソート方向 */
const ALLOWED_ORDER_DIRECTIONS = ["asc", "desc"];

// ========================================
// バリデーション関数
// ========================================

/**
 * ソートフィールドのバリデーション
 * 未指定の場合は "created_at" をデフォルト値として返す
 */
const validateSort = (sort) => {
  if (sort === undefined || sort === null || sort === "") {
    return { valid: true, error: null, value: "created_at" };
  }
  if (typeof sort !== "string") {
    return { valid: false, error: "sortは文字列で指定してください", value: null };
  }
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
 * 未指定の場合は "asc" をデフォルト値として返す
 */
const validateOrder = (order) => {
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

/** ページ番号のバリデーション */
const validatePage = (page) => {
  if (page === undefined || page === null || page === "") {
    return { valid: true, error: null, value: 1 };
  }
  const parsed = parseInt(page, 10);
  if (isNaN(parsed)) {
    return { valid: false, error: "pageは数値で指定してください", value: null };
  }
  if (parsed < 1) {
    return { valid: false, error: "pageは1以上で指定してください", value: null };
  }
  if (parsed > 10000) {
    return { valid: false, error: "pageは10000以下で指定してください", value: null };
  }
  return { valid: true, error: null, value: parsed };
};

/** 1ページあたりの件数バリデーション */
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
  if (parsed > 100) {
    return { valid: false, error: "limitは100以下で指定してください", value: null };
  }
  return { valid: true, error: null, value: parsed };
};

/**
 * 検索キーワードのサニタイズ
 * FULLTEXT検索に使われるため、制御文字を除去する
 */
const validateSearch = (search) => {
  if (search === undefined || search === null || search === "") {
    return { valid: true, error: null, value: undefined };
  }
  if (typeof search !== "string") {
    return { valid: false, error: "searchは文字列で指定してください", value: null };
  }
  if (search.length > 200) {
    return { valid: false, error: "検索キーワードは200文字以内にしてください", value: null };
  }
  const sanitized = search.replace(/[\x00-\x1F]/g, "");
  return { valid: true, error: null, value: sanitized };
};

/**
 * 製品一覧クエリパラメータの一括バリデーション
 * @param {Object} query - req.query（Express のクエリパラメータ）
 * @returns {{ valid: boolean, errors: string[], sanitized: Object }}
 */
const validateProductListQuery = (query) => {
  const errors = [];
  const sanitized = {};

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

  return { valid: errors.length === 0, errors, sanitized };
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
- `ALLOWED_SORT_FIELDS` はオブジェクト形式で、フロントエンドが送る値（`price`）とSQLカラム名（`p.price`）のマッピングを兼ねる
- 各関数は `{ valid, error, value }` の統一フォーマットを返す（他のバリデーターと同じ規則）
- `validateProductListQuery` は複数のエラーをまとめて返せるため、ユーザーが一度で全問題を把握できる

#### 手順 5-2: バリデーションミドルウェアの作成

##### ファイル: `backend/src/middlewares/validateQuery.js`（新規作成）

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
  req.validatedQuery = result.sanitized;
  next();
};

module.exports = { validateProductQuery };
```

**ポイント:**
- `req.validatedQuery` にサニタイズ済みの値を格納。`req.query`（生の値）を使わせないのが重要
- エラー時は `next()` を呼ばず 400 レスポンスを返して打ち切る

#### 手順 5-3: ルーターへのミドルウェア適用

##### ファイル: `backend/src/routes/products.js`（修正）

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

router.get("/categories", getCategories);
router.get("/popular", getPopularProductsHandler);

// ↓↓↓ 変更: validateProductQuery ミドルウェアを追加
router.get("/", validateProductQuery, getProducts);
router.post("/", postProduct);
router.get("/:id", authenticate, getProductDetail);
router.put("/:id", putProduct);
router.delete("/:id", deleteProductHandler);

module.exports = router;
```

**Express ミドルウェアチェーン:**
```
router.get("/", validateProductQuery, getProducts);
                ↑ まずこれが実行         ↑ next()が呼ばれたら実行
```

#### 手順 5-4: コントローラーの修正

##### ファイル: `backend/src/controllers/productController.js`（修正）

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

**なぜこの変更が重要か:**
- コントローラーの責務が「バリデーション＋ビジネスロジック呼び出し」から「ビジネスロジック呼び出しのみ」に軽量化
- `parseInt` / `parseFloat` の重複処理がなくなる（バリデータで済んでいるため）
- `req.query` を直接触らないため、バリデーション漏れの危険がゼロ

#### 手順 5-5: モデル層の防御強化

##### ファイル: `backend/src/models/productModel.js`（修正）

多層防御（Defense in Depth）のため、モデル層もホワイトリストをインポートして使用します。

```javascript
// ファイル先頭に追加
const { ALLOWED_SORT_FIELDS } = require("../validators/queryValidator");

// findAll 関数内のソート部分を修正
  const sortField = ALLOWED_SORT_FIELDS[filters.sort] || "p.created_at";
  const sortOrder = filters.order === "desc" ? "DESC" : "ASC";
  query += ` ORDER BY ${sortField} ${sortOrder}`;
```

#### 手順 5-6: エラーミドルウェアの拡張

##### ファイル: `backend/src/middlewares/error.js`（修正）

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
    message.includes("不正な") ||    // ← 追加
    message.includes("許可値")       // ← 追加
  ) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
  }
```

> **補足:** 通常、クエリバリデーションエラーは `validateProductQuery` ミドルウェアが直接 400 を返すためこの `errorHandler` には到達しません。ここでの追加は、Service/Model 層で直接 queryValidator を使用した場合の**多層防御（予防的措置）**です。

#### 手順 5-7: 動作確認

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

期待されるエラーレスポンス例：

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

**セキュリティチェックリスト:**

- [ ] `GET /api/products?sort=price&order=desc` → 正常に製品一覧が返る
- [ ] `GET /api/products?sort=xxx` → 400エラー
- [ ] `GET /api/products?order=xxx` → 400エラー
- [ ] `GET /api/products?page=abc` → 400エラー
- [ ] `GET /api/products?sort=id;DROP TABLE products` → 400エラー
- [ ] Dashboard の「新着を見る」「高評価を見る」リンクが正常動作

---

### 7.3 閲覧履歴キャッシュ — Write-Behind パターン

#### 7.3.1 キャッシュとは何か？

**キャッシュ (Cache)** とは、「頻繁にアクセスされるデータや、すぐに処理する必要のないデータを一時的に保存する仕組み」です。

```
📚 図書館の例:
  - 本棚（DB）: 10万冊の蔵書がある。探すのに時間がかかる
  - 机の上（キャッシュ）: よく使う5冊を手元に置いておく。すぐ取れる

🛒 スーパーのレジの例:
  - 1個ずつ精算（毎回DB書き込み）: 客が来るたびに1個ずつレジを打つ
  - まとめて精算（バッチ書き込み）: カゴに10個溜めてから一括精算 → 効率的
```

**キャッシュの分類:**

```
【読み取りキャッシュ (Read Cache)】
  目的: DBからの読み取り回数を減らす
  クライアント → キャッシュ → あれば返す → なければDB問い合わせ

【書き込みキャッシュ (Write Cache)】← 今回はこれ
  目的: DBへの書き込み回数を減らす
  クライアント → メモリバッファ → 定期的にDB一括書込
```

今回採用するのは **Write-Behind (Write-Back) キャッシュ** パターンです：

```
【従来: Write-Through（現行コード）】
  リクエスト1 → INSERT INTO product_views ... → DB
  リクエスト2 → INSERT INTO product_views ... → DB
  リクエスト3 → INSERT INTO product_views ... → DB
  → DBへの書き込み: 3回

【改善: Write-Behind（今回の実装）】
  リクエスト1 → メモリバッファに追加
  リクエスト2 → メモリバッファに追加
  リクエスト3 → メモリバッファに追加
  (30秒経過) → INSERT INTO product_views VALUES (...),(...),(...) → DB
  → DBへの書き込み: 1回
```

| 項目 | メリット | リスク |
|---|---|---|
| **パフォーマンス** | DB書き込み回数が大幅に減る | — |
| **レスポンス** | APIレスポンスがDB書き込みを待たない | — |
| **コネクション** | DB接続プールの枯渇を防ぐ | — |
| **データ損失** | — | サーバークラッシュ時にバッファ内データが失われる |
| **即時性** | — | データがDBに反映されるまで最大30秒の遅延 |

> **このアプリにおける判断:** 閲覧履歴は「統計的データ」であり、数件の欠損は許容できます。一方、注文データやユーザー認証データにこのパターンを適用するのは**絶対にNG**です。

#### 7.3.2 現状の問題

現在の `productService.getProduct()` は、製品詳細を取得するたびに `INSERT INTO product_views` を実行しています：

```javascript
// backend/src/services/productService.js（現行コード）
const getProduct = async (id, userId = null, ipAddress = null) => {
  const product = await productModel.findById(id);    // SELECT（読み取り）
  if (!product) throw new Error("Product not found");
  try {
    await productModel.recordView(id, userId, ipAddress);  // ← 毎回INSERT
  } catch (err) {
    console.error("Failed to record view:", err);
  }
  return product;
};
```

#### 7.3.3 キャッシュ戦略の比較

| 戦略 | 概要 | メリット | デメリット | 適用場面 |
|---|---|---|---|---|
| **A: インメモリ配列** | Node.js の配列にバッファ | 依存なし、シンプル | プロセス再起動で消失 | **今回採用** |
| **B: node-cache** | npmパッケージ使用 | TTL管理が楽 | 追加依存 | 読み取りキャッシュ向き |
| **C: Redis** | 外部キャッシュサーバー | 永続化、複数プロセス共有 | インフラ追加 | 大規模アプリ |

今回「A: インメモリ配列」を選ぶ理由：外部依存ゼロ、学習に最適、閲覧履歴の欠損許容性に合致、コネクションプールを圧迫しない。

#### 手順 5-8: ViewCache モジュールの作成

> **注意:** 手順 5-8 と手順 5-9 は相互依存しています。`viewCache.js` 内で `productModel.batchRecordViews` を呼び出しますが、この関数は手順 5-9 で追加します。両方を完了してから動作確認してください。

##### ファイル: `backend/src/utils/viewCache.js`（新規作成）

```javascript
/**
 * 閲覧履歴キャッシュ（Write-Behind パターン）
 *
 * 【仕組み】
 * 1. recordView() でメモリバッファに閲覧データを追加
 * 2. 一定間隔（FLUSH_INTERVAL_MS）でバッファをDBに一括書き込み
 * 3. サーバー終了時にグレースフルシャットダウンで残データを書き込み
 *
 * 【なぜシングルトンか？】
 * Node.js の require() はモジュールをキャッシュするため、
 * どのファイルから require("./utils/viewCache") しても
 * 同じインスタンスが返されます。これにより「バッファが1つだけ
 * 存在する」ことが自然に保証されます。
 */

const productModel = require("../models/productModel");

// --- 設定 ---
const FLUSH_INTERVAL_MS = 30 * 1000; // 30秒ごとにDBへ書き込み
const MAX_BUFFER_SIZE = 1000;         // バッファ最大件数（メモリ保護）

// --- 内部状態 ---
let buffer = [];       // { productId, userId, ipAddress, viewedAt }
let flushTimer = null; // setInterval の参照
let isFlushing = false; // flush 中の重複実行防止フラグ

/**
 * 閲覧データをバッファに追加する（同期処理、DBアクセスなし）
 */
const recordView = (productId, userId = null, ipAddress = null) => {
  buffer.push({
    productId,
    userId,
    ipAddress,
    viewedAt: new Date(),
  });

  // メモリ保護: バッファが上限に達したら即フラッシュ
  if (buffer.length >= MAX_BUFFER_SIZE) {
    console.log(
      `[ViewCache] バッファが上限(${MAX_BUFFER_SIZE}件)に達しました。即座にフラッシュします`,
    );
    flush();
  }
};

/**
 * バッファの内容をDBに一括書き込みする
 *
 * 【バッファスワップ方式】
 * flush中に新しいデータが追加されても安全なように、
 * 最初にバッファを切り離してから処理する
 */
const flush = async () => {
  if (isFlushing) return;  // 重複実行防止
  if (buffer.length === 0) return;

  isFlushing = true;

  // バッファをスワップ（切り離し）
  const currentBuffer = buffer;
  buffer = [];  // 新しい空配列を割り当て → flush中の新データは次回処理

  try {
    await productModel.batchRecordViews(currentBuffer);
    console.log(
      `[ViewCache] ${currentBuffer.length}件の閲覧履歴をDBに書き込みました`,
    );
  } catch (err) {
    console.error("[ViewCache] バッチINSERT失敗:", err.message);
    // 失敗データは破棄（バッファに戻すとメモリリーク・無限ループのリスク）
  } finally {
    isFlushing = false;
  }
};

/** 定期フラッシュタイマーを開始（サーバー起動時に1回だけ呼ぶ） */
const startFlushTimer = () => {
  if (flushTimer) {
    console.warn("[ViewCache] フラッシュタイマーは既に起動しています");
    return;
  }
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  // unref(): このタイマーだけが残った場合、Node.jsプロセスの終了を妨げない
  flushTimer.unref();
  console.log(
    `[ViewCache] フラッシュタイマー開始（${FLUSH_INTERVAL_MS / 1000}秒間隔）`,
  );
};

/** タイマーを停止し、残りのバッファをフラッシュ（シャットダウン時に呼ぶ） */
const stopFlushTimer = async () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
    console.log("[ViewCache] フラッシュタイマー停止");
  }
  if (buffer.length > 0) {
    console.log(
      `[ViewCache] シャットダウン: 残り${buffer.length}件をフラッシュ中...`,
    );
    await flush();
  }
};

/** 現在のバッファサイズを取得（モニタリング・テスト用） */
const getBufferSize = () => buffer.length;

module.exports = {
  recordView,
  flush,
  startFlushTimer,
  stopFlushTimer,
  getBufferSize,
};
```

**バッファスワップ方式の解説:**

```javascript
// ❌ 悪い例: バッファを直接操作
const flush = async () => {
  const data = buffer;   // 参照をコピー（同じ配列を指す）
  buffer.length = 0;     // 元配列をクリア → dataも空になる！
  await model.insert(data); // 空配列を挿入してしまう
};

// ✅ 良い例: バッファをスワップ
const flush = async () => {
  const currentBuffer = buffer; // 現在の配列の参照を保存
  buffer = [];                  // 新しい空配列を割り当て
  // currentBuffer は古い配列を指したまま → 安全にDB書き込みできる
  await model.insert(currentBuffer);
};
```

#### 手順 5-9: productModel にバッチ INSERT 関数を追加

##### ファイル: `backend/src/models/productModel.js`（修正 — 関数追加）

既存の `recordView` はそのまま残し（互換性維持）、新しく `batchRecordViews` を追加します。

```javascript
/**
 * 閲覧履歴をバッチINSERTする
 *
 * 【なぜ viewed_at を明示指定するのか？】
 * 既存の recordView は INSERT 時刻 = 閲覧時刻だが、
 * バッチ INSERT では INSERT 時刻 ≠ 閲覧時刻になるため、
 * バッファに追加した時刻（= 実際の閲覧時刻）を viewedAt として明示的に保存する。
 *
 * 【バッチINSERTとは？】
 * 通常: INSERT INTO table VALUES (1, 'a'); × 3回 → 3回のネットワーク往復
 * バッチ: INSERT INTO table VALUES (1, 'a'), (2, 'b'), (3, 'c'); → 1回
 */
const batchRecordViews = async (views) => {
  if (!views || views.length === 0) return 0;

  const placeholders = views.map(() => "(?, ?, ?, ?)").join(", ");
  const params = views.flatMap((v) => [
    v.productId,
    v.userId,
    v.ipAddress,
    v.viewedAt,
  ]);

  const query = `
    INSERT INTO product_views (product_id, user_id, ip_address, viewed_at)
    VALUES ${placeholders}
  `;

  const [result] = await pool.query(query, params);
  return result.affectedRows;
};
```

**module.exports に `batchRecordViews` を追加:**

```javascript
module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  deleteById,
  findPopular,
  recordView,        // ← 既存（互換性維持）
  batchRecordViews,  // ← 新規追加
};
```

#### 手順 5-10: productService の修正

##### ファイル: `backend/src/services/productService.js`（修正）

```javascript
// ファイル先頭に追加
const viewCache = require("../utils/viewCache");

// getProduct 関数を修正
const getProduct = async (id, userId = null, ipAddress = null) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // ↓↓↓ 修正: DB直接INSERTからメモリバッファに変更（同期処理、await不要）
  viewCache.recordView(id, userId, ipAddress);

  return product;
};
```

**変更の本質:**

```
【修正前】 getProduct() → await productModel.recordView() → DB INSERT（~3ms）
【修正後】 getProduct() → viewCache.recordView() → 配列にpush（~0.01ms）
           → 30秒後にバックグラウンドでまとめてDB書き込み
```

#### 手順 5-11: サーバーにグレースフルシャットダウン追加

##### ファイル: `backend/src/server.js`（修正）

```javascript
require("dotenv").config();
const app = require("./app");
const viewCache = require("./utils/viewCache");

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
  // 閲覧履歴キャッシュのフラッシュタイマーを開始
  viewCache.startFlushTimer();
});

/**
 * グレースフルシャットダウン
 *
 * サーバーを停止する際に「優雅に」終了すること:
 * 1. 新しいリクエストの受付を停止
 * 2. 処理中のリクエストが完了するまで待機
 * 3. バッファに溜まったデータをDBに書き込む
 * 4. プロセスを終了
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} を受信。グレースフルシャットダウンを開始します...`);

  server.close(async () => {
    console.log("HTTPサーバーを停止しました");
    try {
      await viewCache.stopFlushTimer();
      console.log("閲覧履歴キャッシュのフラッシュが完了しました");
    } catch (err) {
      console.error("シャットダウン中のエラー:", err);
    }
    process.exit(0);
  });

  // タイムアウト（10秒以内に終了しなければ強制終了）
  setTimeout(() => {
    console.error("シャットダウンタイムアウト。強制終了します");
    process.exit(1);
  }, 10000);
};

// SIGTERM: docker stop, kill コマンドなど（正常終了要求）
// SIGINT:  Ctrl+C（ターミナルからの割り込み）
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

**アプリケーションのライフサイクル全体像:**

```
【起動】
  node src/server.js
    → dotenv.config()                      環境変数読み込み
    → app.listen(port)                     HTTPサーバー起動
    → viewCache.startFlushTimer()          30秒タイマー開始

【稼働中】
  GET /api/products/1
    → productModel.findById(1)             DB読み取り
    → viewCache.recordView(1, userId, ip)  メモリに追加（0ms）
    → res.json(product)

  ... 30秒経過 ...
  [setInterval発火]
    → viewCache.flush()
    → productModel.batchRecordViews(buffer)  DB一括書き込み

【停止】
  Ctrl+C (SIGINT)
    → server.close()                        新規リクエスト停止
    → viewCache.stopFlushTimer()            タイマー停止 + 残りフラッシュ
    → process.exit(0)                       正常終了
```

#### 7.3.4 トランザクションとバッチINSERTの関係

**トランザクション (Transaction)** とは、複数のDB操作をひとまとまりとして扱い、すべて成功 or すべて失敗を保証する仕組みです。

| 特性 | 英語 | 意味 |
|---|---|---|
| **A** | Atomicity (原子性) | 全部成功 or 全部失敗 |
| **C** | Consistency (一貫性) | 整合性が保たれる |
| **I** | Isolation (分離性) | 同時実行が干渉しない |
| **D** | Durability (永続性) | 確定したら消えない |

**今回のバッチINSERTにトランザクションは不要:**
1. 操作が「1つのINSERT文」だけ → 単一SQL文はMySQL内部で自動的にトランザクション処理される
2. 閲覧履歴は部分的な成功/失敗が許容される
3. 他のテーブルとの整合性が不要

**トランザクションが必要な場面（参考）:**

```javascript
// 例: 注文処理（トランザクションが必須）
const createOrder = async (userId, items) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // 1. 注文作成  2. 明細作成  3. 在庫減少
    await connection.commit();            // 全部成功 → 確定
  } catch (err) {
    await connection.rollback();          // 1つでも失敗 → 全部取り消し
    throw err;
  } finally {
    connection.release();
  }
};
```

#### 手順 5-12: キャッシュの動作確認

| テスト | 操作 | 期待結果 |
|---|---|---|
| **基本動作** | 製品詳細を5回閲覧 → 30秒待機 | コンソールに `5件の閲覧履歴をDBに書き込みました` |
| **バッファ空** | 30秒間閲覧なし | フラッシュがスキップされる（ログ出力なし） |
| **グレースフル終了** | 製品を閲覧 → Ctrl+C | `シャットダウン: 残りN件をフラッシュ中...` |
| **DB確認** | テスト後 | `SELECT COUNT(*) FROM product_views` が期待件数 |

```http
### 製品詳細を閲覧（閲覧を記録）
GET http://localhost:3000/api/products/1
Authorization: Bearer {{token}}

### 少し待ってから人気製品を確認（閲覧数が反映されているか）
GET http://localhost:3000/api/products/popular?limit=5
```

**パフォーマンス比較:**

```
【変更前: productService.getProduct()】
  1. productModel.findById(id)      →  1回のSELECT（~5ms）
  2. productModel.recordView(...)   →  1回のINSERT（~3ms）
  合計レスポンス時間: ~8ms / DB操作: 2回/リクエスト

【変更後: productService.getProduct()】
  1. productModel.findById(id)      →  1回のSELECT（~5ms）
  2. viewCache.recordView(...)      →  配列にpush（~0.01ms）
  合計レスポンス時間: ~5ms（37.5%高速化）/ DB操作: 1回/リクエスト + 1回/30秒
```

**Phase 5 完了！** セキュリティ強化とパフォーマンス最適化が完了しました。全フェーズのバックエンド構築が完了しました。

---

## 8. APIエンドポイント一覧

### 認証API

| メソッド | URL | 説明 | 認証 |
|---------|------|------|------|
| POST | `/api/auth/register` | ユーザー登録 | 不要 |
| POST | `/api/auth/login` | ログイン | 不要 |
| GET | `/api/auth/me` | 自分の情報取得 | 必要 |
| POST | `/api/auth/logout` | ログアウト | 必要 |

### ユーザー管理API（管理者のみ）

| メソッド | URL | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/users` | 全ユーザー取得 | admin |
| GET | `/api/users/:id` | ユーザー取得 | admin |
| POST | `/api/users` | ユーザー作成 | admin |
| PUT | `/api/users/:id` | ユーザー全更新 | admin |
| PATCH | `/api/users/:id` | ユーザー部分更新 | admin |
| DELETE | `/api/users/:id` | ユーザー削除 | admin |

### 製品API

| メソッド | URL | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/products` | 全製品取得（フィルター/ページング対応） | 不要 |
| GET | `/api/products/categories` | カテゴリー一覧 | 不要 |
| GET | `/api/products/popular` | 人気製品取得（閲覧数上位） | 不要 |
| GET | `/api/products/:id` | 製品詳細（関連製品付き） | 必要 |
| POST | `/api/products` | 製品作成 | 不要 |
| PUT | `/api/products/:id` | 製品更新 | 不要 |
| DELETE | `/api/products/:id` | 製品削除 | 不要 |

### ヘルスチェック

| メソッド | URL | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/health` | サーバー稼働確認 | 不要 |

### 製品フィルターパラメータ

| パラメータ | 型 | 説明 | 例 |
|-----------|-----|------|-----|
| `category_id` | number | カテゴリーで絞り込み | `?category_id=1` |
| `min_price` | number | 最低価格 | `?min_price=1000` |
| `max_price` | number | 最高価格 | `?max_price=50000` |
| `is_featured` | boolean | おすすめのみ | `?is_featured=true` |
| `search` | string | 全文検索 | `?search=iPhone` |
| `sort` | string | ソート基準（price/rating/created_at） | `?sort=price` |
| `order` | string | ソート順（asc/desc） | `?order=desc` |
| `page` | number | ページ番号（1始まり） | `?page=2` |
| `limit` | number | 1ページの件数（最大100） | `?limit=10` |

---

## 9. 動作確認方法

### 方法1: curlコマンド

```bash
# ヘルスチェック
curl -s http://localhost:3000/api/health | jq .

# ログイン → トークン取得 → 認証付きリクエスト を一連で実行
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r '.data.token')

echo "Token: $TOKEN"

# 認証付きリクエスト
curl -s http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 方法2: VS Code REST Client 拡張機能

VS Code に `REST Client` 拡張機能をインストールし、`.http` ファイルを作成すると、ファイル内のHTTPリクエストをGUIで実行できます。

#### ファイル例: `backend/requests.http`

```http
### 変数定義
@baseUrl = http://localhost:3000/api
@userId = 1

### ヘルスチェック
GET {{baseUrl}}/health

### ユーザー一覧取得（Read All）
GET {{baseUrl}}/users

### ユーザー詳細取得（Read One）
GET {{baseUrl}}/users/{{userId}}

### ユーザー作成（Create）
POST {{baseUrl}}/users
Content-Type: application/json

{
  "name": "Charlie",
  "email": "charlie@example.com"
}

### ユーザー更新（Update）
PUT {{baseUrl}}/users/{{userId}}
Content-Type: application/json

{
  "name": "Charlie Updated",
  "email": "charlie.new@example.com"
}

### ユーザー部分更新（Partial Update）
PATCH {{baseUrl}}/users/{{userId}}
Content-Type: application/json

{
  "name": "Charlie Patched"
}

### ユーザー削除（Delete）
DELETE {{baseUrl}}/users/{{userId}}

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

> 各リクエストの上にある `###` を区切り線として、`Send Request` リンクが表示されます。クリックするとそのリクエストが実行されます。

---

## 10. トラブルシューティング

### 問題 1: "Cannot find module" エラー

**症状:**

```
Error: Cannot find module './routes'
```

**原因:** ファイルが存在しないか、`require()` のパスが間違っている。

**解決策:**

```bash
# ファイルの存在確認
ls -la src/routes/index.js

# require のパスは「現在のファイル」からの相対パス
# src/app.js から src/routes/index.js を参照する場合:
require("./routes")        # ✅ 正しい
require("./routes/index")  # ✅ 正しい（明示的）
require("../routes")       # ❌ 1つ上の階層を見に行ってしまう
```

### 問題 2: DB接続エラー

**症状:**

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**原因:** MySQLが起動していない、または接続先が間違っている。

**解決策:**

```bash
# 1. MySQLコンテナの状態確認
docker compose -f db/docker-compose.yml ps

# 2. コンテナが停止していれば起動
docker compose -f db/docker-compose.yml up -d

# 3. .env の DB_HOST を確認
#    ローカル実行: DB_HOST=127.0.0.1
#    Docker内実行: DB_HOST=db（docker-compose.yml のサービス名）
```

### 問題 3: JWTエラー

**症状:**

```
JsonWebTokenError: jwt must be provided
```

**原因:** `.env` に `JWT_SECRET` が設定されていない。

**解決策:**

```bash
# .env を確認
cat backend/.env | grep JWT_SECRET

# JWT_SECRET が空の場合、64文字以上のランダム文字列を設定
# 生成コマンド:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 問題 4: CORS エラー

**症状:** ブラウザのコンソールに `Access-Control-Allow-Origin` エラーが表示される。

**原因:** バックエンドがCORSを許可していない。

**解決策:**
- `app.js` に `app.use(cors())` があることを確認
- 本コードでは全オリジンを許可しているため、通常は発生しません
- 特定のオリジンのみ許可する場合: `app.use(cors({ origin: "http://localhost:3001" }))`

### 問題 5: "ER_NO_SUCH_TABLE" エラー

**症状:**

```
Error: Table 'app_db.users' doesn't exist
```

**原因:** データベースのマイグレーションが未実行。

**解決策:** `01_DATABASE_GUIDE.md` の手順に戻り、テーブル作成SQLを実行してください。

### 問題 6: bcrypt のインストールエラー

**症状:** `npm install` 時に bcrypt のビルドが失敗する。

**原因:** ネイティブモジュールのビルドに必要なツールが不足。

**解決策:**

```bash
# macOS
xcode-select --install

# または、純JavaScriptの代替パッケージを使用
npm install bcryptjs   # bcrypt の代わり
# ※ コード内の require("bcrypt") を require("bcryptjs") に変更
```

---

## Dockerfile（Docker実行用）

Docker Composeで全体を起動する場合のビルド設定です。

#### ファイル: `backend/Dockerfile`

```dockerfile
# ===== ステージ1: 依存パッケージのインストール =====
FROM node:20-alpine AS builder

WORKDIR /app

# package.json のみをコピーして npm ci 実行
# → package.json が変わらない限りキャッシュが効く
COPY package.json package-lock.json ./
RUN npm ci

# ===== ステージ2: アプリケーション =====
FROM node:20-alpine

WORKDIR /app

# ステージ1でインストールしたnode_modulesをコピー
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

**マルチステージビルドの利点:**

```
ステージ1（builder）: npm ci で全依存パッケージをインストール
  → 開発ツール等もインストールされる

ステージ2（本番用）: 必要なもの（node_modules, src）だけをコピー
  → ビルドツール等は含まれず、イメージサイズが小さくなる
  → node:20-alpine = 軽量Linuxベースで最小限のイメージ
```

---

## まとめ

### 構築したもの

| カテゴリ | エンドポイント数 | 説明 |
|---------|--------------|------|
| 認証 | 4 | 登録、ログイン、自分の情報取得、ログアウト |
| ユーザー | 6 | CRUD + 部分更新（管理者のみ） |
| 製品 | 5 | CRUD + カテゴリー一覧 |
| ヘルス | 1 | サーバー稼動確認 |
| **合計** | **16** | |

### 学んだ概念

| 概念 | 要点 |
|------|------|
| REST API設計 | HTTPメソッド（GET/POST/PUT/PATCH/DELETE）とURL設計 |
| MSCパターン | Model-Service-Controller の責務分離 |
| JWT認証 | トークンベースのステートレス認証 |
| ミドルウェア | 共通処理（認証・エラー処理・ログ）の仕組み |
| セキュリティ | bcryptパスワードハッシュ、SQLインジェクション防止 |
| バリデーション | 入力値検証の実装パターン（統一インターフェース） |
| ページネーション | 大量データの分割取得パターン |
| 動的クエリ構築 | WHERE 1=1 + 条件追加パターン |
| クエリバリデーション | ホワイトリスト方式によるクエリパラメータの安全な検証 |
| Write-Behindキャッシュ | メモリバッファ＋定期バッチINSERTによるDB負荷軽減 |
| グレースフルシャットダウン | サーバー停止時のデータ保全処理 |

### 次のステップ

1. **フロントエンドUI構築** → `03_FRONTEND_GUIDE.md` を参照
2. **Docker統合起動** → `04_STARTUP_GUIDE.md` を参照
