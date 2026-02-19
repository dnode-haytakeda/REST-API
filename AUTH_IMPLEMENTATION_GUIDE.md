# 認証システム完全実装ガイド【統合版】

> **目的:** データベース、バックエンド、フロントエンドの3層すべてで完璧な認証システムを構築する

---

## 📋 全体像

このプロジェクトでは、**エンドユーザー** と **管理者** の2つの役割を持つ認証システムを実装します。

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│  ・SelectRole ページ（役割選択）                               │
│  ・Login/Register ページ（認証UI)                             │
│  ・Protected Routes（ルート保護）                              │
│  ・AuthContext（認証状態管理）                                 │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP Request (JWT Bearer Token)
                 │
┌────────────────▼────────────────────────────────────────────┐
│                     Backend (Node.js/Express)                │
│  ・/api/auth/register （ユーザー登録）                         │
│  ・/api/auth/login （ログイン）                                │
│  ・/api/auth/me （現在のユーザー取得）                          │
│  ・authMiddleware （JWT検証）                                  │
│  ・authorize() （役割チェック）                                 │
└────────────────┬────────────────────────────────────────────┘
                 │ SQL Query
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Database (MySQL)                        │
│  ・users テーブル                                              │
│    - id, name, email, password (bcrypt), role, is_active    │
│  ・Migration 004: 認証フィールド追加                            │
│  ・Seed 004: テストアカウント作成                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 実装の流れ

### 全体の実装順序

```
1. Database Layer（データベース設計）
   └─ Migration + Seed を実行しテーブルを準備

2. Backend Layer（API実装）
   └─ 認証エンドポイント、ミドルウェア、コントローラーを実装

3. Frontend Layer（UI実装）
   └─ ログイン/登録画面、保護されたルート、状態管理を実装

4. End-to-End Testing（結合テスト）
   └─ 実際のユーザーフローをブラウザで確認
```

---

## 📚 各ドキュメントの役割

| ドキュメント | 対象レイヤー | 内容 |
|------------|------------|------|
| **DATABASE_AUTH_IMPLEMENTATION.md** | データベース | Migration 004/Seed 004 の実装手順 |
| **BACKEND_AUTH_IMPLEMENTATION.md** | バックエンド | JWT認証API、ミドルウェア、コントローラー実装 |
| **FRONTEND_AUTH_IMPLEMENTATION.md** | フロントエンド | 認証UI、Protected Routes、AuthContext実装 |
| **README.md**（本ドキュメント） | 統合 | 全体の流れと実装チェックリスト |

---

## ✅ 実装チェックリスト

### Phase 1: データベース準備

- [ ] **Migration 004 作成**
  - ファイル: `db/migrations/004_add_auth_to_users.sql`
  - 内容: `password`, `role`, `is_active`, `last_login_at`, `updated_at` カラムを追加
  - 参照: `DATABASE_AUTH_IMPLEMENTATION.md` → 「3. Migration実装」

- [ ] **Seed 007 作成**
  - ファイル: `db/seeds/007_auth_users.sql`
  - 内容: テストアカウント作成（管理者: admin@example.com, 一般: hanako@example.com）
  - 参照: `DATABASE_AUTH_IMPLEMENTATION.md` → 「4. Seed実装」

- [ ] **マイグレーション実行**
  ```bash
  cd /Users/haytakeda/Sites/RESTAPI
  mysql -u root -p
  SOURCE db/migrations/004_add_auth_to_users.sql;
  ```
  - 参照: `DATABASE_AUTH_IMPLEMENTATION.md` → 「5. 実行手順」

- [ ] **シードデータ投入実行**
  ```bash
  SOURCE db/seeds/007_auth_users.sql;
  ```

- [ ] **データ確認**
  ```bash
  mysql -u root -p app_db
  SELECT id, name, email, role, is_active FROM users;
  ```
  - 期待結果: admin, hanako, taro の3アカウントが存在

### Phase 2: バックエンド実装

