-- データベース文字セット設定（日本語対応）
SET NAMES utf8mb4;
SET COLLATION_CONNECTION = utf8mb4_unicode_ci;

-- MySQL サーバーの文字セット設定
ALTER DATABASE app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;