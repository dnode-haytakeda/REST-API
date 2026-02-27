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
GROUP BY p.id, p.name
ORDER BY view_count_30days DESC
LIMIT 10;