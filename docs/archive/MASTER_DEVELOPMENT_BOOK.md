# RESTAPI 開発完全ガイド（やさしい版）

このドキュメントは、次の 3 つを「順番に」達成するための本です。

1. いまのアプリを **同じ構成で再現** する
2. 足りない点を **ベストプラクティスで改善** する
3. GitHub Actions + AWS で **本番運用できる状態** にする

難しい言葉はできるだけ避けています。各コードブロックには「どのファイルに書くか」を必ず書いています。

---

## 1. 先に全体像（3分で把握）

### 技術スタック
- Frontend: React + Vite
- Backend: Node.js + Express
- DB: MySQL
- Auth: JWT + bcrypt

### フォルダ
```text
RESTAPI/
├─ frontend/
├─ backend/
└─ db/
```

### 重要な実装ポイント（現行コード準拠）
- 認証ミドルウェア: `backend/src/middlewares/authMiddleware.js`
- JWTユーティリティ: `backend/src/utils/jwtUtils.js`
- 管理者専用ユーザーAPI: `backend/src/routes/users.js`
- フロントの認証状態: `frontend/src/contexts/AuthContext.jsx`
- フロントのAPI通信基盤: `frontend/src/services/httpClient.js`

---

## 2. まず「動かす」手順（再現フェーズ）

## 2-1. 必要ソフト
- Node.js 18+
- npm
- MySQL 8+

## 2-2. 依存パッケージを入れる
```bash
cd /Users/haytakeda/Sites/RESTAPI/backend && npm install
cd /Users/haytakeda/Sites/RESTAPI/frontend && npm install
```

## 2-3. Backend 環境変数を用意

**ファイル:** `backend/.env`
```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db

JWT_SECRET=replace-with-long-random-secret
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

## 2-4. DB を作る
```sql
-- MySQL コンソールで実行
CREATE DATABASE app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### マイグレーション実行
```bash
mysql -u app -p app_db < db/migrations/001_create_users.sql
mysql -u app -p app_db < db/migrations/002_create_product_tables.sql
mysql -u app -p app_db < db/migrations/003_create_orders_reviews.sql
mysql -u app -p app_db < db/migrations/004_add_auth_to_users.sql
```

### シード実行
```bash
mysql -u app -p app_db < db/seeds/001_users.sql
mysql -u app -p app_db < db/seeds/002_product_categories.sql
mysql -u app -p app_db < db/seeds/003_products.sql
mysql -u app -p app_db < db/seeds/004_orders.sql
mysql -u app -p app_db < db/seeds/005_order_items.sql
mysql -u app -p app_db < db/seeds/006_reviews.sql
mysql -u app -p app_db < db/seeds/007_auth_users.sql
```

## 2-5. サーバー起動
```bash
cd backend && npm run dev
cd frontend && npm run dev
```

---

## 3. 主要機能の読み方（学習フェーズ）

## 3-1. ログインの入口（Frontend）

**ファイル:** `frontend/src/pages/AdminLoginPage.jsx`
```jsx
const { login, user } = useAuth();

const result = await login(email, password);
if (result.success) {
  setTimeout(() => {
    if (user?.role === "admin") {
      navigate("/admin");
    }
  }, 1000);
}
```

### なぜこうする？
- `login()` は AuthContext 経由で API を呼ぶ
- `user` の state 更新は非同期なので、更新タイミングを待って role を確認している

## 3-2. 認証状態の中核（Frontend）

**ファイル:** `frontend/src/contexts/AuthContext.jsx`
```jsx
const login = async (email, password) => {
  const response = await authAPI.login(email, password);
  setToken(response.data.token);
  setUser(response.data.user);
  localStorage.setItem("token", response.data.token);
  return { success: true };
};
```

### なぜこうする？
- 画面ごとに同じログイン処理を書かなくて済む
- `localStorage` に保存して再読み込み後もログイン状態を維持できる

## 3-3. API へ token を自動付与

**ファイル:** `frontend/src/services/httpClient.js`
```javascript
const token = localStorage.getItem("token");
if (token) {
  headers["Authorization"] = `Bearer ${token}`;
}
```

