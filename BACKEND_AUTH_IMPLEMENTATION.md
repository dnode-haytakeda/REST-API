# 認証システム実装ガイド【バックエンド編】

> **目的:** セキュアな認証ロジックを実装し、エンドユーザーと管理者を適切に識別・保護する

---

## 📋 目次

1. [前提条件](#前提条件)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [依存関係のインストール](#依存関係のインストール)
4. [環境変数の設定](#環境変数の設定)
5. [ユーティリティ実装](#ユーティリティ実装)
6. [ミドルウェア実装](#ミドルウェア実装)
7. [Auth Controller実装](#auth-controller実装)
8. [Auth Routes実装](#auth-routes実装)
9. [既存ルートの保護](#既存ルートの保護)
10. [テスト方法](#テスト方法)

---

## 前提条件

✅ **データベース準備完了**（`DATABASE_AUTH_IMPLEMENTATION.md` 完了）
- usersテーブルに `password`, `role`, `is_active` カラムが追加済み
- テストアカウントが作成済み

---

## アーキテクチャ設計

### 認証フロー

```
【ユーザー登録】
Client → POST /api/auth/register → Validate → Hash Password → DB Insert → Return {user, token}

【ログイン】
Client → POST /api/auth/login → Find User → Compare Password → Generate JWT → Return {user, token}

【認証が必要な操作】
Client → GET /api/users (with token) → Verify JWT → Check role → Execute → Return data
```

### JWT（JSON Web Token）方式を採用する理由

#### JWT vs Session の比較

| 項目 | JWT | Session |
|------|-----|---------|
| ストレージ | クライアント側（localStorage） | サーバー側（メモリ/DB） |
| スケーラビリティ | ◎ 複数サーバーでも共有不要 | △ セッションストア必要 |
| ステートレス | ◎ サーバーは状態を持たない | ✕ サーバーが状態を保持 |
| セキュリティ | △ XSS対策必要 | ◎ Cookie（httpOnly） |
| 実装の簡単さ | ◎ | △ |

**今回の選択:** JWT（学習コスト・実装の簡単さを優先）

### セキュリティ方針

1. **パスワードハッシュ化**: bcrypt（コスト10）
2. **JWT有効期限**: 7日間
3. **HTTPSのみ**: 本番環境ではHTTPS必須（開発環境はHTTP許可）
4. **role ベース認証**:
   - `user`: エンドユーザー機能のみ
   - `admin`: 全機能アクセス可能

### 既存バックエンド構成に合わせた配置

現在の `backend/src` は **Controller → Service → Model** の階層構成になっているため、
認証機能も同じパターンに揃えます。

```
backend/src
  ├─ controllers/   # リクエスト/レスポンス整形
  ├─ services/      # 認証ロジック（bcrypt/JWT等）
  ├─ models/        # DBアクセス（SQL）
  ├─ middlewares/   # 認証/認可ミドルウェア
  └─ utils/         # JWTユーティリティ等の純粋関数
```

以降の手順はこの構成に沿って記載します。

---

## 依存関係のインストール

### 📁 ターミナル操作

```bash
# backendディレクトリに移動
cd /Users/haytakeda/Sites/RESTAPI/backend

# 必要なパッケージをインストール
npm install bcrypt jsonwebtoken dotenv
```

### パッケージの役割

| パッケージ | バージョン | 役割 |
|-----------|----------|------|
| `bcrypt` | ^5.1.1 | パスワードのハッシュ化・検証 |
| `jsonwebtoken` | ^9.0.2 | JWT の生成・検証 |
| `dotenv` | ^16.4.1 | 環境変数の管理（既にインストール済みの場合はスキップ） |

---

## 環境変数の設定

### 📁 ファイル: `backend/.env`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/.env`

**役割:** JWTシークレットキーを環境変数で管理（Gitにコミットしない）

```bash
# データベース設定（既存）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=app_db

# JWT設定（新規追加）
JWT_SECRET=your_super_secret_key_change_this_in_production_12345
JWT_EXPIRES_IN=7d

# サーバー設定
PORT=3000
NODE_ENV=development
```

### なぜ環境変数で管理するのか？

```javascript
// ❌ 悪い例: コードに直接書く
const secret = 'my_secret_key';  // Gitにコミットされて漏洩リスク

// ✅ 良い例: 環境変数から読み込む
const secret = process.env.JWT_SECRET;  // .envファイルは.gitignoreに追加
```

**理由:**
1. **セキュリティ**: シークレットキーをGitHubに公開しない
2. **環境別の設定**: 開発・本番で異なるキーを使用可能
3. **ベストプラクティス**: 12-Factor Appの原則

### 📁 ファイル: `backend/.env.example`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/.env.example`

**役割:** 環境変数のテンプレート（Gitにコミット可能）

```bash
# データベース設定
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=app_db

# JWT設定
JWT_SECRET=
JWT_EXPIRES_IN=7d

# サーバー設定
PORT=3000
NODE_ENV=development
```

### 📁 ファ イル: `backend/.gitignore`

```bash
node_modules/
.env         # ← これを追加（既にある場合はスキップ）
*.log
```

---

## ユーティリティ実装

### 📁 ファイル: `backend/src/utils/jwtUtils.js`

> 既に `backend/src/utils/iwtUtils.js` がある場合はタイポなので、
> **`jwtUtils.js` にリネーム**して以降は `jwtUtils.js` で統一してください。

```bash
mv backend/src/utils/iwtUtils.js backend/src/utils/jwtUtils.js
```

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/utils/jwtUtils.js`

**役割:** JWT生成・検証のユーティリティ関数

```javascript
const jwt = require('jsonwebtoken');

/**
 * JWTトークンを生成
 * @param {Object} payload - トークンに含めるデータ（user.id, user.role等）
 * @returns {String} - JWT文字列
 */
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * JWTトークンを検証
 * @param {String} token - 検証するトークン
 * @returns {Object} - デコードされたペイロード
 * @throws {Error} - トークンが無効な場合
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
```

### なぜこう書くのか？

#### 1. `jwt.sign()` のペイロード設計

```javascript
const payload = {
  userId: user.id,      // ユーザーID
  email: user.email,    // メールアドレス
  role: user.role       // 役割（user or admin）
};
const token = jwt.sign(payload, secret, { expiresIn: '7d' });
```

**ペイロードに含めるべき情報:**
- ✅ ユーザー識別子（`userId`）
- ✅ 権限情報（`role`）
- ❌ パスワード（絶対に含めない！）
- ❌ センシティブ情報（クレジットカード等）

**理由:** JWTは暗号化されていない（Base64エンコードのみ）ため、誰でもデコード可能

#### 2. `expiresIn` の設定

```javascript
{ expiresIn: '7d' }  // 7日間有効
```

- **短すぎる（1時間）**: ユーザーが頻繁に再ログイン必要 → UX悪い
- **長すぎる（1年）**: トークン漏洩時のリスク大
- **適切（7日）**: バランスが良い

#### 3. try-catch でエラーハンドリング

```javascript
try {
  return jwt.verify(token, secret);
} catch (err) {
  throw new Error('Invalid or expired token');  // 統一されたエラーメッセージ
}
```

**理由:**
- `jwt.verify()` は期限切れ・改ざん検知時に例外をスロー
- エラーを統一的に処理し、上位レイヤーに伝播

---

## モデル/サービス実装

### 📁 ファイル: `backend/src/models/userModel.js`（既存ファイルを更新）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/models/userModel.js`

**追加する関数:** 認証で必要なクエリを `userModel` に集約

```javascript
// 既存の userModel.js に追加
const findByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT id, name, email FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
};

const findByEmailWithPassword = async (email) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, password, role, is_active FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
};

const findByIdForAuth = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, is_active FROM users WHERE id = ?",
    [id],
  );
  return rows[0] || null;
};

const createAuthUser = async (name, email, hashedPassword) => {
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
    [name, email, hashedPassword, "user", true],
  );
  return result.insertId;
};

const setLastLoginAt = async (id) => {
  await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [id]);
};

module.exports = {
  // 既存の exports はそのまま残す
  findByEmail,
  findByEmailWithPassword,
  findByIdForAuth,
  createAuthUser,
  setLastLoginAt,
};
```

### 📁 ファイル: `backend/src/services/authService.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/services/authService.js`

**役割:** bcrypt/JWTを含む認証ロジックをサービス層に集約

```javascript
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwtUtils");
const {
  findByEmail,
  findByEmailWithPassword,
  findByIdForAuth,
  createAuthUser,
  setLastLoginAt,
} = require("../models/userModel");

const getUserByEmail = async (email) => {
  return findByEmail(email);
};

const getUserForAuth = async (userId) => {
  return findByIdForAuth(userId);
};

const registerUser = async ({ name, email, password }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = await createAuthUser(name, email, hashedPassword);

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

const loginUser = async ({ email, password }) => {
  const user = await findByEmailWithPassword(email);
  if (!user) return { error: "INVALID_CREDENTIALS" };
  if (!user.is_active) return { error: "ACCOUNT_DISABLED" };

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return { error: "INVALID_CREDENTIALS" };

  await setLastLoginAt(user.id);

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

## ミドルウェア実装

### 📁 ファイル: `backend/src/middlewares/authMiddleware.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/middlewares/authMiddleware.js`

**役割:** リクエストのJWTを検証し、認証状態を確認

```javascript
const { verifyToken } = require("../utils/jwtUtils");
const { getUserForAuth } = require("../services/authService");

/**
 * 認証ミドルウェア
 * リクエストヘッダーからJWTを取得・検証し、req.userに情報を追加
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. ヘッダーからトークン取得
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_TOKEN',
        },
      });
    }

    // 2. "Bearer TOKEN" から TOKEN 部分を抽出
    const token = authHeader.substring(7);

    // 3. トークン検証
    const decoded = verifyToken(token);

    // 4. DBからユーザー情報を取得（最新のis_active状態を確認）
    const user = await getUserForAuth(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    // 5. アカウント有効性チェック
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is disabled',
          code: 'ACCOUNT_DISABLED',
        },
      });
    }

    // 6. req.user にユーザー情報を追加（次のミドルウェア/コントローラーで使用可能）
    req.user = user;

    next();
  } catch (err) {
    console.error('Authentication error:', err);
    
    return res.status(401).json({
      success: false,
      error: {
        message: err.message || 'Invalid token',
        code: 'INVALID_TOKEN',
      },
    });
  }
};

/**
 * 役割確認ミドルウェア
 * 特定の役割（admin等）のみアクセス可能にする
 * @param {...String} allowedRoles - 許可する役割（'admin', 'user'等）
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // authenticate ミドルウェアの後に呼ばれることを前提
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED',
        },
      });
    }

    // ユーザーの役割が許可リストにあるか確認
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Insufficient permissions.',
          code: 'FORBIDDEN',
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
```

### なぜこう書くのか？

#### 1. Authorization ヘッダーの形式

```javascript
const authHeader = req.headers.authorization;
// 例: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

const token = authHeader.substring(7);  // "Bearer " を除去
```

**なぜ "Bearer" スキーム？**
- HTTP標準の認証スキーム（RFC 6750）
- 他の認証方式（Basic、Digest等）と区別可能

#### 2. DBから最新のユーザー情報を取得する理由

```javascript
const user = await getUserForAuth(decoded.userId);
```

**理由:**
- **JWTは無効化できない** → 発行後は有効期限まで使える
- 管理者がユーザーを無効化（`is_active = FALSE`）しても、既存トークンは有効
- **解決策**: 毎回DBで最新の `is_active` を確認

#### 3. HTTPステータスコードの使い分け

```javascript
401 Unauthorized → 認証が必要（ログインしていない）
403 Forbidden    → 認証済みだが権限不足（管理者じゃない）
```

#### 4. `authorize(...allowedRoles)` の可変長引数

```javascript
// 使用例
router.get('/admin-only', authenticate, authorize('admin'), controller);
router.get('/user-or-admin', authenticate, authorize('user', 'admin'), controller);
```

**理由:**
- 柔軟な権限制御
- 複数の役割を許可可能

---

## Auth Controller実装

### 📁 ファイル: `backend/src/controllers/authController.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/controllers/authController.js`

**役割:** 登録・ログイン・ログアウト・現在のユーザー取得のビジネスロジック

```javascript
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
          message: 'Name, email, and password are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // パスワードの強度チェック（最低8文字）
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD',
        },
      });
    }

    // メールアドレスの形式チェック（簡易版）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        },
      });
    }

    // 2. 既存ユーザーチェック
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already exists',
          code: 'EMAIL_EXISTS',
        },
      });
    }

    // 3. 登録処理（bcrypt/JWTはサービス層で処理）
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
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
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
          message: 'Email and password are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // 2. ログイン処理（bcrypt/JWTはサービス層で処理）
    const result = await loginUser({ email, password });

    if (result.error === "ACCOUNT_DISABLED") {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Account is disabled',
          code: 'ACCOUNT_DISABLED',
        },
      });
    }

    if (result.error === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
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
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
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
      message: 'Logged out successfully',
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

### なぜこう書くのか？

#### 1. パスワードハッシュ化のコスト

```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

**コスト10の意味:**
- 2^10 = 1024回のハッシュ計算
- 処理時間: 約100-200ms（適度な遅延）

**なぜ遅延が必要？**
- ブルートフォース攻撃（総当たり）を遅くする
- コストが高すぎる（例: 15）とログインが遅い

#### 2. セキュリティ: エラメッセージを統一

```javascript
// ❌ 悪い例
if (rows.length === 0) {
  return res.json({ error: 'User not found' });  // ユーザーの存在を教えてしまう
}

// ✅ 良い例
return res.json({ error: 'Invalid email or password' });  // 統一
```

**理由:**
- 攻撃者がメールアドレスの存在を確認できないようにする
- 「パスワードが間違っています」→ メールアドレスは存在することがバレる

#### 3. `bcrypt.compare()` の使い方

```javascript
const isPasswordValid = await bcrypt.compare(password, user.password);
// password: ユーザーが入力した平文パスワード
// user.password: DBに保存されたハッシュ

// 内部処理:
// 1. ハッシュからソルトを抽出
// 2. 入力パスワードを同じソルトでハッシュ化
// 3. ハッシュ同士を比較
```

#### 4. レスポンスにパスワードを含めない

```javascript
// ✅ 正しい
res.json({
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    // password は含めない！
  },
});
```

---

## Auth Routes実装

### 📁 ファイル: `backend/src/routes/auth.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/routes/auth.js`

**役割:** 認証関連のルート定義

```javascript
const express = require('express');
const {
  register,
  login,
  getCurrentUser,
  logout,
} = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 公開エンドポイント（認証不要）
router.post('/register', register);
router.post('/login', login);

// 保護されたエンドポイント（認証必要）
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

module.exports = router;
```

### 📁 ファイル: `backend/src/routes/index.js`（既存ファイルを更新）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/routes/index.js`

```javascript
const express = require("express");
const healthRoutes = require("./health");
const userRoutes = require("./users");
const productRoutes = require("./products");
const authRoutes = require("./auth");  // ← 追加

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);  // ← 追加
router.use("/users", userRoutes);
router.use("/products", productRoutes);

module.exports = router;
```

---

## 既存ルートの保護

### 📁 ファイル: `backend/src/routes/users.js`（既存ファイルを更新）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/backend/src/routes/users.js`

**変更内容:** ユーザー管理は管理者のみアクセス可能にする

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
const { authenticate, authorize } = require("../middlewares/authMiddleware");  // ← 追加

const router = express.Router();

// 全てのルートに認証 + 管理者権限を要求
router.use(authenticate);              // ← 追加: 認証必須
router.use(authorize('admin'));        // ← 追加: 管理者のみ

router.get("/", getUsers);
router.get("/:id", getUser);
router.post("/", postUser);
router.put("/:id", putUser);
router.patch("/:id", patchUserHandler);
router.delete("/:id", deleteUser);

module.exports = router;
```

### なぜ `router.use()` を使うのか？

```javascript
// 方法1: 各ルートに個別適用
router.get("/", authenticate, authorize('admin'), getUsers);
router.get("/:id", authenticate, authorize('admin'), getUser);
// ...繰り返し

// 方法2: router.use() で一括適用（推奨）
router.use(authenticate);
router.use(authorize('admin'));
router.get("/", getUsers);
router.get("/:id", getUser);
```

**利点:**
- コードの重複を削減
- メンテナンス容易
- 追加のルートも自動的に保護される

---

## テスト方法

### 1. サーバー起動

```bash
cd /Users/haytakeda/Sites/RESTAPI/backend
npm start
```

### 2. ユーザー登録テスト

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**期待されるレスポンス:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 5,
      "name": "Test User",
      "email": "test@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. ログインテスト

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### 4. 認証済みリクエストテスト

```bash
# 上記で取得したトークンを使用
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 現在のユーザー情報取得
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 管理者専用: ユーザー一覧取得
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### 5. 権限エラーテスト

```bash
# 一般ユーザーでログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hanako@example.com", "password": "password123"}'

# 取得したトークンでユーザー管理にアクセス（403エラーになるはず）
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer [USER_TOKEN]"
```

**期待されるレスポンス:**

```json
{
  "success": false,
  "error": {
    "message": "Access denied. Insufficient permissions.",
    "code": "FORBIDDEN"
  }
}
```

---

## まとめ

### 実装したファイル

| ファイル | 役割 |
|---------|------|
| `utils/jwtUtils.js` | JWT生成・検証 |
| `middlewares/authMiddleware.js` | 認証・権限確認 |
| `controllers/authController.js` | 登録・ログイン・ログアウト |
| `routes/auth.js` | 認証ルート定義 |
| `routes/users.js`（更新） | 管理者専用に保護 |

### APIエンドポイント

| メソッド | パス | 認証 | 役割 | 説明 |
|---------|------|------|------|------|
| POST | `/api/auth/register` | 不要 | - | ユーザー登録 |
| POST | `/api/auth/login` | 不要 | - | ログイン |
| GET | `/api/auth/me` | 必要 | user/admin | 現在のユーザー情報 |
| POST | `/api/auth/logout` | 必要 | user/admin | ログアウト |
| GET | `/api/users` | 必要 | admin | ユーザー一覧（管理者のみ） |

### 次のステップ

✅ **バックエンド実装完了**

次は **フロントエンド開発編（FRONTEND_AUTH_IMPLEMENTATION.md）** へ進んでください。

以下の内容を実装します:
- ログインページ（エンドユーザー/管理者）
- 登録ページ
- 認証状態管理（useAuth hook）
- Protected Routes
- ログアウト機能

---

**作成日:** 2026年2月19日  
**バージョン:** 1.0  
**対象:** Node.js/Express Backend
