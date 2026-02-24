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