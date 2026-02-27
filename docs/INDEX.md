# REST API Ecommerce ドキュメント

> **このプロジェクトを0から構築するための完全ガイド集**

---

## 📚 ガイド一覧（推奨読み順）

### 1. データベース構築
📁 **[01_DATABASE_GUIDE.md](guides/01_DATABASE_GUIDE.md)**  
- Docker + MySQL 8.0 環境構築
- 7テーブル（users, categories, products, etc.）
- 7段階のマイグレーション
- 日本語全文検索（ngram parser）

**所要時間:** 約1〜2時間

---

### 2. バックエンド構築
📁 **[02_BACKEND_GUIDE.md](guides/02_BACKEND_GUIDE.md)**  
- Node.js + Express 5.x REST API
- JWT + bcrypt 認証システム
- Controller-Service-Model アーキテクチャ
- 20+ エンドポイント実装

**所要時間:** 約2〜3時間

---

### 3. フロントエンド構築
📁 **[03_FRONTEND_GUIDE.md](guides/03_FRONTEND_GUIDE.md)**  
- React 19.x + Vite 7.x SPA
- React Router 7.x ルーティング
- AuthContext 認証状態管理
- 再利用可能コンポーネント設計

**所要時間:** 約3〜4時間

---

### 4. スタートアップ（全体起動）
📁 **[04_STARTUP_GUIDE.md](guides/04_STARTUP_GUIDE.md)**  
- Docker Compose で3サービス一括起動
- 環境変数の設定方法
- ローカル開発環境の構築（DB だけ Docker）
- トラブルシューティング

**所要時間:** 約30分〜1時間

---

> **補足:** 追加開発の手順（クエリバリデーション、閲覧履歴キャッシュ）は各ガイドの最終フェーズに統合済みです。  
> 個別の開発ステップ記録は `docs/archive/` を参照してください。

---

## 🏗️ システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                      ユーザーブラウザ                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│               React Frontend (localhost:5173)                │
│               ・ProductList, Dashboard, etc.                 │
│               ・AuthContext（認証状態）                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
┌───────────────────────────▼─────────────────────────────────┐
│               Express Backend (localhost:3000)               │
│               ・/api/auth, /api/products, etc.               │
│               ・JWT認証、レート制限、CORS                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ mysql2/promise
┌───────────────────────────▼─────────────────────────────────┐
│               MySQL 8.0 (Docker localhost:3306)              │
│               ・7テーブル                                     │
│               ・ngramパーサー（日本語全文検索）              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 クイックスタート

```bash
# 1. データベース起動
cd db
docker compose up -d

# 2. バックエンド起動
cd ../backend
npm install
npm run dev

# 3. フロントエンド起動
cd ../frontend
npm install
npm run dev

# ブラウザで確認
open http://localhost:5173
```

---

## 📂 フォルダ構成

```
RESTAPI/
├── docs/                    # ドキュメント
│   ├── INDEX.md            # ← このファイル
│   ├── guides/             # 統合ガイド（これだけ見れば全て構築可能）
│   │   ├── 01_DATABASE_GUIDE.md
│   │   ├── 02_BACKEND_GUIDE.md
│   │   ├── 03_FRONTEND_GUIDE.md
│   │   └── 04_STARTUP_GUIDE.md
│   ├── references/         # 参考資料
│   └── archive/            # 個別開発ステップ記録（履歴用）
│       ├── BACKEND/        #   バックエンド関連（01〜09）
│       ├── FRONTEND/       #   フロントエンド関連（01〜09）
│       └── DB/             #   データベース関連（01〜06）
│
├── docker-compose.yml       # 全体起動用 Docker Compose
│
├── db/                      # データベース
│   ├── docker-compose.yml  # DB単体起動用
│   ├── .env                # DB環境変数
│   ├── init/               # 初期化SQL
│   ├── migrations/         # マイグレーション
│   └── seeds/              # テストデータ
│
├── backend/                 # バックエンドAPI
│   ├── .env                # バックエンド環境変数
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── models/
│       ├── middlewares/
│       └── routes/
│
└── frontend/                # フロントエンドSPA
    ├── .env                # フロントエンド環境変数
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── pages/
        ├── components/
        ├── contexts/
        ├── services/
        └── hooks/
```

---

## 🛠️ 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| **フロントエンド** | React | 19.x |
| | Vite | 7.x |
| | React Router | 7.x |
| | modern-normalize | 3.x |
| **バックエンド** | Node.js | 20+ |
| | Express | 5.x |
| | mysql2/promise | 3.x |
| | jsonwebtoken | 9.x |
| | bcrypt | 6.x |
| **データベース** | MySQL | 8.0 |
| | Docker | - |

---

## 📖 学習ポイント

各ガイドで習得できる技術・概念：

### データベース
- Docker基礎
- MySQL 8.0の新機能
- ER図の読み方・設計
- マイグレーション管理
- トランザクション処理

### バックエンド
- REST API設計原則
- MVCアーキテクチャ
- 認証・認可（JWT）
- パスワードセキュリティ（bcrypt）
- エラーハンドリング
- ミドルウェアの仕組み

### フロントエンド
- React 19の新機能
- 状態管理（Context API）
- カスタムフック設計
- API通信層の抽象化
- 認証フロー実装
- CSSモジュール設計

---

## ✅ 確認チェックリスト

構築完了後、以下を確認：

- [ ] MySQL Docker コンテナが起動している
- [ ] 全7テーブルが作成されている
- [ ] 初期データ（カテゴリー、製品）が投入されている  
- [ ] バックエンドが `localhost:3000` で応答する
- [ ] `/api/products` で製品リストが返る
- [ ] ユーザー登録・ログインが動作する
- [ ] フロントエンドが `localhost:5173` で表示される
- [ ] 製品一覧・詳細ページが正常に表示される
- [ ] 認証が必要なページで適切にリダイレクトされる

---

## 🔧 よくある問題

### データベースに接続できない
```bash
# Dockerコンテナの状態確認
docker ps

# 起動していなければ
cd db && docker compose up -d
```

### APIがCORSエラー
```javascript
// バックエンドの app.js で CORS 設定を確認
const cors = require("cors");
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3001"],
  credentials: true,
}));
```

### 認証状態が保持されない
```javascript
// localStorage.getItem("token") を確認
// AuthProvider が main.jsx でラップされているか確認
```

---

## 📝 更新履歴

| 日付 | 更新内容 |
|------|---------|
| 2025-01 | 初版作成（3ガイド統合） |
| 2025-01 | ガイド改善版作成 |
