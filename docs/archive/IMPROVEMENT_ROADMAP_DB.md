# データベース改善手順書

## 📋 目次
1. [現状分析](#現状分析)
2. [改善項目概要](#改善項目概要)
3. [改善手順](#改善手順)
   - [手順1: product_viewsテーブルの作成](#手順1-product_viewsテーブルの作成)
   - [手順2: インデックスの最適化](#手順2-インデックスの最適化)
   - [手順3: FULLTEXT検索の確認と調整](#手順3-fulltext検索の確認と調整)
   - [手順4: テストデータの投入](#手順4-テストデータの投入)
4. [テスト方法](#テスト方法)
5. [学習ポイント](#学習ポイント)

---

## 現状分析

### 現在のデータベース構成

```
restapi_db (データベース)
├── users                    # ユーザーテーブル
├── product_categories       # 製品カテゴリー
├── products                 # 製品
│   └── INDEX: FULLTEXT(name, description)
├── orders                   # 注文
├── order_items              # 注文明細
└── reviews                  # レビュー
```

### 現在の問題点

#### 1. **製品閲覧数のトラッキング機能がない**

現状:
- 製品がどれだけ閲覧されているか記録されていない
- 人気製品のランキングが作れない
- ユーザーの興味・関心が分析できない

必要なもの:
- `product_views`テーブル: 製品の閲覧履歴を記録
- インデックス: 集計クエリの高速化

---

#### 2. **FULLTEXTインデックスの設定が不明**

現在の`products`テーブル:
```sql
FULLTEXT INDEX idx_fulltext_search (name, description)
```

確認が必要な点:
- **ft_min_word_len**: 最小単語長（デフォルト4文字）
- **ngram**: 日本語検索のための設定（未設定の可能性）
- **インデックスの再構築**: データ追加後にインデックス更新が必要

---

#### 3. **インデックスの最適化余地**

現在のインデックス:
- `products.category_id` ✅
- `products.price` ✅
- `products.is_featured` ✅
- `products.rating` ❓ (インデックスなし)
- `products.created_at` ❓ (インデックスなし)

追加で必要なインデックス:
- `rating`と`created_at`にインデックス（ソート高速化）

---

## 改善項目概要

| 改善項目 | 目的 | 優先度 |
|---------|------|--------|
| product_viewsテーブル作成 | 閲覧数トラッキング | 高 |
| インデックス最適化 | クエリ高速化 | 中 |
| FULLTEXT検索確認 | 日本語検索改善 | 中 |
| テストデータ投入 | 動作確認 | 低 |

---

## 改善手順

### 手順1: product_viewsテーブルの作成

#### 📘 解説

**product_viewsテーブル**は、製品がいつ、誰に、何回閲覧されたかを記録するテーブルです。

**設計方針:**
- **1閲覧 = 1レコード**: 閲覧のたびにレコードを追加
- **user_id**: ログインユーザーの場合のみ記録（未ログインはnull）
- **ip_address**: 重複閲覧の判定に使用（オプション）
- **viewed_at**: 閲覧日時（集計期間の絞り込みに使用）

**メリット:**
- 時系列分析が可能（1週間前、1ヶ月前など）
- ユーザーごとの閲覧履歴が取得可能
- リアルタイムでランキング更新

**デメリット:**
- レコード数が増大（定期的な削除処理が必要）

---

#### 1.1 マイグレーションファイルの作成

**ファイルパス:** `db/migrations/005_create_product_views.sql`（新規作成）

```sql
-- 製品閲覧履歴テーブルの作成
-- 目的: 製品の閲覧数をトラッキングし、人気製品のランキング表示に利用
-- 作成日: 2026-02-25

SET NAMES utf8mb4;

BEGIN;

CREATE TABLE IF NOT EXISTS product_views (
    -- 主キー
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- 製品ID（外部キー）
    product_id BIGINT UNSIGNED NOT NULL,
    
    -- ユーザーID（ログインユーザーの場合のみ記録、未ログインはnull）
    user_id BIGINT UNSIGNED DEFAULT NULL,
    
    -- IPアドレス（重複閲覧の判定に使用、オプション）
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IPv4:15文字、IPv6:45文字',
    
    -- 閲覧日時
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- インデックス
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_viewed_at (viewed_at),
    INDEX idx_product_viewed (product_id, viewed_at) COMMENT '集計クエリの高速化'
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='製品閲覧履歴テーブル';

COMMIT;
```

**解説:**

1. **カラム設計:**
   - `id`: 主キー（自動採番）
   - `product_id`: どの製品が閲覧されたか
   - `user_id`: 誰が閲覧したか（未ログインはnull）
   - `ip_address`: IPアドレス（同一IPからの連続閲覧を判定可能）
   - `viewed_at`: いつ閲覧されたか

2. **外部キー制約:**
   - `product_id → products.id`: 製品削除時に閲覧履歴も削除（CASCADE）
   - `user_id → users.id`: ユーザー削除時に`user_id`をnullに（SET NULL）

3. **インデックス:**
   - `idx_product_id`: 特定製品の閲覧数集計
   - `idx_user_id`: 特定ユーザーの閲覧履歴取得
   - `idx_viewed_at`: 期間絞り込み（過去30日間など）
   - `idx_product_viewed`: **複合インデックス**（product_id + viewed_at）
     - `COUNT(*)` + `WHERE viewed_at >= ...`のクエリを高速化

4. **データ型の選択:**
   - `ip_address VARCHAR(45)`: IPv6対応（IPv6は最大45文字）
   - `viewed_at TIMESTAMP`: タイムゾーン対応

---

#### 1.2 マイグレーションの実行

**ターミナルで実行:**

```bash
# dbディレクトリに移動
cd /Users/haytakeda/Sites/RESTAPI/db

# MySQLにログイン（環境に合わせて変更）
mysql -u root -p restapi_db

# マイグレーション実行
mysql> source migrations/005_create_product_views.sql;

# テーブル作成確認
mysql> SHOW TABLES;
mysql> DESCRIBE product_views;

# 終了
mysql> exit;
```

**解説:**
- `source`コマンドでSQLファイルを実行
- `DESCRIBE`でテーブル構造を確認

---

### 手順2: インデックスの最適化

#### 📘 解説

**インデックス**は、データベースの検索速度を向上させるための仕組みです。

**インデックスが必要な場合:**
1. **WHERE句**: `WHERE rating > 4.0`
2. **ORDER BY句**: `ORDER BY created_at DESC`
3. **JOIN条件**: `JOIN ... ON p.category_id = c.id`

**注意点:**
- インデックスは検索を高速化するが、**書き込み（INSERT/UPDATE）を遅くする**
- 全てのカラムにインデックスを張るのはNG（ストレージ増加）

---

#### 2.1 productsテーブルのインデックス追加

**ファイルパス:** `db/migrations/006_optimize_indexes.sql`（新規作成）

```sql
-- インデックス最適化
-- 目的: ソートクエリ（rating, created_at）の高速化
-- 作成日: 2026-02-25

SET NAMES utf8mb4;

BEGIN;

-- ratingカラムにインデックス追加（評価順ソート用）
ALTER TABLE products
  ADD INDEX idx_rating (rating)
  COMMENT '評価順ソートの高速化';

-- created_atカラムのインデックス確認（既存の場合はスキップ）
-- 既存のINDEXを確認
SELECT INDEX_NAME 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'restapi_db' 
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'created_at';

-- 既存のINDEXがない場合のみ追加
-- （↓手動で既存インデックスを確認してから実行）
-- ALTER TABLE products
--   ADD INDEX idx_created_at (created_at)
--   COMMENT '日付順ソートの高速化';

COMMIT;
```

**解説:**
- **`idx_rating`**: `ORDER BY rating DESC`を高速化
- **`idx_created_at`**: すでに存在する可能性があるため、まず確認
- **COMMENT**: インデックスの目的を記録（保守性向上）

---

#### 2.2 マイグレーションの実行

```bash
cd /Users/haytakeda/Sites/RESTAPI/db
mysql -u root -p restapi_db

# インデックス追加
mysql> source migrations/006_optimize_indexes.sql;

# インデックス確認
mysql> SHOW INDEX FROM products;

mysql> exit;
```

**確認ポイント:**
- `idx_rating`が追加されているか
- `idx_created_at`の有無を確認（既存の場合はスキップ）

---

### 手順3: FULLTEXT検索の確認と調整

#### 📘 解説

**FULLTEXT検索**は、テキスト検索に特化したインデックスです。

**MySQLのFULLTEXT検索の問題点（日本語）:**
1. **デフォルトは英語向け**: 単語の区切りがスペース
2. **最小単語長**: `ft_min_word_len`（デフォルト4文字）
3. **ngram未使用**: 日本語は形態素解析が必要

**改善策:**
1. **ngramパーサーの使用**: 文字単位で分割（2-gram, 3-gramなど）
2. **ft_min_word_lenの変更**: 1〜2文字に変更

---

#### 3.1 現在のFULLTEXT設定確認

**ターミナルで実行:**

```bash
mysql -u root -p restapi_db

# FULLTEXT設定確認
mysql> SHOW VARIABLES LIKE 'ft_min_word_len';
mysql> SHOW VARIABLES LIKE 'ngram_token_size';

# productsテーブルのFULLTEXTインデックス確認
mysql> SHOW INDEX FROM products WHERE Index_type = 'FULLTEXT';
```

**期待される結果:**
```
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| ft_min_word_len | 4     |  ← 日本語には大きすぎる
+-----------------+-------+

+----------+------------+---------------------+
| Table    | Key_name   | Column_name         |
+----------+------------+---------------------+
| products | idx_fulltext_search | name        |
| products | idx_fulltext_search | description |
+----------+------------+---------------------+
```

---

#### 3.2 ngramパーサーの適用（推奨）

**ファイルパス:** `db/migrations/007_improve_fulltext_search.sql`（新規作成）

```sql
-- FULLTEXT検索の改善（ngram適用）
-- 目的: 日本語検索の精度向上
-- 作成日: 2026-02-25

SET NAMES utf8mb4;

BEGIN;

-- 既存のFULLTEXTインデックスを削除
ALTER TABLE products
  DROP INDEX idx_fulltext_search;

-- ngramパーサーを使用したFULLTEXTインデックスを再作成
-- ngram_token_size=2 → 2文字ずつ分割（bigram）
ALTER TABLE products
  ADD FULLTEXT INDEX idx_fulltext_search_ngram (name, description)
  WITH PARSER ngram;

COMMIT;
```

**解説:**
- **ngramパーサー**: 文字列を2文字（bigram）ずつ分割してインデックス化
  - 例: "ノートパソコン" → "ノー", "ート", "トパ", "パソ", "ソコ", "コン"
  - メリット: 短い単語でも検索可能
  - デメリット: インデックスサイズが増大

**注意:**
- MySQL 5.7.6以降でngramパーサーが利用可能
- `ngram_token_size`はサーバー設定で変更可能（デフォルト2）

---

#### 3.3 マイグレーションの実行

```bash
cd /Users/haytakeda/Sites/RESTAPI/db
mysql -u root -p restapi_db

# FULLTEXT改善
mysql> source migrations/007_improve_fulltext_search.sql;

# インデックス再構築確認
mysql> SHOW INDEX FROM products WHERE Key_name LIKE '%fulltext%';

# 検索テスト
mysql> SELECT id, name FROM products 
       WHERE MATCH(name, description) AGAINST('ノート' IN BOOLEAN MODE);

mysql> exit;
```

**期待される結果:**
- "ノート"という2文字でも検索がヒットするようになる

---

### 手順4: テストデータの投入

#### 📘 解説

開発環境で`product_views`の動作確認をするため、テストデータを投入します。

---

#### 4.1 テストデータの作成

**ファイルパス:** `db/seeds/008_product_views_test.sql`（新規作成）

```sql
-- product_viewsテストデータ
-- 目的: 人気製品ランキングの動作確認
-- 作成日: 2026-02-25

SET NAMES utf8mb4;

BEGIN;

-- 製品ID=1を10回閲覧（過去30日以内）
INSERT INTO product_views (product_id, user_id, ip_address, viewed_at) VALUES
  (1, 1, '192.168.1.100', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (1, 2, '192.168.1.101', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (1, 3, '192.168.1.102', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (1, NULL, '192.168.1.103', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (1, NULL, '192.168.1.104', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (1, 4, '192.168.1.105', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (1, 5, '192.168.1.106', DATE_SUB(NOW(), INTERVAL 15 DAY)),
  (1, NULL, '192.168.1.107', DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (1, 6, '192.168.1.108', DATE_SUB(NOW(), INTERVAL 25 DAY)),
  (1, NULL, '192.168.1.109', DATE_SUB(NOW(), INTERVAL 28 DAY));

-- 製品ID=2を7回閲覧
INSERT INTO product_views (product_id, user_id, ip_address, viewed_at) VALUES
  (2, 1, '192.168.1.100', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (2, 2, '192.168.1.101', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (2, NULL, '192.168.1.102', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (2, 3, '192.168.1.103', DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (2, NULL, '192.168.1.104', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (2, 4, '192.168.1.105', DATE_SUB(NOW(), INTERVAL 18 DAY)),
  (2, NULL, '192.168.1.106', DATE_SUB(NOW(), INTERVAL 22 DAY));

-- 製品ID=3を5回閲覧
INSERT INTO product_views (product_id, user_id, ip_address, viewed_at) VALUES
  (3, 1, '192.168.1.100', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (3, NULL, '192.168.1.101', DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (3, 2, '192.168.1.102', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (3, NULL, '192.168.1.103', DATE_SUB(NOW(), INTERVAL 16 DAY)),
  (3, 3, '192.168.1.104', DATE_SUB(NOW(), INTERVAL 24 DAY));

-- 製品ID=4を3回閲覧
INSERT INTO product_views (product_id, user_id, ip_address, viewed_at) VALUES
  (4, 1, '192.168.1.100', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (4, NULL, '192.168.1.101', DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (4, 2, '192.168.1.102', DATE_SUB(NOW(), INTERVAL 20 DAY));

-- 製品ID=5を2回閲覧
INSERT INTO product_views (product_id, user_id, ip_address, viewed_at) VALUES
  (5, NULL, '192.168.1.100', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (5, 1, '192.168.1.101', DATE_SUB(NOW(), INTERVAL 14 DAY));

-- 古いデータ（31日以上前）も少し追加（集計対象外）
INSERT INTO product_views (product_id, user_id, ip_address, viewed_at) VALUES
  (1, 1, '192.168.1.100', DATE_SUB(NOW(), INTERVAL 35 DAY)),
  (2, 2, '192.168.1.101', DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (3, 3, '192.168.1.102', DATE_SUB(NOW(), INTERVAL 50 DAY));

COMMIT;

-- 集計結果確認クエリ
SELECT 
  p.id,
  p.name,
  COUNT(pv.id) as view_count_30days
FROM products p
LEFT JOIN product_views pv ON p.id = pv.product_id
  AND pv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY p.id
ORDER BY view_count_30days DESC
LIMIT 10;
```

**解説:**
- **`DATE_SUB(NOW(), INTERVAL N DAY)`**: N日前の日時を生成
- **user_id = NULL**: 未ログインユーザーの閲覧
- **古いデータ**: 31日以上前のデータも追加（集計から除外されることを確認）

---

#### 4.2 テストデータの投入

```bash
cd /Users/haytakeda/Sites/RESTAPI/db
mysql -u root -p restapi_db

# テストデータ投入
mysql> source seeds/008_product_views_test.sql;

# 集計確認（上記クエリが自動実行される）
# 期待される結果:
# - 製品ID=1: 10回
# - 製品ID=2: 7回
# - 製品ID=3: 5回
# - ...

mysql> exit;
```

---

## テスト方法

### 1. product_viewsテーブルの動作確認

```bash
mysql -u root -p restapi_db

# テーブル存在確認
mysql> SHOW TABLES LIKE 'product_views';

# データ件数確認
mysql> SELECT COUNT(*) FROM product_views;

# 過去30日の閲覧数ランキング
mysql> SELECT 
         p.id, p.name, COUNT(pv.id) as views
       FROM products p
       LEFT JOIN product_views pv ON p.id = pv.product_id
         AND pv.viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY p.id
       ORDER BY views DESC
       LIMIT 5;
```

**期待される結果:**
```
+----+------------------+-------+
| id | name             | views |
+----+------------------+-------+
|  1 | ノートパソコン   |    10 |
|  2 | マウス           |     7 |
|  3 | キーボード       |     5 |
|  4 | モニター         |     3 |
|  5 | ヘッドホン       |     2 |
+----+------------------+-------+
```

---

### 2. インデックスの効果確認

```bash
mysql -u root -p restapi_db

# EXPLAINで実行計画確認（インデックス使用の有無）
mysql> EXPLAIN SELECT * FROM products ORDER BY rating DESC LIMIT 10;

# 期待: 'Using index'が表示される（idx_ratingを使用）

mysql> EXPLAIN SELECT * FROM products 
       WHERE MATCH(name, description) AGAINST('ノートパソコン' IN BOOLEAN MODE);

# 期待: 'fulltext'が表示される（FULLTEXTインデックスを使用）
```

---

### 3. FULLTEXT検索の動作確認

```bash
mysql -u root -p restapi_db

# 2文字検索（ngram適用後）
mysql> SELECT id, name FROM products 
       WHERE MATCH(name, description) AGAINST('ノート' IN BOOLEAN MODE);

# 期待: "ノートパソコン"などがヒット

# 複数キーワード（OR検索）
mysql> SELECT id, name FROM products 
       WHERE MATCH(name, description) AGAINST('ノート 軽量' IN BOOLEAN MODE);

# 期待: "ノート"OR"軽量"を含む製品
```

---

## 学習ポイント

### 1. トラッキングテーブルの設計パターン
- **1イベント = 1レコード**: ログのように記録
- **外部キー + CASCADE/SET NULL**: 関連データ削除時の挙動を制御
- **複合インデックス**: 集計クエリの高速化（product_id + viewed_at）

### 2. MySQLのインデックス種類
- **PRIMARY KEY**: 主キー（自動でユニークインデックス）
- **INDEX (KEY)**: 通常のインデックス
- **UNIQUE INDEX**: 重複を許さないインデックス
- **FULLTEXT INDEX**: テキスト検索専用

### 3. FULLTEXT検索の仕組み
- **NATURAL LANGUAGE MODE**: 自然言語検索（デフォルト）
- **BOOLEAN MODE**: 演算子使用可能（+, -, *, ""など）
- **ngramパーサー**: 日本語検索向け（文字単位で分割）

### 4. 集計クエリの最適化
```sql
-- 遅い（インデックス未使用）
SELECT product_id, COUNT(*) FROM product_views GROUP BY product_id;

-- 速い（複合インデックス使用）
SELECT product_id, COUNT(*) FROM product_views 
WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY product_id;
-- idx_product_viewed (product_id, viewed_at)を使用
```

### 5. マイグレーション管理のベストプラクティス
- **連番ファイル名**: `001_`, `002_`, ... で実行順を明確に
- **ロールバック用SQL**: 本番環境では逆操作のSQLも用意
- **コメント記載**: 目的・作成日・影響範囲を記録

---

## 次のステップ

データベースの改善が完了したら、以下の順で実装を進めてください:

1. **データベース手順書（本書）**: ✅ 完了
2. **バックエンド手順書**: `IMPROVEMENT_ROADMAP_BACKEND.md`
3. **フロントエンド手順書**: `IMPROVEMENT_ROADMAP_FRONTEND.md`

**推奨実装順序:**
```
DB → Backend → Frontend
```

理由: データベースが基盤 → APIが中間層 → UIが最上層

---

## トラブルシューティング

### Q1. マイグレーション実行で外部キーエラー
```
ERROR 1452: Cannot add or update a child row: a foreign key constraint fails
```

**原因:** 参照先のテーブルが存在しないか、データが不整合

**解決策:**
```sql
-- 外部キー確認
SHOW CREATE TABLE product_views;

-- 参照先テーブル確認
SELECT * FROM products LIMIT 1;
SELECT * FROM users LIMIT 1;
```

---

### Q2. FULLTEXT検索で結果が0件
```sql
SELECT * FROM products 
WHERE MATCH(name, description) AGAINST('ノート' IN BOOLEAN MODE);
-- Empty set
```

**原因:** 
1. ngramパーサー未適用
2. `ft_min_word_len`が大きすぎる

**解決策:**
```sql
-- 現在の設定確認
SHOW VARIABLES LIKE 'ft_min_word_len';

-- ngramインデックス確認
SHOW INDEX FROM products WHERE Key_name = 'idx_fulltext_search_ngram';

-- インデックス再構築
ALTER TABLE products DROP INDEX idx_fulltext_search;
ALTER TABLE products ADD FULLTEXT INDEX idx_fulltext_search_ngram (name, description) WITH PARSER ngram;
```

---

### Q3. 集計クエリが遅い
```sql
-- 実行計画確認
EXPLAIN SELECT product_id, COUNT(*) FROM product_views 
WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY product_id;
```

**期待される結果:**
```
+----+-------------+---------------+-------+-------------------+
| id | select_type | table         | type  | key               |
+----+-------------+---------------+-------+-------------------+
|  1 | SIMPLE      | product_views | range | idx_product_viewed|
+----+-------------+---------------+-------+-------------------+
```

**インデックスが使われていない場合:**
```sql
-- 複合インデックス確認
SHOW INDEX FROM product_views WHERE Key_name = 'idx_product_viewed';

-- なければ追加
ALTER TABLE product_views 
  ADD INDEX idx_product_viewed (product_id, viewed_at);
```

---

### Q4. テストデータ投入でエラー
```
ERROR 1452: Cannot add or update a child row
```

**原因:** `user_id`や`product_id`が存在しない

**解決策:**
```sql
-- 既存のユーザーID確認
SELECT id FROM users LIMIT 10;

-- 既存の製品ID確認
SELECT id FROM products LIMIT 10;

-- seeds/008_product_views_test.sqlのIDを既存のものに変更
```

---

## 定期メンテナンス

### 古い閲覧履歴の削除

**ファイルパス:** `db/scripts/cleanup_old_views.sql`（新規作成）

```sql
-- 90日以上前の閲覧履歴を削除
-- 目的: product_viewsテーブルのサイズ抑制
-- 実行頻度: 月1回

DELETE FROM product_views 
WHERE viewed_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 削除件数確認
SELECT ROW_COUNT() as deleted_rows;
```

**cronjobでの定期実行（オプション）:**
```bash
# 毎月1日 午前3時に実行
0 3 1 * * mysql -u root -p'password' restapi_db < /path/to/cleanup_old_views.sql
```

---

## パフォーマンス監視

### 1. テーブルサイズ確認

```sql
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES 
WHERE table_schema = 'restapi_db'
ORDER BY size_mb DESC;
```

---

### 2. スロークエリログの有効化

**my.cnfに追加:**
```ini
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 1
```

**ログ確認:**
```bash
tail -f /var/log/mysql/slow-query.log
```

---

**作成日:** 2026年2月25日  
**対象バージョン:** MySQL 8.0  
**作成者:** 世界トップレベルエンジニア 🚀