### なぜこうする？
- 毎回 fetch のたびに token を手書きしないため

## 3-4. Backend の認証チェック

**ファイル:** `backend/src/middlewares/authMiddleware.js`
```javascript
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return res.status(401).json({
    success: false,
    error: { message: "Authentication required", code: "NO_TOKEN" },
  });
}
const token = authHeader.substring(7);
const decoded = verifyToken(token);
```

### なぜこうする？
- 「Bearer トークン形式」を守っているかを先に確認する

## 3-5. 管理者専用ルート

**ファイル:** `backend/src/routes/users.js`
```javascript
router.use(authenticate);
router.use(authorize("admin"));
```

### なぜこうする？
- users API は管理者だけ使えるようにするため

---

## 4. 改善ポイントと追加開発手順（品質向上フェーズ）

以下は「いまの実装を壊さずに」段階的に改善する順番です。

## 4-1. Frontend の URL 切り替えを明確化

**ファイル:** `frontend/.env.example`（新規）
```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

**ファイル:** `frontend/src/services/httpClient.js`
```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
```

## 4-2. 入力バリデーション共通化

**ファイル:** `backend/src/validators/authValidator.js`
```javascript
const validateLoginPayload = ({ email, password }) => {
  const errors = [];
  if (!email) errors.push("email is required");
  if (!password || password.length < 8) errors.push("password must be at least 8 characters");
  return { valid: errors.length === 0, errors };
};

module.exports = { validateLoginPayload };
```

**ファイル:** `backend/src/controllers/authController.js`
```javascript
const { validateLoginPayload } = require("../validators/authValidator");
const { valid, errors } = validateLoginPayload({ email, password });
if (!valid) {
  return res.status(400).json({
    success: false,
    error: { code: "VALIDATION_ERROR", message: errors.join(", ") },
  });
}
```

## 4-3. セキュリティミドルウェア追加

**ファイル:** `backend/src/app.js`
```javascript
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
```

**コマンド:**
```bash
cd backend && npm i helmet express-rate-limit
```

## 4-4. 認証テスト追加

**ファイル:** `backend/tests/auth.e2e.test.js`（新規）
```javascript
const request = require("supertest");
const app = require("../src/app");

describe("Auth", () => {
  test("admin login success", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("admin");
  });
});
```

---

## 5. CI/CD（GitHub Actions）

## 5-1. CI: テストとビルド

**ファイル:** `.github/workflows/ci.yml`
```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd backend && npm ci
      - run: cd backend && npm test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

## 5-2. CD: main 反映で EC2 へデプロイ

**ファイル:** `.github/workflows/cd.yml`
```yaml
name: CD
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /var/www/RESTAPI
            git pull origin main
            cd backend && npm ci --omit=dev
            pm2 restart restapi-backend || pm2 start src/server.js --name restapi-backend
            cd ../frontend && npm ci && npm run build
            sudo rsync -av --delete dist/ /var/www/html/
```

---

## 6. AWS デプロイ（初学者向け）

## 6-1. 役割を先に理解
- EC2: Node サーバーを動かす
- RDS: MySQL を安全運用
- Nginx: フロント配信とAPI中継
- Secrets Manager: 秘密情報を保管

## 6-2. 手順
1. RDS(MySQL) 作成、`app_db` 準備
2. EC2 作成、Node/Nginx/PM2 インストール
3. backend `.env` を本番値で作成
4. マイグレーション実行
5. backend を PM2 で起動
6. frontend を build して Nginx 配信
7. ACM + Route53 で HTTPS 化

---

## 7. 完了チェックリスト

- [ ] 管理者ログイン成功
- [ ] `/api/users` が管理者 token で 200
- [ ] Frontend の `/admin` でユーザー一覧表示
- [ ] CI（test/build）通過
- [ ] main push で本番更新

---

## 8. 最後に（この本の使い方）

1. まず 2章で動かす
2. 次に 3章でコードを読む
3. 4章で改善する
4. 5章・6章で運用に載せる

実装の図解は `SYSTEM_DESIGN_SPEC.md` を併読してください。
