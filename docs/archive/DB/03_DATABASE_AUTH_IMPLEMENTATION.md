# 認証システム実装ガイド【データベース編】

> **目的:** エンドユーザーと管理者を区別し、安全にログイン情報を管理するためのデータベース設計

---

## 📋 目次

1. [現状分析](#現状分析)
2. [設計方針](#設計方針)
3. [マイグレーション実装](#マイグレーション実装)
4. [シードデータ](#シードデータ)
5. [実行手順](#実行手順)
6. [確認方法](#確認方法)

---

## 現状分析

### 現在のusersテーブル構造

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 問題点

❌ **パスワードが保存できない** → ログイン機能が実装不可能  
❌ **ユーザーの役割（role）が不明** → 管理者とエンドユーザーの区別ができない  
❌ **アカウント状態管理がない** → 無効化されたユーザーを制御できない  

---

## 設計方針

### 追加が必要なカラム

| カラム名 | 型 | 説明 | デフォルト値 | 理由 |
|---------|-----|------|------------|------|
| `password` | `VARCHAR(255)` | ハッシュ化されたパスワード | なし | ログイン認証に必須 |
| `role` | `ENUM('user', 'admin')` | ユーザーの役割 | `'user'` | 管理者と一般ユーザーを区別 |
| `is_active` | `BOOLEAN` | アカウント有効状態 | `TRUE` | 管理者がユーザーを無効化可能に |
| `last_login_at` | `TIMESTAMP` | 最終ログイン日時 | `NULL` | セキュリティ監視・分析用 |
| `updated_at` | `TIMESTAMP` | 更新日時 | 現在時刻 | データ変更追跡 |

### セキュリティ設計

1. **パスワードは平文保存禁止**
   - bcrypt（コスト10）でハッシュ化
   - バックエンドでハッシュ化後にDBに保存
   - 例: `password123` → `$2b$10$...（60文字）`

2. **role による権限分離**
   - `user`: エンドユーザー（製品閲覧・注文）
   - `admin`: 管理者（ユーザー管理・全機能）

3. **is_active によるアカウント制御**
   - `TRUE`: ログイン可能
   - `FALSE`: ログイン拒否（退会・凍結）

---

## マイグレーション実装

### 📁 ファイル: `db/migrations/004_add_auth_to_users.sql`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/db/migrations/004_add_auth_to_users.sql`

**役割:** 既存のusersテーブルに認証関連カラムを追加する

```sql
-- 認証システム用のカラム追加マイグレーション
-- 実行順序: 001, 002, 003 の後に実行

SET NAMES utf8mb4;

BEGIN;

-- パスワードカラム追加（後方互換性のため、最初はNULL許可）
ALTER TABLE users
ADD COLUMN password VARCHAR(255) DEFAULT NULL COMMENT 'bcryptでハッシュ化されたパスワード' AFTER email;

-- 役割カラム追加（デフォルトは一般ユーザー）
ALTER TABLE users
ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' COMMENT 'ユーザーの役割' AFTER password;

-- アカウント有効状態
ALTER TABLE users
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'アカウント有効フラグ' AFTER role;

-- 最終ログイン日時
ALTER TABLE users
ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL COMMENT '最終ログイン日時' AFTER is_active;

-- 更新日時
ALTER TABLE users
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'レコード更新日時' AFTER last_login_at;

-- インデックス追加（ログイン時のクエリ最適化）
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

COMMIT;
```

### なぜこう書くのか？

#### 1. `ALTER TABLE` を使用する理由
```sql
ALTER TABLE users ADD COLUMN password ...
```
- **既存データを保持しながら** カラムを追加
- `DROP TABLE` → `CREATE TABLE` だと既存ユーザーデータが全て消える
- 後方互換性を保つため

#### 2. `password VARCHAR(255)` の理由
- bcryptのハッシュは60文字だが、将来的なアルゴリズム変更に対応
- 255文字あれば十分な余裕

#### 3. `ENUM('user', 'admin')` の理由
```sql
role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
```
- **データ型レベルで制約** → 不正な値の挿入を防ぐ
- `VARCHAR` だと `'super_admin'` などのミスが起きる可能性
- デフォルト `'user'` で新規登録ユーザーは自動的に一般ユーザーに

#### 4. インデックスを追加する理由
```sql
CREATE INDEX idx_users_email ON users(email);
```
- ログイン時に `WHERE email = ?` のクエリが頻繁に実行される
- インデックスがないと全テーブルスキャンで遅い
- **10万ユーザーでも高速ログイン** を実現

---

## シードデータ

### 📁 ファイル: `db/seeds/007_auth_users.sql`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/db/seeds/007_auth_users.sql`

**役割:** テスト用の管理者アカウントとエンドユーザーアカウントを作成

```sql
-- 認証システム用のシードデータ
-- テスト用の管理者アカウントとエンドユーザーアカウントを作成

SET NAMES utf8mb4;

BEGIN;

-- 既存ユーザーのパスワードを設定（既存データがある場合）
-- 注意: 実際の運用では、ユーザーに再設定させる方が安全
UPDATE users 
SET 
    password = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O',  -- 'password123' のハッシュ
    role = 'user',
    is_active = TRUE
WHERE password IS NULL;

-- テスト用管理者アカウント（開発用）
INSERT INTO users (name, email, password, role, is_active, created_at) VALUES
('管理者', 'admin@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O', 'admin', TRUE, NOW()),
('田中太郎（管理者）', 'admin.tanaka@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O', 'admin', TRUE, NOW())
ON DUPLICATE KEY UPDATE 
    password = VALUES(password),
    role = VALUES(role);

-- テスト用エンドユーザーアカウント（開発用）
INSERT INTO users (name, email, password, role, is_active, created_at) VALUES
('山田花子', 'hanako@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O', 'user', TRUE, NOW()),
('佐藤次郎', 'jiro@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O', 'user', TRUE, NOW()),
('鈴木三郎', 'saburo@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O', 'user', FALSE, NOW())  -- 無効化されたユーザー
ON DUPLICATE KEY UPDATE 
    password = VALUES(password),
    role = VALUES(role),
    is_active = VALUES(is_active);

COMMIT;

-- =====================================================
-- テストアカウント情報
-- =====================================================
-- 【管理者】
--   Email: admin@example.com
--   Password: password123
--   Role: admin
--
-- 【エンドユーザー】
--   Email: hanako@example.com
--   Password: password123
--   Role: user
--
-- 【無効化ユーザー】
--   Email: saburo@example.com
--   Password: password123
--   Role: user
--   is_active: FALSE (ログイン不可)
-- =====================================================
```

### なぜこう書くのか？

#### 1. パスワードハッシュの生成方法

**開発環境で事前にハッシュを生成:**

```bash
# Node.js環境で実行
node -e "console.log(require('bcrypt').hashSync('password123', 10))"
```

出力例:
```
$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZVZ5vX5H0IeZLG.9zAG4O
```

#### 2. `ON DUPLICATE KEY UPDATE` の理由

```sql
ON DUPLICATE KEY UPDATE 
    password = VALUES(password),
    role = VALUES(role);
```

- **冪等性の確保** → 何度実行しても同じ結果
- 既存ユーザーがいても、パスワードとroleを上書き
- `email` が `UNIQUE` なので、重複時は更新される

#### 3. 無効化ユーザーを含める理由

```sql
('鈴木三郎', 'saburo@example.com', ..., 'user', FALSE, NOW())
```

- **テスト用途**: ログイン拒否の挙動を確認
- **実装確認**: `is_active = FALSE` のユーザーを正しく弾けるか

---

## 実行手順

### Step 1: マイグレーション実行

```bash
# プロジェクトルートディレクトリで実行
cd /Users/haytakeda/Sites/RESTAPI

# MySQLにログイン
mysql -u root -p

# データベース選択
USE app_db;

# マイグレーション実行
SOURCE db/migrations/004_add_auth_to_users.sql;
```

### Step 2: シードデータ投入

```bash
# 同じMySQLセッションで続けて実行
SOURCE db/seeds/007_auth_users.sql;
```

### Step 3: 確認

```sql
-- テーブル構造確認
DESCRIBE users;

-- データ確認
SELECT id, name, email, role, is_active, created_at FROM users;
```

**期待される出力:**

```
+---------------+---------------------+------+-----+---------+-----------------------------+
| Field         | Type                | Null | Key | Default | Extra                       |
+---------------+---------------------+------+-----+---------+-----------------------------+
| id            | bigint unsigned     | NO   | PRI | NULL    | auto_increment              |
| name          | varchar(100)        | NO   |     | NULL    |                             |
| email         | varchar(255)        | NO   | UNI | NULL    |                             |
| password      | varchar(255)        | YES  |     | NULL    |                             |
| role          | enum('user','admin')| NO   | MUL | user    |                             |
| is_active     | tinyint(1)          | NO   | MUL | 1       |                             |
| last_login_at | timestamp           | YES  |     | NULL    |                             |
| updated_at    | timestamp           | YES  |     | CURRENT_TIMESTAMP | on update... |
| created_at    | timestamp           | YES  |     | CURRENT_TIMESTAMP |             |
+---------------+---------------------+------+-----+---------+-----------------------------+
```

---

## 確認方法

### 1. テーブル構造の確認

```sql
SHOW CREATE TABLE users\G
```

以下の内容が含まれていることを確認:
- `password VARCHAR(255)`
- `role ENUM('user','admin')`
- `is_active tinyint(1)`
- インデックス `idx_users_email`, `idx_users_role`, `idx_users_is_active`

### 2. テストデータの確認

```sql
-- 管理者アカウント確認
SELECT * FROM users WHERE role = 'admin';

-- エンドユーザー確認
SELECT * FROM users WHERE role = 'user' AND is_active = TRUE;

-- 無効化ユーザー確認
SELECT * FROM users WHERE is_active = FALSE;
```

### 3. パスワードハッシュの確認

```sql
SELECT email, 
       LEFT(password, 10) as password_prefix, 
       LENGTH(password) as password_length 
FROM users 
WHERE password IS NOT NULL;
```

**期待される出力:**

```
+---------------------------+------------------+------------------+
| email                     | password_prefix  | password_length  |
+---------------------------+------------------+------------------+
| admin@example.com         | $2b$10$Eix      | 60               |
| hanako@example.com        | $2b$10$Eix      | 60               |
+---------------------------+------------------+------------------+
```

- `$2b$` から始まる → bcryptハッシュ
- 長さが60文字 → 正しいbcryptハッシュ

---

## トラブルシューティング

### エラー: "Duplicate column name 'password'"

**原因:** 既に `password` カラムが存在する

**解決策:**
```sql
-- カラムの存在確認
SHOW COLUMNS FROM users LIKE 'password';

-- 既に存在する場合はマイグレーションをスキップ
-- または、ALTER TABLE を DROP/ADD に変更
```

### エラー: "Data too long for column 'password'"

**原因:** `VARCHAR` の長さが不足

**解決策:**
```sql
ALTER TABLE users MODIFY COLUMN password VARCHAR(255);
```

### パスワードが `NULL` のまま

**原因:** シードデータが実行されていない

**解決策:**
```bash
SOURCE db/seeds/007_auth_users.sql;
```

---

## 次のステップ

✅ **データベース設計完了**

次は **バックエンド開発編（BACKEND_AUTH_IMPLEMENTATION.md）** へ進んでください。

以下の内容を実装します:
- パスワードハッシュ化（bcrypt）
- ログインAPI（POST /api/auth/login）
- 登録API（POST /api/auth/register）
- JWT認証ミドルウェア
- 保護されたルート

---

## まとめ

### 実装内容

| 項目 | 内容 |
|------|------|
| マイグレーション | `004_add_auth_to_users.sql` |
| シードデータ | `007_auth_users.sql` |
| 追加カラム | `password`, `role`, `is_active`, `last_login_at`, `updated_at` |
| インデックス | `email`, `role`, `is_active` |

### セキュリティ設計

✅ パスワードはbcryptでハッシュ化  
✅ 役割ベースアクセス制御（RBAC）の基盤  
✅ アカウント無効化機能  
✅ ログイン追跡機能  

### テストアカウント

- **管理者**: `admin@example.com` / `password123`
- **エンドユーザー**: `hanako@example.com` / `password123`
- **無効化ユーザー**: `saburo@example.com` / `password123` (ログイン不可)

---

**作成日:** 2026年2月19日  
**バージョン:** 1.0  
**対象:** MySQL 8.0 / REST API Application