- [ ] **依存関係インストール**
  ```bash
  cd backend
  npm install bcrypt@^5.1.1 jsonwebtoken@^9.0.2 dotenv@^16.4.1
  ```
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「3. 依存関係のインストール」

- [ ] **環境変数設定**
  - ファイル: `backend/.env`
  - 内容: `JWT_SECRET=your-secret-key-here`
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「4. 環境変数設定」

- [ ] **JWTユーティリティ作成**
  - ファイル: `backend/src/utils/jwtUtils.js`
  - 内容: `generateToken()`, `verifyToken()`
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「5. JWTユーティリティ実装」

- [ ] **認証サービス作成**
  - ファイル: `backend/src/services/authService.js`
  - 内容: `registerUser()`, `loginUser()`, `getUserForAuth()`
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「モデル/サービス実装」

- [ ] **ユーザーモデル拡張**
  - ファイル: `backend/src/models/userModel.js`（既存ファイルを更新）
  - 内容: `findByEmail()`, `findByEmailWithPassword()`, `findByIdForAuth()` など
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「モデル/サービス実装」

- [ ] **認証ミドルウェア作成**
  - ファイル: `backend/src/middlewares/authMiddleware.js`
  - 内容: `authenticate()`, `authorize()`
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「6. 認証ミドルウェア実装」

- [ ] **認証コントローラー作成**
  - ファイル: `backend/src/controllers/authController.js`
  - 内容: `register()`, `login()`, `getCurrentUser()`, `logout()`
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「7. 認証コントローラー実装」

- [ ] **認証ルート作成**
  - ファイル: `backend/src/routes/auth.js`
  - 内容: `/register`, `/login`, `/me`, `/logout`
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「8. 認証ルート実装」

- [ ] **メインルート更新**
  - ファイル: `backend/src/routes/index.js`
  - 変更: `router.use('/auth', authRoutes);` を追加
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「9. ルート統合」

- [ ] **既存ルート保護**
  - ファイル: `backend/src/routes/users.js`
  - 変更: `authenticate`, `authorize('admin')` ミドルウェアを追加
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「10. 既存ルートの保護」

- [ ] **バックエンドテスト**
  ```bash
  cd backend
  npm run dev
  
  # 別ターミナルで
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"hanako@example.com","password":"password123"}'
  ```
  - 期待結果: `{ "success": true, "data": { "token": "...", "user": {...} } }`
  - 参照: `BACKEND_AUTH_IMPLEMENTATION.md` → 「11. テスト方法」

### Phase 3: フロントエンド実装

- [ ] **認証コンテキスト作成**
  - ファイル: `frontend/src/contexts/AuthContext.jsx`
  - 内容: `AuthProvider`, `useAuth()`
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「認証コンテキスト実装」

- [ ] **httpClient 更新**
  - ファイル: `frontend/src/services/httpClient.js`
  - 変更: 自動的にJWTトークンを付与
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「API通信層の更新」

- [ ] **authAPI 作成**
  - ファイル: `frontend/src/services/authAPI.js`
  - 内容: `login()`, `register()`, `getMe()`, `logout()`
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「API通信層の更新」

- [ ] **ユーザーAPI統一**
  - ファイル: `frontend/src/services/api.js`（既存ファイルを更新）
  - 変更: `httpClient` を使用して認証ヘッダーを付与
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「API通信層の更新」

- [ ] **ログインページ作成**
  - ファイル: `frontend/src/pages/LoginPage.jsx`
  - 内容: エンドユーザー向けログインUI
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「ログインページ実装」

- [ ] **管理者ログインページ作成**
  - ファイル: `frontend/src/pages/AdminLoginPage.jsx`
  - 内容: 管理者向けログインUI
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「管理者用ログインページ」

- [ ] **登録ページ作成**
  - ファイル: `frontend/src/pages/RegisterPage.jsx`
  - 内容: 新規ユーザー登録UI
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「登録ページ実装」

- [ ] **Protected Route 作成**
  - ファイル: `frontend/src/components/ProtectedRoute.jsx`
  - 内容: ルート保護コンポーネント
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「Protected Routes実装」

