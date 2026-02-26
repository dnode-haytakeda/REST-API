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