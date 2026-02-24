SET NAMES utf8mb4;

BEGIN;

-- パスワードカラム追加（後方互換性のため、最初はNULL許可）
ALTER TABLE users
ADD COLUMN password VARCHAR(255) DEFAULT NULL COMMENT 'bcryptでハッシュ化されたパスワード' AFTER email;

-- 役割カラム追加（デフォルトは一般ユーザー）
ALTER TABLE users
ADD COLUMN role ENUM ('user', 'admin') NOT NULL DEFAULT 'user' COMMENT 'ユーザーの役割' AFTER password;

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
CREATE INDEX idx_users_email ON users (email);

CREATE INDEX idx_users_role ON users (role);

CREATE INDEX idx_users_is_active ON users (is_active);

COMMIT;