SET NAMES utf8mb4;

INSERT INTO
    products (
        category_id,
        name,
        description,
        price,
        stock,
        sku,
        is_featured,
        rating
    )
VALUES
    (
        1,
        'iPhone 15 Pro',
        '高性能A17 Proチップ搭載、プログレード撮影カメラ',
        150000.00,
        50,
        'SKU-IP15P-001',
        TRUE,
        4.8
    ),
    (
        1,
        'Samsung Galaxy S24',
        '120Hz有機EL、最新Snapdragon搭載',
        140000.00,
        30,
        'SKU-SGS24-001',
        TRUE,
        4.7
    ),
    (
        1,
        'iPad Pro',
        'M2チップ、11インチディスプレイ',
        130000.00,
        20,
        'SKU-IPAD-001',
        FALSE,
        4.6
    ),
    (
        2,
        'ユニクロ メンズTシャツ',
        '快適な着心地、多色展開',
        2000.00,
        200,
        'SKU-UNIQ-001',
        FALSE,
        4.3
    ),
    (
        3,
        'ニトリ ベッドフレーム',
        'シングルサイズ、簡単組み立て',
        15000.00,
        15,
        'SKU-NITORI-001',
        FALSE,
        4.5
    ),
    (
        4,
        '吾輩は猫である（新装版）',
        '夏目漱石の古典作品',
        1500.00,
        100,
        'SKU-BOOK-001',
        FALSE,
        4.9
    );