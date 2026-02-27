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
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'products' 
  AND COLUMN_NAME = 'created_at';

-- 既存のINDEXがない場合のみ追加
-- （↓手動で既存インデックスを確認してから実行）
ALTER TABLE products
  ADD INDEX idx_created_at (created_at)
  COMMENT '日付順ソートの高速化';

COMMIT;