- [ ] **ルーティング更新**
  - ファイル: `frontend/src/main.jsx`
  - 変更: `AuthProvider` でラップ、保護されたルート設定
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「ルーティング更新」

- [ ] **ヘッダー更新**
  - ファイル: `frontend/src/components/Header.jsx`
  - 変更: ユーザー名表示、ログアウトボタン追加
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「ヘッダーの更新」

- [ ] **スタイリング追加**
  - ファイル: `frontend/src/styles/components.css`
  - 追加: 認証ページ、ローディング、エラーページのスタイル
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「スタイリング」

- [ ] **フロントエンドテスト**
  ```bash
  cd frontend
  npm run dev
  ```
  - ブラウザで `http://localhost:5173/` にアクセス
  - 参照: `FRONTEND_AUTH_IMPLEMENTATION.md` → 「テスト方法」

### Phase 4: 結合テスト

- [ ] **シナリオ1: 新規ユーザー登録**
  1. トップページ → 「エンドユーザー」選択
  2. 「こちらから登録」リンク → 登録フォーム入力
  3. 登録成功 → `/mypage` にリダイレクト
  4. ヘッダーにユーザー名が表示される

- [ ] **シナリオ2: ログイン**
  1. ログアウト
  2. トップページ → 「エンドユーザー」選択
  3. メール: hanako@example.com, パスワード: password123
  4. ログイン成功 → `/mypage` にリダイレクト

- [ ] **シナリオ3: 管理者ログイン**
  1. トップページ → 「管理者」選択
  2. メール: admin@example.com, パスワード: password123
  3. ログイン成功 → `/admin` にリダイレクト
  4. ユーザー一覧が表示される

- [ ] **シナリオ4: 未ログインでの保護されたルートへのアクセス**
  1. ログアウト状態
  2. `/mypage/orders` に直接アクセス
  3. 自動的に `/mypage/login` にリダイレクト

- [ ] **シナリオ5: 権限エラー**
  1. 一般ユーザーでログイン（hanako）
  2. `/admin` に直接アクセス
  3. 「アクセス権限がありません」が表示される

- [ ] **シナリオ6: トークン有効性**
  1. ログイン後、ブラウザをリロード
  2. `/mypage` が表示される（トークンが localStorage に保存されている）
  3. ブラウザを閉じて再度開く
  4. `/mypage` にアクセス → ログイン状態が維持される

---

## 🔧 トラブルシューティング

### エラー: "Invalid JWT"

**原因:** JWT_SECRET が設定されていない、または一致しない

**解決:**
```bash
# backend/.env を確認
cat backend/.env

# JWT_SECRET があることを確認
# ない場合は以下を追加
echo "JWT_SECRET=your-secret-key-here" >> backend/.env

# バックエンドを再起動
cd backend
npm run dev
```

### エラー: "CORS policy"

**原因:** フロントエンド（localhost:5173）からバックエンド（localhost:3000）への通信がブロック

**解決:**
```javascript
// backend/src/server.js に追加
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

### エラー: "User not found" (ログイン時)

**原因:** Seed が実行されていない、またはパスワードが一致しない

**解決:**
```bash
# データベース確認
mysql -u root -p ecommerce_db
SELECT * FROM users WHERE email = 'hanako@example.com';

# データがない場合、Seed を実行
cd db
npm run seed
```

### エラー: "Cannot use import statement outside a module"

**原因:** ES Modules が正しく設定されていない

**解決:**
```json
// backend/package.json に追加
{
  "type": "module"
}
```

### ログイン後、ページリロードでログアウトされる

**原因:** AuthContext の初期化が完了する前にリダイレクト

**解決:** `frontend/src/contexts/AuthContext.jsx` の `isLoading` 状態を確認
```javascript
// ProtectedRoute で isLoading を待つ
if (isLoading) {
  return <div>Loading...</div>;
}
```

---

## 📊 実装後の確認事項

### データベース

```sql
-- テーブル構造確認
DESCRIBE users;

