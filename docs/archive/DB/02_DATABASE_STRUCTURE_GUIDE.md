# データベース構造拡張ガイド
## Phase 1-3: フル機能のEコマースプラットフォーム構築

このガイドは、ユーザー管理のみのシンプルなDBを、**注文管理・レビュー機能を備えた本格的なEコマースプラットフォーム**へ進化させるための完全実装ガイドです。

---

## 概要

### フェーズ別のDB構成

#### Phase 1（完了）
- ユーザー管理：`users` テーブルのみ

#### Phase 2（本ガイド Step 1-3）
- 製品管理：`product_categories`、`products` テーブル追加
- 複数製品の一元管理、カテゴリー分類機能

#### Phase 3（本ガイド Step 4-6）
- 注文管理：`orders`、`order_items` テーブル追加
- レビュー機能：`reviews` テーブル追加
- ユーザー注文履歴、レビュー・集計機能

### 最終的な構成（実装後）

**6つのテーブルで本格的なEコマース機能を実現:**
- ユーザー管理 / カテゴリー管理 / 製品管理 / 注文管理 / 注文アイテム管理 / レビュー管理

### メリット

- ✅ 複数製品の管理
- ✅ カテゴリー分類
- ✅ ユーザー注文履歴
- ✅ レビュー・レーティング集計
- ✅ 在庫管理基盤
- ✅ 注文ステータス追跡

---

## 目次

