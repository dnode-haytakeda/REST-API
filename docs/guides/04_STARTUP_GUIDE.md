# スタートアップガイド - ECサイト全体起動マニュアル

> **対象読者**: IT初心者（Docker を使ってアプリを起動したい方）
> **前提**: Docker Desktop がインストール済みであること
> **目標**: DB + バックエンド + フロントエンドの3サービスを一括起動する

---

## 目次

1. [全体構成の理解](#1-全体構成の理解)
2. [事前準備](#2-事前準備)
3. [環境変数の設定](#3-環境変数の設定)
4. [Docker Compose で一括起動](#4-docker-compose-で一括起動)
5. [ローカル開発環境（Docker なし）](#5-ローカル開発環境docker-なし)
6. [動作確認](#6-動作確認)
7. [よく使う操作コマンド](#7-よく使う操作コマンド)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. 全体構成の理解

### 1.1 システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                  (restapi-network)                        │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  MySQL    │    │  Backend     │    │  Frontend    │   │
│  │  (db)     │◄───│  (backend)   │    │  (frontend)  │   │
│  │          │    │              │    │              │   │
│  │ Port:3306│    │ Port:3000    │    │ Port:3001    │   │
│  └──────────┘    └──────────────┘    └──────────────┘   │
│       ▲               ▲                   ▲             │
└───────│───────────────│───────────────────│─────────────┘
        │               │                   │
   ホスト:3306      ホスト:3000         ホスト:3001
```

### 1.2 3つのサービス

| サービス | 技術 | コンテナ名 | ホストポート | 役割 |
|----------|------|------------|-------------|------|
| **db** | MySQL 8.0 | restapi-db | 3306 | データベース |
| **backend** | Node.js + Express | restapi-backend | 3000 | REST API サーバー |
| **frontend** | React + Vite (serve) | restapi-frontend | 3001 | フロントエンド（静的配信） |

### 1.3 起動順序と依存関係

```
db（MySQL）
  │  healthcheck で「準備完了」を待つ
  ▼
backend（Express）
  │  depends_on: db (service_healthy)
  ▼
frontend（React）
  │  depends_on: backend
  ▼
全サービス起動完了！
```

---

## 2. 事前準備

### 2.1 必要なソフトウェア

| ソフトウェア | バージョン | 確認コマンド | 用途 |
|-------------|-----------|-------------|------|
| **Docker Desktop** | 4.x 以上 | `docker --version` | コンテナ管理 |
| **Docker Compose** | v2（Docker Desktop に同梱） | `docker compose version` | 複数コンテナの一括管理 |
| **Node.js** | 20.x 以上 | `node --version` | ローカル開発時のみ |
| **npm** | 10.x 以上 | `npm --version` | パッケージ管理 |
| **Git** | 任意 | `git --version` | ソースコード管理 |

### 2.2 Docker Desktop のインストール

**macOS:**
```bash
# Homebrew でインストール
brew install --cask docker

# または公式サイトからダウンロード
# https://www.docker.com/products/docker-desktop
```

**Windows:**
1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop) からダウンロード
2. インストーラーを実行
3. WSL 2 バックエンドを有効にする（推奨）

インストール後、Docker Desktop を起動してください。

### 2.3 プロジェクトディレクトリの確認

```
RESTAPI/
├── docker-compose.yml     ← 全体起動の設定ファイル
├── db/
│   ├── .env               ← DB用の環境変数
│   ├── docker-compose.yml ← DB単体起動用（個別開発時）
│   ├── init/
│   │   └── 00_init.sql    ← 初期設定SQL
│   ├── migrations/        ← テーブル作成SQL
│   └── seeds/             ← テストデータ投入SQL
├── backend/
│   ├── .env               ← バックエンド用の環境変数
│   ├── Dockerfile         ← バックエンドのコンテナ設定
│   └── src/               ← ソースコード
└── frontend/
    ├── .env               ← フロントエンド用の環境変数
    ├── Dockerfile         ← フロントエンドのコンテナ設定
    └── src/               ← ソースコード
```

---

## 3. 環境変数の設定

### 3.1 データベース: db/.env

```bash
# db/.env

# MySQL設定
MYSQL_ROOT_PASSWORD=root_password
MYSQL_DATABASE=app_db
MYSQL_USER=app
MYSQL_PASSWORD=app_password
MYSQL_PORT=3306
```

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `MYSQL_ROOT_PASSWORD` | rootユーザーのパスワード | `root_password` |
| `MYSQL_DATABASE` | 作成するデータベース名 | `app_db` |
| `MYSQL_USER` | アプリ用のDBユーザー名 | `app` |
| `MYSQL_PASSWORD` | アプリ用のDBパスワード | `app_password` |
| `MYSQL_PORT` | ホスト側でDBに接続するポート | `3306` |

### 3.2 バックエンド: backend/.env

```bash
# backend/.env

# サーバー設定
PORT=3000

# データベース接続（ローカル開発時）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db

# JWT認証
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=7d
```

| 変数 | 説明 | Docker時の注意 |
|------|------|---------------|
| `DB_HOST` | DBサーバーのホスト | Docker では `docker-compose.yml` で `db` に上書きされる |
| `DB_PORT` | DBのポート番号 | Docker では `3306` に上書きされる |
| `DB_USER` | DB接続ユーザー | `db/.env` の `MYSQL_USER` と一致させる |
| `DB_PASSWORD` | DB接続パスワード | `db/.env` の `MYSQL_PASSWORD` と一致させる |
| `DB_NAME` | 接続先データベース名 | `db/.env` の `MYSQL_DATABASE` と一致させる |
| `JWT_SECRET` | JWT署名用の秘密鍵 | **本番では長くランダムな文字列にすること** |
| `JWT_EXPIRES_IN` | トークンの有効期限 | `7d`, `24h`, `30m` など |

### 3.3 フロントエンド: frontend/.env

```bash
# frontend/.env

# API接続先
VITE_API_BASE_URL=http://localhost:3000/api
```

> **重要:** Viteでは `VITE_` プレフィックスの変数のみがブラウザに公開されます。

### 3.4 環境変数ファイルの作成コマンド

```bash
cd /path/to/RESTAPI

# db/.env
cat > db/.env << 'EOF'
MYSQL_ROOT_PASSWORD=root_password
MYSQL_DATABASE=app_db
MYSQL_USER=app
MYSQL_PASSWORD=app_password
MYSQL_PORT=3306
EOF

# backend/.env
cat > backend/.env << 'EOF'
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=7d
EOF

# frontend/.env
cat > frontend/.env << 'EOF'
VITE_API_BASE_URL=http://localhost:3000/api
EOF
```

---

## 4. Docker Compose で一括起動

### 4.1 docker-compose.yml の構成

プロジェクトルートの `docker-compose.yml` が全サービスを定義しています。

```yaml
version: "3.9"

services:
  # ===== データベース =====
  db:
    image: mysql:8.0                              # MySQL 8.0 公式イメージ
    container_name: restapi-db
    env_file:
      - db/.env                                   # DB用の環境変数
    command: >-
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci       # 日本語対応の文字コード設定
    ports:
      - "${MYSQL_PORT:-3306}:3306"                # ホスト:コンテナ
    volumes:
      - db_data:/var/lib/mysql                    # データ永続化
      # 初回起動時に自動実行されるSQL（番号順）
      - ./db/init/00_init.sql:/docker-entrypoint-initdb.d/00_init.sql
      # マイグレーション（テーブル作成・変更）
      - ./db/migrations/001_create_users.sql:/docker-entrypoint-initdb.d/01_001_create_users.sql
      - ./db/migrations/002_create_product_tables.sql:/docker-entrypoint-initdb.d/02_002_create_product_tables.sql
      - ./db/migrations/003_create_orders_reviews.sql:/docker-entrypoint-initdb.d/03_003_create_orders_reviews.sql
      - ./db/migrations/004_add_auth_to_users.sql:/docker-entrypoint-initdb.d/04_004_add_auth_to_users.sql
      - ./db/migrations/005_create_product_views.sql:/docker-entrypoint-initdb.d/05_005_create_product_views.sql
      - ./db/migrations/006_optimize_indexes.sql:/docker-entrypoint-initdb.d/06_006_optimize_indexes.sql
      - ./db/migrations/007_improve_fulltext_search.sql:/docker-entrypoint-initdb.d/07_007_improve_fulltext_search.sql
      # シードデータ（テストデータ投入）
      - ./db/seeds/001_users.sql:/docker-entrypoint-initdb.d/08_001_users.sql
      - ./db/seeds/002_product_categories.sql:/docker-entrypoint-initdb.d/09_002_product_categories.sql
      - ./db/seeds/003_products.sql:/docker-entrypoint-initdb.d/10_003_products.sql
      - ./db/seeds/004_orders.sql:/docker-entrypoint-initdb.d/11_004_orders.sql
      - ./db/seeds/005_order_items.sql:/docker-entrypoint-initdb.d/12_005_order_items.sql
      - ./db/seeds/006_reviews.sql:/docker-entrypoint-initdb.d/13_006_reviews.sql
      - ./db/seeds/007_auth_users.sql:/docker-entrypoint-initdb.d/14_007_auth_users.sql
      - ./db/seeds/008_product_views_test.sql:/docker-entrypoint-initdb.d/15_008_product_views_test.sql
    healthcheck:                                  # DBの準備完了を検知
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u ${MYSQL_USER} -p${MYSQL_PASSWORD}"]
      interval: 10s                               # 10秒ごとにチェック
      timeout: 5s                                 # 5秒でタイムアウト
      retries: 5                                  # 5回失敗で unhealthy
    networks:
      - restapi-network

  # ===== バックエンド =====
  backend:
    build:
      context: ./backend                          # ビルドコンテキスト
      dockerfile: Dockerfile
    container_name: restapi-backend
    env_file:
      - backend/.env
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy                # DBが healthy になってから起動
    environment:
      - DB_HOST=db                                # Docker内ではサービス名で接続
      - DB_PORT=3306
    networks:
      - restapi-network
    command: npm start

  # ===== フロントエンド =====
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: restapi-frontend
    ports:
      - "3001:3000"                               # ホスト3001 → コンテナ3000
    depends_on:
      - backend
    networks:
      - restapi-network

# データ永続化用ボリューム
volumes:
  db_data:

# 内部ネットワーク
networks:
  restapi-network:
    driver: bridge
```

**重要な概念解説:**

| 概念 | 説明 |
|------|------|
| `volumes: db_data` | MySQL のデータをホスト上に永続化。コンテナを再作成してもデータが残る |
| `networks: restapi-network` | 3つのサービスが同じネットワーク上で通信可能に |
| `depends_on: condition: service_healthy` | DBの healthcheck がパスするまでバックエンドを起動しない |
| `environment: DB_HOST=db` | Docker内では `localhost` ではなくサービス名（`db`）でDB接続 |
| `docker-entrypoint-initdb.d/` | MySQL コンテナが**初回起動時のみ**ここのSQLを番号順に実行 |

### 4.2 起動手順

```bash
# 1. プロジェクトディレクトリに移動
cd /path/to/RESTAPI

# 2. 環境変数ファイルが存在することを確認
ls db/.env backend/.env frontend/.env

# 3. Docker Compose で全サービスを起動（初回はビルドも実行）
docker compose up -d --build
```

**コマンドオプション:**
- `-d`: デタッチモード（バックグラウンド実行）
- `--build`: Dockerfile から毎回イメージをビルドし直す

### 4.3 起動確認

```bash
# サービスの状態を確認
docker compose ps

# 期待される出力:
# NAME               STATUS          PORTS
# restapi-db         running (healthy)  0.0.0.0:3306->3306/tcp
# restapi-backend    running            0.0.0.0:3000->3000/tcp
# restapi-frontend   running            0.0.0.0:3001->3000/tcp
```

### 4.4 ログの確認

```bash
# 全サービスのログ
docker compose logs

# 特定サービスのログ（リアルタイム追跡）
docker compose logs -f backend

# 最新20行のみ表示
docker compose logs --tail 20 db
```

### 4.5 停止・削除

```bash
# サービスを停止
docker compose stop

# サービスを停止して削除（データは保持）
docker compose down

# サービスを停止して削除 + データも削除（完全リセット）
docker compose down -v
```

> **`-v` オプションの注意:** `db_data` ボリュームも削除されるため、データベースのデータがすべて失われます。再起動時にマイグレーション・シードが再実行されます。

---

## 5. ローカル開発環境（Docker なし）

Docker を使わずに、各サービスを直接起動する方法です。ホットリロードが効くため、日常の開発ではこちらが便利です。

### 5.1 構成パターン

```
パターン A: DB だけ Docker + バックエンド・フロントエンドはローカル（推奨）
パターン B: すべてローカル（MySQL をホストにインストール）
パターン C: すべて Docker（最も簡単、ただし開発は不便）
```

### 5.2 パターン A: DB だけ Docker（推奨）

**ターミナル1: MySQL コンテナ起動**
```bash
cd /path/to/RESTAPI

# DB だけ起動
docker compose up -d db

# 起動を確認
docker compose ps db
# STATUS: running (healthy) を待つ
```

**ターミナル2: バックエンド起動**
```bash
cd /path/to/RESTAPI/backend

# 依存パッケージをインストール
npm install

# 開発サーバーを起動（ホットリロードあり）
npm run dev
# → "API server listening on port 3000" と表示されれば成功
```

**ターミナル3: フロントエンド起動**
```bash
cd /path/to/RESTAPI/frontend

# 依存パッケージをインストール
npm install

# 開発サーバーを起動（ホットリロードあり）
npm run dev
# → "Local: http://localhost:5173/" と表示されれば成功
```

### 5.3 ローカル開発時の注意点

| 項目 | Docker 時 | ローカル時 |
|------|----------|-----------|
| DB ホスト | `db`（サービス名） | `127.0.0.1` |
| フロントエンドURL | `http://localhost:3001` | `http://localhost:5173` |
| バックエンドURL | `http://localhost:3000` | `http://localhost:3000` |
| ホットリロード | なし（再起動が必要） | あり（変更が即反映） |
| `backend/.env` の `DB_HOST` | Docker 側で `db` に上書き | `127.0.0.1` のままでOK |

### 5.4 DB 単体の Docker Compose（db/docker-compose.yml）

DBだけを独立して管理したい場合は、`db/` ディレクトリ内の Docker Compose を使います。

```bash
cd /path/to/RESTAPI/db

# DB起動
docker compose up -d

# 接続テスト
docker exec -it restapi-db mysql -u app -papp_password app_db
```

---

## 6. 動作確認

### 6.1 ステップバイステップ確認

**Step 1: データベースの確認**
```bash
# MySQL に接続
docker exec -it restapi-db mysql -u app -papp_password app_db

# テーブル一覧を確認
SHOW TABLES;

# テストデータを確認
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;

# 切断
EXIT;
```

**Step 2: バックエンドの確認**
```bash
# ヘルスチェック
curl http://localhost:3000/api/health

# ユーザー一覧
curl http://localhost:3000/api/users

# 商品一覧
curl http://localhost:3000/api/products

# 認証テスト（ログイン）
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}'
```

**Step 3: フロントエンドの確認**

ブラウザで以下のURLにアクセス:

| URL | 期待される画面 |
|-----|--------------|
| `http://localhost:3001`（Docker時） | ロール選択画面 |
| `http://localhost:5173`（ローカル時） | ロール選択画面 |

### 6.2 テスト用アカウント

| 役割 | メールアドレス | パスワード | 備考 |
|------|--------------|----------|------|
| 一般ユーザー | alice@example.com | password123 | 001_users.sql で作成 |
| 一般ユーザー | hanako@example.com | password123 | 007_auth_users.sql で作成 |
| 管理者 | admin@example.com | password123 | 007_auth_users.sql で作成 |

> 全アカウント共通でパスワードは `password123` です。詳細は `db/seeds/007_auth_users.sql` を参照してください。

### 6.3 一連の操作テスト

```
1. http://localhost:3001 にアクセス
2. 「エンドユーザー」をクリック
3. ログインページで alice@example.com / password123 でログイン
4. ダッシュボードに人気商品が表示されることを確認
5. 「製品」リンクをクリックして商品一覧を確認
6. フィルターで「価格: 安い順」を選択して「絞り込む」
7. 商品名をクリックして詳細ページを確認
8. 「カートに追加」ボタンをクリック
9. ログアウトして、ロール選択に戻る
10. 「管理者」をクリック
11. admin@example.com / password123 でログイン
12. ユーザー管理画面でユーザーのCRUD操作を確認
```

---

## 7. よく使う操作コマンド

### 7.1 Docker Compose コマンド一覧

```bash
# ===== 起動・停止 =====
docker compose up -d --build    # 全サービスをビルド&起動
docker compose up -d backend    # 特定サービスだけ起動
docker compose stop             # 全サービスを停止
docker compose down             # 停止 + コンテナ削除
docker compose down -v          # 停止 + コンテナ + ボリューム削除（完全リセット）
docker compose restart backend  # 特定サービスを再起動

# ===== 状態確認 =====
docker compose ps               # サービス一覧と状態
docker compose logs             # ログ表示
docker compose logs -f backend  # バックエンドのログをリアルタイム追跡
docker compose top              # 実行中のプロセス

# ===== コンテナ内でコマンド実行 =====
docker exec -it restapi-db mysql -u app -papp_password app_db    # MySQL接続
docker exec -it restapi-backend sh                                # バックエンドのシェル
docker exec -it restapi-frontend sh                               # フロントエンドのシェル

# ===== イメージ管理 =====
docker compose build             # イメージを再ビルド
docker compose build --no-cache  # キャッシュなしでビルド
docker images                    # イメージ一覧
docker system prune              # 不要なリソースを削除
```

### 7.2 データベースの初期化（やり直し）

データベースを完全にリセットしたい場合:

```bash
# 1. サービスを停止してボリュームも削除
docker compose down -v

# 2. 再起動（init/ と migrations/ と seeds/ が再実行される）
docker compose up -d --build

# 3. 状態確認（healthy を待つ）
docker compose ps
```

### 7.3 個別サービスの再ビルド

コードを変更した後に反映する方法:

```bash
# バックエンドだけ再ビルド＆再起動
docker compose up -d --build backend

# フロントエンドだけ再ビルド＆再起動
docker compose up -d --build frontend
```

---

## 8. トラブルシューティング

### 8.1 起動時によくあるエラー

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `Error: ECONNREFUSED 127.0.0.1:3306` | バックエンドが DB に接続できない | Docker 内では `DB_HOST=db` が必要。`docker-compose.yml` の `environment` で上書きされているか確認 |
| `port is already allocated` | ポートが他のプロセスで使用中 | `lsof -i :3000` で確認し、`kill <PID>` で終了 |
| `no matching manifest for linux/arm64` | Apple Silicon で非対応イメージ | `platform: linux/amd64` を追加するか、ARM 対応イメージを使用 |
| `db exited with code 1` | `.env` ファイルが不足 or 内容に問題 | `db/.env` の存在と内容を確認 |
| `build failed` | Dockerfile のエラー or `package-lock.json` の不一致 | `npm install` を実行して `package-lock.json` を再生成 |

### 8.2 DB に接続できない場合

```bash
# 1. DB コンテナの状態確認
docker compose ps db
# STATUS が "healthy" でなければ待つ

# 2. DB のログ確認
docker compose logs db

# 3. DB に直接接続テスト
docker exec -it restapi-db mysqladmin ping -u app -papp_password

# 4. ネットワーク確認
docker network ls
docker network inspect restapi_restapi-network
```

### 8.3 フロントエンドがバックエンドに接続できない場合

```bash
# 1. バックエンドが起動しているか
curl http://localhost:3000/api/health

# 2. CORS 設定の確認
# バックエンドの app.js では app.use(cors()) で全オリジンを許可しています。
# CORS エラーが出る場合は、バックエンドが正しく起動しているか確認してください。

# 3. フロントエンドの環境変数確認
cat frontend/.env
# VITE_API_BASE_URL=http://localhost:3000/api

# 4. ブラウザの DevTools > Console でエラーを確認
# 5. ブラウザの DevTools > Network で API リクエストの状態を確認
```

### 8.4 データベースのリセット

```bash
# 方法1: ボリューム削除で完全リセット
docker compose down -v
docker compose up -d --build

# 方法2: 手動でテーブルを再作成
docker exec -it restapi-db mysql -u app -papp_password app_db < db/migrations/001_create_users.sql
```

### 8.5 Docker のリソースクリーンアップ

```bash
# 停止中のコンテナ・未使用イメージ・ネットワークを削除
docker system prune

# ボリュームも含めて削除（注意: すべてのデータが消えます）
docker system prune --volumes

# ディスク使用量の確認
docker system df
```

---

## 付録A: ディレクトリ別の Dockerfile 解説

### バックエンド（backend/Dockerfile）

```dockerfile
# ステージ1: 依存関係のインストール
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                           # package-lock.json に従い厳密にインストール

# ステージ2: 本番イメージ
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules  # 依存のみコピー
COPY . .                                              # ソースコードをコピー
EXPOSE 3000
CMD ["npm", "start"]                                  # サーバー起動
```

### フロントエンド（frontend/Dockerfile）

```dockerfile
# ステージ1: ビルド
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build                    # Vite でビルド → dist/ に成果物

# ステージ2: 本番イメージ（静的配信）
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve             # 静的ファイルサーバーをインストール
COPY --from=builder /app/dist ./dist # ビルド成果物のみコピー
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]  # SPA モードで配信
```

**`npm ci` vs `npm install`:**
- `npm ci`: `package-lock.json` に従って厳密にインストール。CI/CD や Docker で推奨
- `npm install`: `package.json` を元にインストールし、`package-lock.json` を更新する可能性がある

---

## 付録B: 環境別の設定まとめ

### Docker 起動時のポートマッピング

```
ブラウザ (ホスト)           Docker コンテナ内
────────────────────────────────────────────
http://localhost:3001  →  frontend:3000 (serve)
http://localhost:3000  →  backend:3000  (Express)
localhost:3306         →  db:3306       (MySQL)
```

### Docker vs ローカルの環境変数の違い

| 変数 | Docker時の値 | ローカル時の値 |
|------|-------------|---------------|
| `DB_HOST` | `db`（docker-compose.yml で上書き） | `127.0.0.1` |
| `DB_PORT` | `3306`（docker-compose.yml で上書き） | `3306` |
| フロントエンドURL | `http://localhost:3001` | `http://localhost:5173` |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | `http://localhost:3000/api` |

---

## 付録C: 開発ワークフロー

### 日常の開発フロー（推奨）

```bash
# 1. DB コンテナを起動（初回のみ、またはPCを再起動した後）
cd /path/to/RESTAPI
docker compose up -d db

# 2. バックエンドをローカルで起動
cd backend
npm run dev

# 3. フロントエンドをローカルで起動（別ターミナル）
cd frontend
npm run dev

# 4. コードを編集 → 自動的にリロードされる

# 5. 終了時
# ターミナルで Ctrl+C してバックエンド・フロントエンドを停止
# DBは起動したままでOK（次回の開発で再利用）
```

### デプロイ（本番確認）フロー

```bash
# 全サービスをDockerで一括起動
docker compose up -d --build

# ブラウザで http://localhost:3001 にアクセスして動作確認

# 確認が終わったら停止
docker compose down
```

---

> **ガイド一覧:**
> 1. `01_DATABASE_GUIDE.md` - データベース構築ガイド
> 2. `02_BACKEND_GUIDE.md` - バックエンド構築ガイド
> 3. `03_FRONTEND_GUIDE.md` - フロントエンド構築ガイド
> 4. `04_STARTUP_GUIDE.md` - スタートアップガイド（本ファイル）
