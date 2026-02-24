SET NAMES utf8mb4;

INSERT INTO
    orders (
        user_id,
        total_amount,
        status,
        shipping_address,
        notes,
        created_at
    )
VALUES
    (
        1,
        300000.00,
        'delivered',
        '東京都渋谷区道玄坂1-2-3',
        'ギフト包装希望',
        '2026-02-10 10:00:00'
    ),
    (
        2,
        155000.00,
        'shipped',
        '大阪府大阪市北区中之島1-1-1',
        '',
        '2026-02-15 14:30:00'
    ),
    (
        1,
        17000.00,
        'processing',
        '東京都渋谷区道玄坂1-2-3',
        '配達時間帯：16時-18時',
        '2026-02-16 09:15:00'
    );