1. [拡張後のDB設計](#拡張後のdb設計)
2. [テーブル定義](#テーブル定義)
3. [実装ステップ](#実装ステップ)
4. [検証方法](#検証方法)
5. [トラブルシューティング](#トラブルシューティング)

---

## 拡張後のDB設計

### テーブル関係図

```
┌──────────────┐
│   users      │ ← ユーザー（既存）
├──────────────┤
│ id [PK]      │
│ name         │
│ email [UQ]   │
│ created_at   │
└──────┬───────┘
       │ 1:N
       ├─────────┬─────────┐
       │         │         │
 ┌─────▼──┐  ┌──▼───────┐
 │ orders │  │ reviews   │
 │(注文)  │  │(レビュー)│
 └────────┘  └───────────┘
       │ 1:N
       │
       └─────────┬──────────┐
                 │ N:1      │ N:1
                 │          │
          ┌──────▼──┐  ┌────▼──────────────┐
          │ products │  │ product_categories│
          │(製品)    │  │(カテゴリー)      │
          └──────────┘  └───────────────────┘
                ▲
                │ N:N (order_items経由)
                │
          ┌─────┴──┐
          │ orders │
          └────────┘
```

### 作成ファイル一覧（全Phase）

| フェーズ | ファイル | 保存先 | 説明 |
|--------|---------|--------|------|
| Phase 2 | `002_create_product_tables.sql` | `db/migrations/` | 製品・カテゴリーテーブル |
| Phase 2 | `002_product_categories.sql` | `db/seeds/` | カテゴリーサンプルデータ |
| Phase 2 | `003_products.sql` | `db/seeds/` | 製品サンプルデータ |
| Phase 3 | `003_create_orders_reviews.sql` | `db/migrations/` | 注文・レビューテーブル |
| Phase 3 | `004_orders.sql` | `db/seeds/` | 注文サンプルデータ |
| Phase 3 | `005_order_items.sql` | `db/seeds/` | 注文アイテムデータ |
| Phase 3 | `006_reviews.sql` | `db/seeds/` | レビューサンプルデータ |

---

## テーブル定義

### 1. users テーブル（既存）

**用途:** ユーザー情報管理

📁 **ファイル:** `db/migrations/001_create_users.sql`

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | BIGINT UNSIGNED | プライマリーキー |
| `name` | VARCHAR(100) | ユーザー名 |
| `email` | VARCHAR(255) | メールアドレス（ユニーク） |
| `created_at` | TIMESTAMP | 作成日時 |

---

### 2. product_categories テーブル（新規）

**用途:** 製品カテゴリー分類

**設計理由:**
製品をカテゴリー分類することで、検索・フィルタリング機能に対応

📁 **ファイル:** `db/migrations/002_create_product_tables.sql` に含まれます

```sql
CREATE TABLE product_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `id` | BIGINT UNSIGNED | プライマリーキー | 1, 2, 3 |
| `name` | VARCHAR(100) UNIQUE | カテゴリー名（重複不可） | 「電子機器」 |
| `description` | TEXT | 詳細説明 | 「スマートフォン、タブレット...」 |
| `icon_url` | VARCHAR(500) | アイコン画像URL | `/images/electronics.png` |
| `display_order` | INT | 表示順序 | 1, 2, 3... |
| `is_active` | BOOLEAN | アクティブフラグ | TRUE/FALSE |
| `created_at` | TIMESTAMP | 作成日時 | 自動 |
| `updated_at` | TIMESTAMP | 更新日時 | 自動更新 |

**インデックス:**
- `idx_name`: カテゴリー名での高速検索
- `idx_is_active`: アクティブなカテゴリーのみフィルタリング

---

### 3. products テーブル（新規）

**用途:** 製品情報管理

**設計理由:**
製品を一元管理し、複数ユーザーが同じ製品を参照できるように

📁 **ファイル:** `db/migrations/002_create_product_tables.sql` に含まれます

```sql
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    sku VARCHAR(100) UNIQUE,
    is_featured BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    reviews_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT,
    INDEX idx_category_id (category_id),
    INDEX idx_price (price),
    INDEX idx_is_featured (is_featured),
    FULLTEXT INDEX idx_fulltext_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `id` | BIGINT UNSIGNED | プライマリーキー | 1, 2, 3 |
| `category_id` | BIGINT UNSIGNED (FK) | カテゴリーID | 1 |
| `name` | VARCHAR(200) | 製品名 | 「iPhone 15 Pro」 |
| `description` | TEXT | 詳細説明 | 「高性能チップ搭載...」 |
| `price` | DECIMAL(10, 2) | 価格 | 150000.00 |
| `stock` | INT UNSIGNED | 在庫数 | 50 |
| `image_url` | VARCHAR(500) | 製品画像URL | `/images/iphone15.jpg` |
| `sku` | VARCHAR(100) UNIQUE | 商品コード | 「SKU-001」 |
| `is_featured` | BOOLEAN | 特集表示フラグ | TRUE/FALSE |
| `rating` | DECIMAL(3, 2) | 平均レーティング | 4.50 |
| `reviews_count` | INT UNSIGNED | レビュー数 | 120 |
| `created_at` | TIMESTAMP | 作成日時 | 自動 |
| `updated_at` | TIMESTAMP | 更新日時 | 自動更新 |

**外部キー制約:**
```
FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT
```
- 存在しないカテゴリーIDを指定できない
- カテゴリー削除時、関連製品があれば削除を拒否

---

### 4. orders テーブル（新規・Phase 3）

**用途:** 注文情報管理

**設計理由:**
ユーザーの注文履歴を記録し、ステータス追跡・分析に活用

📁 **ファイル:** `db/migrations/003_create_orders_reviews.sql` に含まれます

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `id` | BIGINT UNSIGNED | プライマリーキー | 1001 |
| `user_id` | BIGINT UNSIGNED (FK) | ユーザーID | 5 |
| `total_amount` | DECIMAL(10, 2) | 注文合計金額 | 250000.50 |
| `status` | ENUM | ステータス | 'processing' |
| `shipping_address` | TEXT | 配送先住所 | 「東京都渋谷区...」 |
| `tracking_number` | VARCHAR(100) | 追跡番号 | 「YT123456789」 |
| `notes` | TEXT | 備考 | 「ギフト包装希望」 |
| `created_at` | TIMESTAMP | 注文日時 | 自動 |
| `updated_at` | TIMESTAMP | 更新日時 | 自動更新 |
| `shipped_at` | TIMESTAMP | 発送日時 | 発送前はNULL |
| `delivered_at` | TIMESTAMP | 配達日時 | 配達前はNULL |

**ステータス値:**
```
'pending'     → 注文受け取り
'processing'  → 処理中
'shipped'     → 発送済み
'delivered'   → 配達完了
'cancelled'   → キャンセル
```

**カスケード削除:**
```
ON DELETE CASCADE
```
ユーザー削除時、その注文も自動削除される

---

### 5. order_items テーブル（新規・Phase 3）

**用途:** 多対多関係の解決（order 1:N products）

**設計理由:**
1つの注文に複数の製品が含まれることを表現

📁 **ファイル:** `db/migrations/003_create_orders_reviews.sql` に含まれます

```sql
CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) AS (quantity * unit_price) VIRTUAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    UNIQUE KEY uk_order_product (order_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `id` | BIGINT UNSIGNED | プライマリーキー | 5001 |
| `order_id` | BIGINT UNSIGNED (FK) | 注文ID | 1001 |
| `product_id` | BIGINT UNSIGNED (FK) | 製品ID | 42 |
| `quantity` | INT UNSIGNED | 数量 | 3 |
| `unit_price` | DECIMAL(10, 2) | **注文時**の単価 | 50000.00 |
| `subtotal` | DECIMAL(10, 2) VIRTUAL | 小計（自動計算） | 150000.00 |
| `created_at` | TIMESTAMP | 作成日時 | 自動 |

**重要な設計ポイント:**

1. **unit_price が必須な理由**
   ```
   ❌ 間違い: order_items → products.price を参照
   → 製品価格が後で変更されると、注文履歴の価格が変わる

   ✅ 正しい: order_items に unit_price を記録
   → 注文当時の価格が永遠に保存される
   ```

2. **VIRTUAL カラム**
   ```
   AS (quantity * unit_price) VIRTUAL
   → quantity/unit_price が更新されると自動計算
   → ストレージ効率化（仮想カラムは保存されない）
   ```

3. **UNIQUE KEY**
   ```
   UNIQUE KEY uk_order_product (order_id, product_id)
   → 同じ注文に同じ製品を複数行で登録することを防止
   → quantity 増加で対応
   ```

4. **DELETE アクション**
   ```
   order_id: ON DELETE CASCADE
   → 注文削除時、その中身（items）も削除

   product_id: ON DELETE RESTRICT
   → 製品削除時、それを含むオーダーがあれば削除を拒否
   ```

---

### 6. reviews テーブル（新規・Phase 3）

**用途:** 製品レビュー管理

**設計理由:**
ユーザーが製品に投稿したレビューを記録、レーティング集計に活用

📁 **ファイル:** `db/migrations/003_create_orders_reviews.sql` に含まれます

```sql
CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    helpful_count INT UNSIGNED DEFAULT 0,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at),
    UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| カラム | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `id` | BIGINT UNSIGNED | プライマリーキー | 8001 |
| `product_id` | BIGINT UNSIGNED (FK) | 製品ID | 42 |
| `user_id` | BIGINT UNSIGNED (FK) | ユーザーID | 5 |
| `rating` | TINYINT UNSIGNED | 評価（1-5） | 5 |
| `title` | VARCHAR(200) | レビュータイトル | 「素晴らしい製品！」 |
| `comment` | TEXT | レビュー本文 | 「デザインが美しく...」 |
| `helpful_count` | INT UNSIGNED | 役立ち投票数 | 25 |
| `is_verified_purchase` | BOOLEAN | 購入者フラグ | TRUE/FALSE |
| `created_at` | TIMESTAMP | 投稿日時 | 自動 |
| `updated_at` | TIMESTAMP | 更新日時 | 自動更新 |

**CHECK制約:**
```
CHECK (rating >= 1 AND rating <= 5)
```
1～5の星評価のみ受け付ける（DB レベルでの検証）

**UNIQUE KEY:**
```
UNIQUE KEY uk_user_product (user_id, product_id)
```
同じユーザーが同じ製品に複数レビューを投稿することを防止

---

## 実装ステップ

### Step 1: マイグレーションファイル作成

📁 **ファイル:** `db/migrations/002_create_product_tables.sql`

**保存先:** `/Users/haytakeda/Sites/RESTAPI/db/migrations/002_create_product_tables.sql`

```bash
cd /Users/haytakeda/Sites/RESTAPI/db/migrations
cat > 002_create_product_tables.sql << 'EOF'
BEGIN;

CREATE TABLE product_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    sku VARCHAR(100) UNIQUE,
    is_featured BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    reviews_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT,
    INDEX idx_category_id (category_id),
    INDEX idx_price (price),
    INDEX idx_is_featured (is_featured),
    FULLTEXT INDEX idx_fulltext_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
EOF
```

**注意:** `003_create_orders_reviews.sql` は Phase 3 で作成（以下を参照）

---

## Phase 3: 注文・レビュー機能の追加

### Step 7: Phase 3 マイグレーションファイル作成

📁 **ファイル:** `db/migrations/003_create_orders_reviews.sql`

**保存先:** `/Users/haytakeda/Sites/RESTAPI/db/migrations/003_create_orders_reviews.sql`

```bash
cd /Users/haytakeda/Sites/RESTAPI/db/migrations
cat > 003_create_orders_reviews.sql << 'EOF'
BEGIN;

CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) AS (quantity * unit_price) VIRTUAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    UNIQUE KEY uk_order_product (order_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    helpful_count INT UNSIGNED DEFAULT 0,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at),
    UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
EOF
```

---

### Step 8: Phase 3 シードファイル作成

📁 **ファイル:** `db/seeds/004_orders.sql`

**保存先:** `/Users/haytakeda/Sites/RESTAPI/db/seeds/004_orders.sql`

```bash
cat > /Users/haytakeda/Sites/RESTAPI/db/seeds/004_orders.sql << 'EOF'
INSERT INTO orders (user_id, total_amount, status, shipping_address, notes, created_at) VALUES
(1, 300000.00, 'delivered', '東京都渋谷区道玄坂1-2-3', 'ギフト包装希望', '2026-02-10 10:00:00'),
(2, 155000.00, 'shipped', '大阪府大阪市北区中之島1-1-1', '', '2026-02-15 14:30:00'),
(1, 17000.00, 'processing', '東京都渋谷区道玄坂1-2-3', '配達時間帯：16時-18時', '2026-02-16 09:15:00');
EOF
```

📁 **ファイル:** `db/seeds/005_order_items.sql`

**保存先:** `/Users/haytakeda/Sites/RESTAPI/db/seeds/005_order_items.sql`

```bash
cat > /Users/haytakeda/Sites/RESTAPI/db/seeds/005_order_items.sql << 'EOF'
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 150000.00),  -- iPhone 15 Pro: 1個
(1, 4, 5, 2000.00),    -- Tシャツ: 5個
(1, 3, 1, 130000.00),  -- iPad Pro: 1個
(2, 2, 1, 140000.00),  -- Galaxy S24: 1個
(2, 5, 1, 15000.00),   -- ベッド: 1個
(3, 5, 1, 15000.00),   -- ベッド: 1個
(3, 6, 1, 1500.00);    -- 書籍: 1個
EOF
```

📁 **ファイル:** `db/seeds/006_reviews.sql`

**保存先:** `/Users/haytakeda/Sites/RESTAPI/db/seeds/006_reviews.sql`

```bash
cat > /Users/haytakeda/Sites/RESTAPI/db/seeds/006_reviews.sql << 'EOF'
INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase) VALUES
(1, 1, 5, '素晴らしいスマートフォン', 'カメラ性能が最高です。毎日使ってます。', TRUE),
(1, 2, 4, 'バッテリー持ちが良い', '価格は高いですが、満足しています。', TRUE),
(2, 2, 5, '最新スマホの決定版', 'Snapdragon搭載で動作がスムーズ。', TRUE),
(3, 1, 4, '画面が綺麗', 'iPadとしては十分です。', TRUE),
(4, 2, 3, 'サイズ感が微妙', 'もう少し大きいと良かった。', FALSE),
(5, 1, 5, 'コスパ最高', 'ニトリのベッドは信頼できます。', TRUE);
EOF
```

---

### Step 2: Phase 2 シードファイル作成

📁 **ファイル:** `db/seeds/002_product_categories.sql`

**保存先:** `/Users/haytakeda/Sites/RESTAPI/db/seeds/002_product_categories.sql`

```bash
cat > /Users/haytakeda/Sites/RESTAPI/db/seeds/002_product_categories.sql << 'EOF'
INSERT INTO product_categories (name, description, display_order, is_active) VALUES
('エレクトロニクス', 'スマートフォン、タブレット、ラップトップなど', 1, TRUE),
('衣服', 'メンズ、ウィメンズ、子供服', 2, TRUE),
('家庭用品', '家具、寝具、キッチン用品', 3, TRUE),
('書籍', '小説、参考書、漫画', 4, TRUE),
('スポーツ・アウトドア', 'スポーツ用品、キャンプ装備', 5, TRUE);
EOF
```

📁 **ファイル:** `db/seeds/003_products.sql`

**保存先:** `/Users/haytakeda/Sites/RESTAPI/db/seeds/003_products.sql`

```bash
cat > /Users/haytakeda/Sites/RESTAPI/db/seeds/003_products.sql << 'EOF'
INSERT INTO products (category_id, name, description, price, stock, sku, is_featured, rating) VALUES
(1, 'iPhone 15 Pro', '高性能A17 Proチップ搭載、プログレード撮影カメラ', 150000.00, 50, 'SKU-IP15P-001', TRUE, 4.8),
(1, 'Samsung Galaxy S24', '120Hz有機EL、最新Snapdragon搭載', 140000.00, 30, 'SKU-SGS24-001', TRUE, 4.7),
(1, 'iPad Pro', 'M2チップ、11インチディスプレイ', 130000.00, 20, 'SKU-IPAD-001', FALSE, 4.6),
(2, 'ユニクロ メンズTシャツ', '快適な着心地、多色展開', 2000.00, 200, 'SKU-UNIQ-001', FALSE, 4.3),
(3, 'ニトリ ベッドフレーム', 'シングルサイズ、簡単組み立て', 15000.00, 15, 'SKU-NITORI-001', FALSE, 4.5),
(4, '吾輩は猫である（新装版）', '夏目漱石の古典作品', 1500.00, 100, 'SKU-BOOK-001', FALSE, 4.9);
EOF
```

---

### Step 3: Phase 2 - docker-compose.yml 更新

**理由:**
Phase 2 のマイグレーション・シードファイルをコンテナ初期化時に自動実行

**修正箇所:**

```yaml
db:
  volumes:
    - db_data:/var/lib/mysql
    - ./db/init/00_init.sql:/docker-entrypoint-initdb.d/00_init.sql
    - ./db/migrations/001_create_users.sql:/docker-entrypoint-initdb.d/01_001_create_users.sql
    - ./db/migrations/002_create_product_tables.sql:/docker-entrypoint-initdb.d/02_002_create_product_tables.sql
    - ./db/seeds/001_users.sql:/docker-entrypoint-initdb.d/03_001_users.sql
    - ./db/seeds/002_product_categories.sql:/docker-entrypoint-initdb.d/04_002_product_categories.sql
    - ./db/seeds/003_products.sql:/docker-entrypoint-initdb.d/05_003_products.sql
```

---

### Step 4: Phase 3 - docker-compose.yml 拡張

**修正箇所：**

上記の db.volumes に以下を追加：

```yaml
    - ./db/migrations/003_create_orders_reviews.sql:/docker-entrypoint-initdb.d/03_003_create_orders_reviews.sql
    - ./db/seeds/004_orders.sql:/docker-entrypoint-initdb.d/06_004_orders.sql
    - ./db/seeds/005_order_items.sql:/docker-entrypoint-initdb.d/07_005_order_items.sql
    - ./db/seeds/006_reviews.sql:/docker-entrypoint-initdb.d/08_006_reviews.sql
```

**実行順序：**
- 00_: init SQL
- 01_: Migration 001 (Phase 1)
- 02_: Migration 002 (Phase 2)
- 03_: Migration 003 (Phase 3)
- 04-08_: Seed data (1-6)

---

### Step 5: コンテナ再起動（全テーブル初期化）

```bash
# ボリュームを削除して完全リセット
docker compose down --volumes

# コンテナを起動（自動的にマイグレーション・シードが実行される）
docker compose up -d

# ログで初期化状況を確認
docker compose logs db | grep -E "CREATE TABLE|product|order|review|COMMIT"
```

---

### Step 6: DBに接続して全テーブル確認

```bash
# MySQL接続
mysql -h 127.0.0.1 -u app -p"app_password" app_db

# テーブル一覧
SHOW TABLES;

# 各テーブルのデータ件数確認
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as categories_count FROM product_categories;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as orders_count FROM orders;
SELECT COUNT(*) as order_items_count FROM order_items;
SELECT COUNT(*) as reviews_count FROM reviews;
```

**期待される出力:**

```
Tables_in_app_db
order_items
orders
product_categories
products
reviews
users

users_count: 3
categories_count: 5
products_count: 6
orders_count: 3
order_items_count: 7
reviews_count: 6
```

---

### Step 7: データ整合性確認

**注文と製品の整合性:**

```bash
mysql -h 127.0.0.1 -u app -p"app_password" app_db -e "
SELECT 
  o.id as order_id,
  o.user_id,
  COUNT(oi.id) as item_count,
  SUM(oi.subtotal) as total
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;
"
```

**期待結果:**
```
order_id  user_id  item_count  total
1        1        3           300000.00
2        2        2           155000.00
3        1        2           16500.00
```

---

### Step 8: レビュー集計確認

```bash
mysql -h 127.0.0.1 -u app -p"app_password" app_db -e "
SELECT 
  p.id,
  p.name,
  COUNT(r.id) as review_count,
  ROUND(AVG(r.rating), 2) as avg_rating
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id;
"
```

**期待結果:**
各製品のレビュー数と平均レーティングが表示される

---

## 検証方法

### 外部キー制約確認

```bash
mysql -h 127.0.0.1 -u app -p"app_password" app_db -e "
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;
"
```

**期待結果:**
```
TABLE_NAME    | COLUMN_NAME   | REFERENCED_TABLE | REFERENCED_COLUMN
products      | category_id   | product_categories | id
order_items   | order_id      | orders           | id
order_items   | product_id    | products         | id
orders        | user_id       | users            | id
reviews       | product_id    | products         | id
reviews       | user_id       | users            | id
```

### インデックス確認

```bash
mysql -h 127.0.0.1 -u app -p"app_password" app_db -e "
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_NAME IN ('products', 'product_categories', 'orders', 'reviews')
ORDER BY TABLE_NAME, INDEX_NAME;
"
```

**確認点:**
- `products` に `idx_category_id`, `idx_price`, `idx_is_featured` がある
- `orders` に `idx_user_id`, `idx_status`, `idx_created_at` がある

---

## トラブルシューティング

### 問題 1: "外部キー制約エラー" で INSERT が失敗

**症状:**
```
ERROR 1452: Cannot add or update a child row: a foreign key constraint fails
```

**原因:**
参照先テーブルに存在しないIDを指定した

**解決:**
```bash
# 参照先のID確認
SELECT id FROM product_categories WHERE name = 'エレクトロニクス';

# その ID を使用して INSERT
INSERT INTO products (..., category_id) VALUES (..., 1);
```

---

### 問題 2: "Duplicate entry" エラー

**症状:**
```
ERROR 1062: Duplicate entry 'iPhone 15 Pro' for key 'name'
```

**原因:**
UNIQUE制約のあるカラムに重複した値を挿入した

**解決:**
```bash
# 既存データ確認
SELECT * FROM products WHERE name = 'iPhone 15 Pro';

# 別の名前で挿入
INSERT INTO products (name, ...) VALUES ('iPhone 15 Pro Max', ...);
```

---

### 問題 3: テーブルが見つからない

**症状:**
```
ERROR 1146: Table 'app_db.products' doesn't exist
```

**原因:**
マイグレーションファイルが実行されていない

**解決:**
```bash
# ボリュー削除してリセット
docker compose down --volumes
docker compose up -d

# ログ確認
docker compose logs db | tail -50
```

---

## 外部キー制約の一覧

| 子テーブル | カラム | 親テーブル | 親カラム | DELETE アクション |
|-----------|--------|-----------|--------|------------------|
| `products` | `category_id` | `product_categories` | `id` | RESTRICT |
| `orders` | `user_id` | `users` | `id` | CASCADE |
| `order_items` | `order_id` | `orders` | `id` | CASCADE |
| `order_items` | `product_id` | `products` | `id` | RESTRICT |
| `reviews` | `product_id` | `products` | `id` | CASCADE |
| `reviews` | `user_id` | `users` | `id` | CASCADE |

**DELETE アクションの意味:**
- `CASCADE`: 親レコード削除時、関連する子レコードも自動削除
- `RESTRICT`: 親レコードに関連する子レコードがあれば削除を拒否

---

## 次のステップ

✅ **Database 実装完了** - Phase 1-3 全テーブル作成完了

💡 **Backend API 開発**
- [BACKEND_APP_DEVELOPMENT.md](BACKEND_APP_DEVELOPMENT.md) を参照
- Phase 2: 製品・カテゴリーAPI実装
- Phase 3: 注文・レビューAPI実装

💡 **Frontend 開発**
- [FRONTEND_APP_DEVELOPMENT.md](FRONTEND_APP_DEVELOPMENT.md) を参照
- Phase 2: 製品リスト・詳細ページ実装
- Phase 3: 注文・レビュー機能実装

---

## 関連ドキュメント

このドキュメンドは以下と連携しています：

| ドキュメント | 内容 | 関連フェーズ |
|-----------|------|----------|
| [BACKEND_APP_DEVELOPMENT.md](BACKEND_APP_DEVELOPMENT.md) | API実装ガイド | Phase 2-3 |
| [FRONTEND_APP_DEVELOPMENT.md](FRONTEND_APP_DEVELOPMENT.md) | UI実装ガイド | Phase 2-3 |
| [db/ER_DIAGRAM.md](db/ER_DIAGRAM.md) | ER図（Mermaid） | Phase 1-3 |
| [db/README.md](db/README.md) | DB設計の基本方針 | Phase 1-3 |

---

## 参考資料

テーブル関係や外部キーについて詳しく知りたい場合：
- [ER_DIAGRAM.md](db/ER_DIAGRAM.md) - Mermaid形式のER図
- [db/README.md](db/README.md) - DB設計の基本方針