-- テストアカウント確認
SELECT id, name, email, role, is_active FROM users;

-- インデックス確認
SHOW INDEX FROM users;
```

**期待結果:**
- `password` カラムが存在（VARCHAR(255)）
- `role` カラムが存在（ENUM('user', 'admin')）
- `is_active` カラムが存在（BOOLEAN）
- admin, hanako, taro の3アカウントが登録済み

### バックエンド

```bash
# Health Check
curl http://localhost:3000/api/health

# ログインテスト
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hanako@example.com","password":"password123"}'

# 期待結果: { "success": true, "data": { "token": "...", "user": {...} } }
```

### フロントエンド

ブラウザ開発者ツールで確認:

1. **Console エラーがないこと**
2. **Network タブ:** 
   - `/api/auth/login` → 200 OK
   - `/api/auth/me` → 200 OK (トークン付き)
3. **Application タブ → Local Storage:**
   - `token` キーが存在
   - 値がJWT形式（`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`）

---

## 🚀 次のステップ（発展）

### セキュリティ強化

1. **リフレッシュトークン実装**
   - アクセストークン: 15分（短い）
   - リフレッシュトークン: 7日（長い）
   - 参考: [JWT Refresh Token Best Practices](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)

2. **httpOnly Cookie でトークン管理**
   - localStorage → httpOnly Cookie に変更
   - XSS攻撃への耐性向上
   - CSRF対策も必須

3. **HTTPS 対応**
   - 本番環境では必須
   - Let's Encrypt で無料SSL証明書

4. **Rate Limiting**
   - ブルートフォース攻撃対策
   - express-rate-limit パッケージ使用

### 機能追加

1. **パスワードリセット**
   - メールでリセットリンク送信
   - nodemailer パッケージ使用

2. **2要素認証（2FA）**
   - Google Authenticator 連携
   - speakeasy パッケージ使用

3. **ソーシャルログイン**
   - Google OAuth
   - passport.js 使用

4. **セッション管理ページ**
   - ログインデバイス一覧
   - 遠隔ログアウト機能

---

## 📖 参考資料

### JWT

- [RFC 7519: JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [JWT.io: JWT Debugger](https://jwt.io/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

### bcrypt

- [bcrypt - npm](https://www.npmjs.com/package/bcrypt)
- [bcrypt パスワードソルト](https://ja.wikipedia.org/wiki/Bcrypt)

### React Context API

- [React Docs: Context](https://react.dev/reference/react/useContext)
- [When to use Context](https://react.dev/learn/passing-data-deeply-with-context)

### セキュリティ

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## 🎓 まとめ

このガイドでは、以下を実装しました:

✅ **データベース層:** 認証フィールドの追加、テストアカウント作成  
✅ **バックエンド層:** JWT認証API、ミドルウェア、役割ベースアクセス制御  
✅ **フロントエンド層:** 認証UI、保護されたルート、状態管理  

### 認証フロー全体

```
1. ユーザーが登録/ログイン
   ↓
2. バックエンドがJWTトークンを発行
   ↓
3. フロントエンドが localStorage に保存
   ↓
4. すべてのAPIリクエストに自動付与
   ↓
5. バックエンドがトークンを検証
   ↓
6. 役割に応じてアクセス制御
```

### 主要な技術決定

| 項目 | 選択 | 理由 |
|------|------|------|
| 認証方式 | JWT | ステートレス、スケーラブル |
| パスワードハッシュ | bcrypt (cost 10) | セキュリティと性能のバランス |
| トークン保存 | localStorage | シンプル（本番では httpOnly Cookie推奨） |
| 状態管理 | React Context API | 今回のスケールに最適 |
| ルート保護 | ProtectedRoute コンポーネント | 再利用可能、宣言的 |

---

**作成日:** 2026年2月19日  
**バージョン:** 1.0  
**対象:** Full-Stack Authentication System (MySQL + Node.js + React)
