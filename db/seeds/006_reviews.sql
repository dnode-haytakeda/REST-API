INSERT INTO
    reviews (
        product_id,
        user_id,
        rating,
        title,
        comment,
        is_verified_purchase
    )
VALUES
    (
        1,
        1,
        5,
        '素晴らしいスマートフォン',
        'カメラ性能が最高です。毎日使ってます。',
        TRUE
    ),
    (1, 2, 4, 'バッテリー持ちが良い', '価格は高いですが、満足しています。', TRUE),
    (
        2,
        2,
        5,
        '最新スマホの決定版',
        'Snapdragon搭載で動作がスムーズ。',
        TRUE
    ),
    (3, 1, 4, '画面が綺麗', 'iPadとしては十分です。', TRUE),
    (4, 2, 3, 'サイズ感が微妙', 'もう少し大きいと良かった。', FALSE),
    (5, 1, 5, 'コスパ最高', 'ニトリのベッドは信頼できます。', TRUE);