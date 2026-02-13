DB 手順書（SQL で考える基本）
============================

この手順書は DB を「どこに何を書くか」を理解するための最低限の流れです。
ここではツールに依存しない SQL ベースで説明します。

ディレクトリ構成（目的）
------------------------
- schema: テーブル定義（設計の確定版）
- migrations: 変更履歴（差分の蓄積）
- seeds: 初期データ
- init: コンテナ初期化用（必要なら）

手順 1: スキーマ設計
-------------------
理由: まずテーブルの全体像を決めると、API 設計がぶれにくい。

db/schema/001_users.sql
```
CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	created_at TIMESTAMP DEFAULT NOW()
);
```

手順 2: マイグレーション
-----------------------
理由: 変更履歴をファイルで残すと、環境間の差分がなくなる。

db/migrations/001_create_users.sql
```
BEGIN;

CREATE TABLE users (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
```

手順 3: シード
-------------
理由: 開発時の動作確認を早くするため。

db/seeds/001_users.sql
```
INSERT INTO users (name, email) VALUES
	("Alice", "alice@example.com"),
	("Bob", "bob@example.com");
```

手順 4: 初期化スクリプト
----------------------
理由: Docker などで DB を自動初期化するため。

db/init/00_init.sql
```
-- 必要に応じて DB 作成や権限付与を書く
```

次の一歩
--------
- 使用 DB を決める（PostgreSQL/MySQL など）
- マイグレーション管理ツールを決める（例: knex, prisma, sequelize）
- backend の models に SQL/ORM 実装を追加する
