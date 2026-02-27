# Docker Compose 統合セットアップ手順書

このドキュメントは、**フロントエンド**、**バックエンド**、**データベース**を Docker && Docker Compose で一括起動する方法をまとめたものです。

## 目次

1. [前提条件](#前提条件)
2. [ディレクトリ構成](#ディレクトリ構成)
3. [手順 1: Docker インストール確認](#手順-1-docker-インストール確認)
4. [手順 2: 環境変数ファイルの確認](#手順-2-環境変数ファイルの確認)
5. [手順 3: Dockerfile と .dockerignore の確認](#手順-3-dockerfile-と-dockerignore-の確認)
6. [手順 4: docker-compose.yml の確認](#手順-4-docker-composeyml-の確認)
7. [手順 5: イメージビルドと起動](#手順-5-イメージビルドと起動)
8. [手順 6: 動作確認](#手順-6-動作確認)
9. [手順 7: よくあるトラブルシューティング](#手順-7-よくあるトラブルシューティング)
10. [手順 8: 停止と再起動](#手順-8-停止と再起動)

---

## 前提条件

1. **Docker** がインストール済みであること
   - Docker Desktop（Mac / Windows）
   - または Docker Engine（Linux）
   - バージョン: 20.10 以上推奨

2. **Docker Compose** がインストール済みであること
   - Docker Desktop をインストール済みなら含まれている
   - Linux の場合は別途インストール必須

3. **Git** でリポジトリをクローン済みであること
   ```
   git clone <repository-url>
   cd RESTAPI
   ```

4. **ディレクトリ構成** が以下の通りであること

---

## このドキュメントで実装するベストプラクティス

✅ **ファイル直接マウント方式**
- migrations/ と seeds/ の各SQLファイルを直接マウント（ファイルコピー不要）

✅ **マルチステージビルド**
- イメージサイズの最適化とビルドキャッシュの活用

✅ **ヘルスチェックによる起動順序制御**
- DB 完全起動後にバックエンドを起動

✅ **環境変数の適切な分離**
- 開発環境と本番環境で異なる設定を管理

---

## ディレクトリ構成

```
RESTAPI/（ルート）
├── docker-compose.yml   ← このファイル：全サービス統合定義
├── DOCKER_SETUP.md      ← このドキュメント
├── backend/
│   ├── Dockerfile       ← バックエンド用
│   ├── .dockerignore
│   ├── package.json
│   ├── .env             ← DB 接続情報
│   └── src/
├── frontend/
│   ├── Dockerfile       ← フロントエンド用
│   ├── .dockerignore
│   ├── package.json
│   └── src/
└── db/
    ├── docker-compose.yml   ← DB 単独用（本手順では使わない）
    ├── .env                 ← MySQL 環境変数
    ├── init/                ← 初期化SQL（権限設定など）
    │   └── 00_init.sql
    ├── migrations/          ← テーブル作成SQL（自動実行される）
    │   └── 001_create_users.sql
    ├── seeds/               ← 初期データSQL（自動実行される）
    │   └── 001_users.sql
    └── README.md

**重要:** docker-compose.yml は init/, migrations/, seeds/ を直接マウントします。
各ディレクトリ内のSQLファイルが自動的に実行されるため、ファイルコピーは不要です。
```

---

## 重要な概念の理解

Docker Compose で統合する前に、以下の重要な概念を理解してください。

### Dockerfile vs docker-compose.yml

| ツール | 役割 | 出力 |
|--------|------|------|
| **Dockerfile** | イメージを「作成」する設計書 | Docker イメージ |
| **docker-compose.yml** | コンテナを「起動・管理」する設定ファイル | 実行中のコンテナ |

**2つのフロー：**

```
【パターン1】イメージが既にある場合
docker-compose.yml
    ↓ docker compose up
  コンテナ起動（実行）
    ↓
  localhost:3000 などでアクセス可能

【パターン2】イメージを作る必要がある場合
docker-compose.yml（build: セクションがある）
    ↓ docker compose up --build
  1. Dockerfile でイメージビルド
  2. コンテナ起動（実行）
    ↓
  localhost:3000 などでアクセス可能
```

### Docker Compose ネットワーク（同じ箱の中）

docker compose up で起動されたサービスは、**同じネットワーク内にある**ため、service 名で相互アクセスできます。

```
┌─────────────────────────────────────────────────────┐
│         同じ Docker Compose ネットワーク              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  backend コンテナ ←DNS→ db コンテナ                  │
│  (service: backend)    (service: db)               │
│                                                     │
│  backend から「db」で特定可能（自動 DNS 解決）        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**別々に起動した場合：**
```
db コンテナ（ネットワーク A）
backend コンテナ（ネットワーク B）
  ↓
異なるネットワーク → ❌ service 名で接続不可
```

### ポートマッピング（透過的なアクセス）

```
【ホスト PC】              【Docker コンテナ】

localhost:3000 
      ↓ ポートマッピング
  backend コンテナ（172.19.0.3:3000）
      ↓
  Node.js プロセス
```

ユーザーから見ると「localhost で動いている」ように見えるが、実際にはコンテナ内で動作している。

---

## 手順 1: Docker インストール確認

Mac、Windows、Linux で Docker が正しくインストールされているか確認します。

### ターミナルで以下を実行

```bash
docker --version
docker compose version
```

**期待される出力例**
```
Docker version 25.0.0, build abcdef
Docker Compose version 2.24.0
```

**⚠️ もし「command not found」と出たら**
- Mac/Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop) をダウンロード＆インストール
- Linux: 公式ガイド: https://docs.docker.com/engine/install/

---

## 手順 2: 環境変数ファイルの確認

Docker Compose は複数の `.env` ファイルを参照します。以下の 3 ファイルが正しく設定されていることを確認してください。

### 2-1: db/.env の確認

```bash
cat db/.env
```

**期待される内容**
```
MYSQL_ROOT_PASSWORD=root_password
MYSQL_DATABASE=app_db
MYSQL_USER=app
MYSQL_PASSWORD=app_password
MYSQL_PORT=3306
```

**⚠️ ファイルない場合**
```bash
cat db/.env.example > db/.env
# 内容を確認して必要に応じて編集
```

### 2-2: backend/.env の編集

backend/.env を開いて、**DB_HOST を修正** します。

```bash
cat backend/.env
```

**現在の内容（修正前）**
```
PORT=3000
DB_HOST=127.0.0.1   ← こここれを変更
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db
```

**修正後の内容**
```
PORT=3000
DB_HOST=db          # ← localhost/127.0.0.1 ではなく "db" に変更
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db
```

**編集方法**

VS Code などのエディタで backend/.env を開き、`DB_HOST=127.0.0.1` を **`DB_HOST=db`** に変更して保存してください。

⚠️ **重要**
- Docker Compose では、同じネットワーク内の service 名（`db`）でホストをアクセスします
- `localhost` や `127.0.0.1` では、コンテナ内から DB サービスに接続できません
- この設定忘れが最も多いエラーの原因です

**なぜ DB_HOST=db で接続できるのか？（DNS 名前解決）**

Docker Compose は同じネットワーク内のサービスに対して、**service 名を自動的に DNS に登録**します。

```
backend コンテナ内：
  DB_HOST=db に接続試行
       ↓
  Docker 埋め込み DNS サーバーに問い合わせ
       ↓
  「db」= db コンテナの IP アドレス（例：172.19.0.2）に解決
       ↓
  172.19.0.2:3306 に接続
       ↓
  ✅ db コンテナに接続成功
```

これは google.com → IP アドレスに解決されるのと同じ仕組みです。

**2つのシナリオ比較：**

| backend の起動場所 | DB の起動場所 | DB_HOST | 理由 |
|------------------|--------------|---------|------|
| ローカル PC | Docker コンテナ | `127.0.0.1` | ポートマッピング（3306:3306）経由でアクセス |
| Docker コンテナ | Docker コンテナ | `db` | 同じネットワーク内で service 名が有効 |

### 2-3: frontend の確認

フロントエンドは .env ファイルが不要です。API URL は `frontend/src/services/api.js` にハードコードされています（`http://localhost:3000/api`）。

### 2-4: データベース初期化ファイルの準備（ベストプラクティス）

MySQL コンテナは、初回起動時に `/docker-entrypoint-initdb.d/` 内のSQLファイルを**アルファベット順**に自動実行します。

⚠️ **重要**: MySQLは**ファイル**（.sql、.sh、.sql.gz）のみを実行し、**ディレクトリは無視**します。

**現在の構成:**
```
db/
├── init/
│   └── 00_init.sql          ← 初期化（権限設定など）
├── migrations/
│   └── 001_create_users.sql ← テーブル作成SQL
└── seeds/
    └── 001_users.sql        ← 初期データSQL
```

**ベストプラクティス: ファイル直接マウント方式**

各SQLファイルを`/docker-entrypoint-initdb.d/`内に直接マウントします。
docker-compose.yml の `db` セクションの `volumes` を以下のように変更してください：

```yaml
db:
  volumes:
    - db_data:/var/lib/mysql
    - ./db/init/00_init.sql:/docker-entrypoint-initdb.d/00_init.sql
    - ./db/migrations/001_create_users.sql:/docker-entrypoint-initdb.d/01_001_create_users.sql
    - ./db/seeds/001_users.sql:/docker-entrypoint-initdb.d/02_001_users.sql
```

**実行順序:**
1. `00_init.sql` - DB初期化（権限設定など）
2. `01_001_create_users.sql` - テーブル作成
3. `02_001_users.sql` - 初期データ挿入

⚠️ **重要**: ファイル名の接頭辞（00_, 01_, 02_）で実行順序が決まります。

**メリット:**
- ✅ ファイルコピー不要（DRY原則）
- ✅ ソースファイルを直接使用
- ✅ 確実にSQLファイルが実行される

**新しいマイグレーションファイルを追加する場合:**
1. `db/migrations/002_create_posts.sql` を作成
2. `docker-compose.yml` に以下を追加：
   ```yaml
   - ./db/migrations/002_create_posts.sql:/docker-entrypoint-initdb.d/01_002_create_posts.sql
   ```
3. `docker compose down --volumes && docker compose up --build` で再起動

---

## 手順 3: Dockerfile と .dockerignore の確認

各ディレクトリに **必ず** Dockerfile と .dockerignore が存在することを確認。

```bash
# バックエンド
ls -la backend/Dockerfile backend/.dockerignore

# フロントエンド
ls -la frontend/Dockerfile frontend/.dockerignore
```

**⚠️ ファイル不存在の場合**
各サービスの README ドキュメント参照：
- Backend: [backend/README.md](./backend/README.md) - Docker化 セクション
- Frontend: [frontend/README_FE.md](./frontend/README_FE.md) - Docker化 セクション

---

## 手順 4: docker-compose.yml を作成

ルートディレクトリ（RESTAPI/）に `docker-compose.yml` を作成します。

### 4-1: ファイル作成

**ファイルパス**
```
RESTAPI/（ルート）
└── docker-compose.yml   ← ここに作成
```

**ファイル内容**

`RESTAPI/docker-compose.yml` に以下を記載：

```yaml
services:
  # データベース (MySQL 8.0)
  db:
    image: mysql:8.0
    container_name: restapi-db
    env_file:
      - db/.env
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./db/init/00_init.sql:/docker-entrypoint-initdb.d/00_init.sql
      - ./db/migrations/001_create_users.sql:/docker-entrypoint-initdb.d/01_001_create_users.sql
      - ./db/seeds/001_users.sql:/docker-entrypoint-initdb.d/02_001_users.sql
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "mysqladmin ping -h 127.0.0.1 -u ${MYSQL_USER} -p${MYSQL_PASSWORD}"
        ]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - restapi-network

  # バックエンド API (Node.js + Express)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: restapi-backend
    env_file:
      - backend/.env
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DB_HOST=db
      - DB_PORT=3306
    networks:
      - restapi-network
    command: npm start

  # フロントエンド (React + Vite)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: restapi-frontend
    ports:
      - "3001:3000"
    depends_on:
      - backend
    networks:
      - restapi-network

volumes:
  db_data:

networks:
  restapi-network:
    driver: bridge
```

### 4-2: 重要な設定のポイント

#### 4-2-1: サービス間通信（ネットワーク）

```yaml
networks:
  restapi-network:
    driver: bridge
```

**解説**
- 同じネットワーク内のサービスは、`サービス名` で相互通信可能
- 例: バックエンド → `db:3306` で MySQL に接続

#### 4-2-2: 起動順序の制御（depends_on）

```yaml
backend:
  depends_on:
    db:
      condition: service_healthy
```

**解説**
- `backend` は `db` が健康状態（healthcheck 成功）になるまで起動を待つ
- これにより、DB が準備完了前にバックエンドが接続エラーになることを防止

#### 4-2-3: ポートマッピング

```yaml
db:       3306:3306     # ホスト:コンテナ = 3306:3306
backend:  3000:3000     # ホスト:コンテナ = 3000:3000
frontend: 3001:3000     # ホスト:コンテナ = 3001:3000
```

**解説**
- コロン左側 = ホスト PC のポート、右側 = コンテナ内のポート
- `localhost:3000` でアクセス → backend コンテナの 3000 へ転送
- `localhost:3001` でアクセス → frontend コンテナの 3000 へ転送
- フロントエンドは **3001** で公開（バックエンド 3000 と衝突避け）

**なぜ両方とも 3000 でいいのか？**

コンテナは独立した空間なので、同じポート番号でも衝突しません：

```
【ホスト PC】              【Docker 領域】

localhost:3000  ────→  backend コンテナ（内部：3000）
                         
localhost:3001  ────→  frontend コンテナ（内部：3000）

                      ↑
            別々のコンテナなので
            両方とも 3000 でOK
```

**なぜ localhost:3000 でアクセスできるのか？**

```
ブラウザ：http://localhost:3000/api/health にアクセス
         ↓
ホスト PC：127.0.0.1:3000 でリッスン
         ↓
ポートマッピング（Docker の機能）
         ↓
コンテナ内：172.19.0.3:3000（コンテナのプライベート IP）
         ↓
Node.js プロセス：ポート 3000 でリッスン
         ↓
レスポンス返送（逆順に戻る）
```

この「透過的な転送」により、ユーザーは localhost でアクセスできるが、実際にはコンテナ内で動作しています。

#### 4-2-4: ボリューム（DB データ永続化と初期化）

```yaml
volumes:
  db_data:

services:
  db:
    volumes:
      - db_data:/var/lib/mysql
      - ./db/init/00_init.sql:/docker-entrypoint-initdb.d/00_init.sql
      - ./db/migrations/001_create_users.sql:/docker-entrypoint-initdb.d/01_001_create_users.sql
      - ./db/seeds/001_users.sql:/docker-entrypoint-initdb.d/02_001_users.sql
```

**解説**
- `db_data` ボリュームで MySQL のデータを永続化
- コンテナ削除後も、ボリューム削除しなければデータが残される
- **ファイル直接マウント**により、各SQLファイルを `/docker-entrypoint-initdb.d/` 内に配置
  - `00_init.sql` → 初期化SQL（権限設定など）
  - `01_001_create_users.sql` → テーブル作成SQL
  - `02_001_users.sql` → 初期データSQL
- ファイル名の接頭辞（00_, 01_, 02_）で実行順序を制御
- 初回起動時のみ自動実行される（既存ボリュームがある場合はスキップ）

**ベストプラクティスポイント:**
- ファイルコピー不要（ソースファイルを直接使用）
- MySQLが確実にファイルを認識・実行
- ソースファイルが単一の真実の源（Single Source of Truth）

⚠️ **注意**: 新しいマイグレーションファイルを追加する場合は、docker-compose.yml にもマウント設定を追記する必要があります。

#### 4-2-5: ビルド設定

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
```

**解説**
- `context`: Dockerfile と関連ファイルの場所
- `dockerfile`: ファイル名（デフォルト: Dockerfile）
- `docker compose up --build` 実行時に、この設定を元に Dockerfile でイメージをビルド

---

## 手順 5: docker-compose.yml を実行してコンテナを起動

### 5-1: 全サービスを起動

ルートディレクトリで以下を実行：

```bash
cd RESTAPI
docker compose up --build
```

**何が起こるか：**
1. **docker-compose.yml を読み込み**
2. **`build:` セクションがある場合、Dockerfile でイメージをビルド**
   - backend/Dockerfile → restapi-backend イメージ
   - frontend/Dockerfile → restapi-frontend イメージ
3. **全サービスのコンテナを起動**
   - db, backend, frontend

**オプション説明**
- `--build`: `build:` セクションがある場合に Dockerfile から最新イメージをビルド（初回必須）
- `--detach` または `-d`: バックグラウンド起動（省略時はログをリアルタイム表示）

**⚠️ 実行前チェック**

起動する前に、以下を確認してください：
```bash
# 各ディレクトリの SQLファイルを確認
ls -1 db/init/
ls -1 db/migrations/
ls -1 db/seeds/

# 期待される出力例:
# db/init/
#   00_init.sql
# db/migrations/
#   001_create_users.sql
# db/seeds/
#   001_users.sql
```

各ディレクトリにSQLファイルがあることを確認してください。

**初回実行時の流れ**
1. MySQL イメージをダウンロード（数秒～1分）
2. Node.js イメージをダウンロード（数秒）
3. backend/Dockerfile をビルド（npm install 実行、数分）
4. frontend/Dockerfile をビルド（npm run build 実行、1分）
5. 全サービスのコンテナを起動
6. **DB 初期化スクリプト自動実行**（アルファベット順）
   - `00_init/` 内のSQL → DB初期化
   - `01_migrations/` 内のSQL → テーブル作成
   - `02_seeds/` 内のSQL → 初期データ挿入

**⚠️ 初回は時間がかかります（5～10分が目安）**

**※ 重要**: もし以前に DB を起動していて `db_data` ボリュームが既に存在する場合、初期化 SQL がスキップされます。その場合は `docker compose down --volumes` してから再実行してください。

### 5-2: ログをリアルタイム表示

起動中のログを確認する方法：

```bash
docker compose logs -f
```

**ログ例（正常系）**
```
restapi-db       | MySQL init process done. Ready for start up.
restapi-backend  | API server listening on port 3000
restapi-frontend | ⚠ Serving dist directory with serve@15.0.0
restapi-frontend | Accepting connections on port 3000
```

### 5-3: バックグラウンドで起動（オプション）

ログを表示したくない場合：

```bash
docker compose up --build --detach
```

その後、ログを確認したい場合：

```bash
docker compose logs -f backend   # バックエンドのみ
docker compose logs -f           # 全サービス
```

---

## 手順 6: 動作確認

### 6-1: コンテナが起動しているか確認

```bash
docker compose ps
```

**期待される出力**
```
NAME                 IMAGE                           STATUS
restapi-db           mysql:8.0                       Up 2 minutes (healthy)
restapi-backend      restapi-backend:latest          Up 1 minute
restapi-frontend     restapi-frontend:latest         Up 1 minute
```

**⚠️ Status が "Exit" になっていたら**
```bash
docker compose logs backend  # エラーメッセージを確認
```

### 6-2: バックエンド API 動作確認

```bash
curl http://localhost:3000/api/health
```

**期待される応答**
```json
{
  "status": "ok",
  "timestamp": "2025-02-16T10:30:00.000Z"
}
```

### 6-3: ユーザー一覧取得（API テスト）

```bash
curl http://localhost:3000/api/users
```

**期待される応答（JSON）**
- 初期状態なら `[]`（空）
- シードデータがあれば、ユーザー一覧が表示

### 6-4: フロントエンド確認

ブラウザで以下にアクセス：

```
http://localhost:3001
```

**期待される表示**
- ページが読み込まれ、「ユーザー管理」と表示
- 「新規作成」フォーム
- 「ユーザー一覧」セクション

### 6-5: フロントエンド＋バックエンド統合テスト

1. ページを http://localhost:3001 で開く
2. 「名前」に「太郎」、「メール」に「taro@example.com」を入力
3. 「作成」ボタンを押す
4. ユーザー一覧に「太郎」が表示されるか確認

**成功なら**、フロント・バック・DB が正常に連携しています 🎉

---

## 手順 7: よくあるトラブルシューティング

### 問題 1: "container name is already in use" エラー

**症状**: `The container name "/restapi-db" is already in use`

**原因**: 以前に db/docker-compose.yml で起動したコンテナが残っている

**解決策（ベストプラクティス）**:
```bash
# 方法1: 古いコンテナを削除
docker rm -f restapi-db restapi-backend restapi-frontend

# 方法2: db/docker-compose.yml で起動したものなら
docker compose -f db/docker-compose.yml down

# 方法3: 全ての停止済みコンテナを削除
docker container prune

# その後、新しいdocker-compose.ymlで起動
docker compose up --build
```

**予防策**: 今後は `docker compose down` で停止すれば、コンテナも自動削除されます。

### 問題 2: "Cannot connect to Docker daemon"

**原因**: Docker Desktop が起動していない

**解決策**: Mac/Windows なら Docker Desktop を起動

```bash
# Mac
open /Applications/Docker.app

# Windows: スタートメニューから Docker Desktop を起動
```

### 問題 3: "db" コンテナが "Exit" 状態で起動しない

**原因**: ポート 3306 が既に使用されている（別の MySQL が起動中）

**解決策**:
```bash
# 既存の MySQL サービスを停止
# Mac の場合
brew services stop mysql

# その後、docker compose up --build を再実行
```

### 問題 3: WARNING "The MYSQL_USER variable is not set"

**症状**: 起動時に `WARN[0000] The "MYSQL_USER" variable is not set`

**原因**: これは無害な警告です。healthcheck コマンド内で `${MYSQL_USER}` を参照していますが、docker-compose.yml 側では定義されていません（db/.env で定義されています）。

**解決策（オプション）**: 警告を消すなら、docker-compose.yml の db セクションに追加：
```yaml
db:
  environment:
    - MYSQL_USER=${MYSQL_USER:-app}
    - MYSQL_PASSWORD=${MYSQL_PASSWORD:-app_password}
```

ただし、**動作には影響しないので無視してOK**です。

### 問題 4: WARNING "the attribute `version` is obsolete"

**症状**: `the attribute 'version' is obsolete, it will be ignored`

**原因**: Docker Compose v2+ では version 指定が不要になりました

**解決策**: docker-compose.yml の1行目 `version: "3.9"` を削除

### 問題 5: バックエンド API が "Cannot connect to database" エラー

**原因**: `backend/.env` の `DB_HOST=localhost` のまま

**解決策**:
```bash
# backend/.env を編集
DB_HOST=db    # ← localhost から db に変更

# 再起動
docker compose restart backend
```

### 問題 6: フロントエンドで CORS エラー

**症状**: ブラウザコンソールに `CORS policy: blocked by CORS`

**原因**: バックエンド API の CORS 設定が不正

**解決策**: [backend/README.md](./backend/README.md) の「手順 2: 基本設定」を確認

### 問題 7: イメージビルド時に "npm: command not found"

**原因**: Dockerfile の Node.js イメージが正しくない

**解決策**: Dockerfile を確認（alpine でなく通常の node:20 を推奨）

```dockerfile
FROM node:20  # ← node:20-alpine でなく こちら
```

### 問題 8: ディスク容量がない

**症状**: ビルド途中で "No space left on device"

**解決策**: Docker のファイルシステムをクリーンアップ

```bash
# 未使用のイメージ、コンテナ、ボリュームを削除
docker system prune -a --volumes
```

### 問題 9: "Table 'app_db.users' doesn't exist" エラー

**症状**: バックエンドログに `Error: Table 'app_db.users' doesn't exist`

**原因1**: MySQL の初期化スクリプトが実行されていない（既存ボリュームが残っている）

MySQL は**既存のボリュームデータがある場合、初期化スクリプトをスキップ**します。

**解決策1（最も一般的）**:
```bash
# ボリュームを削除して再起動
docker compose down --volumes
docker compose up --build
```

**なぜこれで解決するか：**
- `--volumes` で `db_data` ボリュームを削除
- 再起動時、MySQL が空のボリュームを検知
- `/docker-entrypoint-initdb.d/` の SQL ファイルを自動実行（00→01→02の順）
- テーブルが作成され、初期データが挿入される

⚠️ **注意**: `--volumes` はデータベース内の全データを削除します。開発環境では問題ありませんが、本番環境では絶対に使用しないでください。

**原因2**: docker-compose.yml でディレクトリをマウントしている（誤った設定）

MySQL は `/docker-entrypoint-initdb.d/` 内の**ファイル**（.sql、.sh、.sql.gz）のみを実行し、**ディレクトリは無視**します。

**確認方法**:
```bash
# DBログで警告を確認
docker compose logs db | grep -i "ignoring"

# 以下のような警告が出ている場合は誤り：
# [Warn] [Entrypoint]: ignoring /docker-entrypoint-initdb.d/00_init
# [Warn] [Entrypoint]: ignoring /docker-entrypoint-initdb.d/01_migrations
# [Warn] [Entrypoint]: ignoring /docker-entrypoint-initdb.d/02_seeds
```

**解決策2**:
docker-compose.yml の `db.volumes` を以下のように修正：

```yaml
# ❌ 誤り（ディレクトリマウント）
volumes:
  - ./db/init:/docker-entrypoint-initdb.d/00_init
  - ./db/migrations:/docker-entrypoint-initdb.d/01_migrations
  - ./db/seeds:/docker-entrypoint-initdb.d/02_seeds

# ✅ 正しい（ファイル直接マウント）
volumes:
  - ./db/init/00_init.sql:/docker-entrypoint-initdb.d/00_init.sql
  - ./db/migrations/001_create_users.sql:/docker-entrypoint-initdb.d/01_001_create_users.sql
  - ./db/seeds/001_users.sql:/docker-entrypoint-initdb.d/02_001_users.sql
```

修正後、ボリュームを削除して再起動：
```bash
docker compose down --volumes
docker compose up --build
```

**原因3**: SQLファイルが存在しない、または構文エラーがある

**解決策3**:
```bash
# 各ディレクトリのSQLファイルを確認
ls -1 db/init/
ls -1 db/migrations/
ls -1 db/seeds/

# ログで初期化エラーを確認
docker compose logs db | grep -i error
```

もしファイルが不足していれば作成してください。SQLの構文エラーがあれば修正してください。

---

## 手順 8: 停止と再起動

### 8-1: 全サービスを停止（コンテナは残す）

```bash
docker compose stop
```

### 8-2: 全サービスを停止＋コンテナ削除

```bash
docker compose down
```

**注: これでもデータベースデータは `db_data` ボリュームに残る**

### 8-3: ボリューム（データベース）も削除

```bash
docker compose down --volumes
```

**⚠️ これを実行するとユーザーデータが完全に削除される**

### 8-4: 再起動

```bash
# コード変更後：イメージを再ビルドして起動
docker compose up --build

# コード変更なし：既存イメージでそのまま起動
docker compose up

# バックグラウンドで起動
docker compose up -d
```

---

## 次の一歩

Docker Compose による統合が完了したら：

### 環境分離
- **開発環境**: `docker-compose.yml`（現在）
- **本番環境**: `docker-compose.prod.yml` を別途作成
  - 例: バックエンド DB ホスト名を変更、フロントエンド API ベース URL（api.js）を本番 URL に変更

### データベースマイグレーション管理（本番環境）

**開発環境と本番環境の違い:**

| 項目 | 開発環境（現在） | 本番環境（推奨） |
|------|----------------|----------------|
| 方式 | `/docker-entrypoint-initdb.d/` で全SQL自動実行 | マイグレーションツールで段階的適用 |
| 特徴 | 初回起動時のみ、全て一括実行 | バージョン管理、ロールバック可能 |
| 用途 | 開発者が素早く環境構築 | 本番DBへの安全なスキーマ変更 |

**本番環境のベストプラクティス:**

**1. マイグレーションツールの導入**

推奨ツール：
- **Node.js**: [node-pg-migrate](https://github.com/salsita/node-pg-migrate), [Knex.js](http://knexjs.org/), [Sequelize Migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- **汎用**: [Flyway](https://flywaydb.org/), [Liquibase](https://www.liquibase.org/)

**2. マイグレーション実行タイミング**
```bash
# バックエンドコンテナ起動時に自動実行
# backend/Dockerfile または docker-compose.yml の command で指定
command: sh -c "npx sequelize-cli db:migrate && npm start"
```

**3. 本番用 docker-compose.prod.yml の例**
```yaml
services:
  db:
    volumes:
      - db_data:/var/lib/mysql
      # ❌ 本番では /docker-entrypoint-initdb.d/ をマウントしない
    # 初期化は初回のみ手動で実行

  backend:
    command: sh -c "npx sequelize-cli db:migrate && npm start"
    # コンテナ起動時にマイグレーション適用
```

**4. マイグレーションファイル管理**
```
backend/
└── migrations/
    ├── 20260101000000-create-users.js
    ├── 20260115000000-add-user-status.js
    └── 20260201000000-create-posts.js
```

**メリット:**
- ✅ 段階的にスキーマ変更を適用
- ✅ バージョン管理（どのマイグレーションが適用済みか追跡）
- ✅ ロールバック可能
- ✅ チーム開発で衝突を防ぐ

### デプロイ
1. **クラウド（Docker Registry）に push**
   ```bash
   docker login
   docker tag restapi-backend:latest myregistry/restapi-backend:latest
   docker push myregistry/restapi-backend:latest
   ```

2. **本番サーバーで起動**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### ログ管理
- ELK スタック（Elasticsearch + Logstash + Kibana）の導入
- または CloudWatch（AWS）、Stackdriver（GCP）

### モニタリング
- Prometheus + Grafana でメトリクス監視
- コンテナヘルスチェック強化

### セキュリティ
- Network Policy で通信を制限
- Secret Management（Vault など）で環境変数を管理
- イメージスキャン（Trivy など）で脆弱性検査

---

## まとめ

### 開発環境で実装したベストプラクティス

✅ **Docker Compose で、フロント・バック・DB を一括管理**
- 新メンバーが `docker compose up` だけで環境構築完了

✅ **ファイル直接マウント方式によるDB初期化**
- 各SQLファイルを `/docker-entrypoint-initdb.d/` に直接マウント
- ファイルコピー不要（DRY原則）
- MySQLが確実にファイルを認識・実行
- 実行順序を接頭辞（00_, 01_, 02_）で制御

✅ **マルチステージビルドによる最適化**
- backend: 依存関係のみのレイヤーキャッシュ
- frontend: ビルド成果物のみを本番イメージに含める

✅ **環境変数の適切な管理**
- `.env` ファイルで環境ごとの設定を分離
- Docker Compose の `env_file` で自動読み込み

✅ **ヘルスチェックによる依存関係制御**
- DB が完全に起動してからバックエンドを起動
- 起動失敗のリスクを最小化

### 本番環境への移行

🚀 **本番デプロイの準備**
- イメージをレジストリにプッシュ
- マイグレーションツール（Flyway, Sequelize等）の導入
- 環境変数の Secret Management への移行
- docker-compose.prod.yml の作成

これが「プロフェッショナルなアプリ開発」の基盤です！
