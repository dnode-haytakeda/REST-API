-- 製品閲覧履歴テーブルの作成
-- 目的: 製品の閲覧数をトラッキングし、人気製品のランキング表示に利用
-- 作成日: 2026-02-25
SET
    NAMES utf8mb4;

BEGIN;

CREATE TABLE
    IF NOT EXISTS product_views (
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
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        -- インデックス
        INDEX idx_product_id (product_id),
        INDEX idx_user_id (user_id),
        INDEX idx_viewed_at (viewed_at),
        INDEX idx_product_viewed (product_id, viewed_at) COMMENT '集計クエリの高速化'
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '製品閲覧履歴テーブル';

COMMIT;