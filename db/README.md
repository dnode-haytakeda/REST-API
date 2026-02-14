DB 手順書（Docker Hub 公式イメージ + MySQL）
=============================================

この手順書は Docker Hub の公式 MySQL イメージを使って、
DB を立ち上げるためのベストプラクティスをまとめたものです。

ディレクトリ構成（目的）
------------------------
- schema: テーブル定義（設計の確定版）
	- 目的: その時点の「理想形」を人が読みやすく残す
	- 使い方: DB に直接流すよりも、設計の参照用として扱う
- migrations: 変更履歴（差分の蓄積）
	- 目的: いつ、何を、どう変えたかを履歴として残す
	- 使い方: 時系列で適用し、環境間の差分をなくす
- seeds: 初期データ
	- 目的: 開発・検証用の最小データを入れて動作確認をしやすくする
- init: コンテナ初期化用 SQL（初回起動時に自動実行）
	- 目的: コンテナ初回起動時に一度だけ走らせたい処理を書く

手順 1: 環境変数
----------------
理由: DB の接続情報をコードから分離し、安全に管理するため。

コード（db/.env の例）
```
MYSQL_ROOT_PASSWORD=root_password
MYSQL_DATABASE=app_db
MYSQL_USER=app
MYSQL_PASSWORD=app_password
MYSQL_PORT=3306
```

解説
- `.env` は「接続に必要な値だけ」を書く
- 本番では別の値に差し替えるため、コードに直書きしない

手順 2: docker-compose.yml
-------------------------
理由: 起動/停止/永続化を簡単にし、公式イメージをそのまま使うため。

コード（db/docker-compose.yml）
```
services:
	db:
		image: mysql:8.0
		container_name: restapi-db
		env_file:
			- .env
		ports:
			- "${MYSQL_PORT}:3306"
		volumes:
			- db_data:/var/lib/mysql
			- ./init:/docker-entrypoint-initdb.d
		healthcheck:
			test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u ${MYSQL_USER} -p${MYSQL_PASSWORD}"]
			interval: 10s
			timeout: 5s
			retries: 5

volumes:
	db_data:
```

解説
- `image`: Docker Hub の公式 MySQL イメージを使う
- `env_file`: `.env` の値をコンテナに渡す
- `ports`: PC から接続するためのポート公開
- `volumes`: DB データの永続化と `init` SQL の自動実行
- `healthcheck`: 起動が完了したかを判定するためのチェック

手順 3: 初期化 SQL
-----------------
理由: 初回起動時に必ず作りたい DB 設定を自動化するため。

コード（db/init/00_init.sql）
```
-- 例: 初期化時に使うユーザーや権限を付与する場合に書く
-- GRANT ALL PRIVILEGES ON app_db.* TO 'app'@'%';
```

解説
- `init` 配下の SQL は「初回起動時に 1 回だけ」実行される
- ユーザー/権限/初期 DB など、最初に必ず必要な処理を書く

手順 4: スキーマとマイグレーション
----------------------------------
理由: 設計と履歴を分離し、変更を追跡しやすくするため。

コード（db/schema/001_users.sql）
```
CREATE TABLE users (
	id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

解説（schema の目的）
- 設計の完成形を残す（「今の正しい形」を見るため）
- DB に流し込むよりも、レビューや共有で参照する

コード（db/migrations/001_create_users.sql）
```
BEGIN;

CREATE TABLE users (
	id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
```

解説（migration の目的）
- 変更履歴として時系列に適用する
- BEGIN/COMMIT で「途中で失敗したら全部取り消す」単位にする

解説（この SQL の意味）
- CREATE TABLE: テーブル（データの入れ物）を新規作成する
- id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY:
	- BIGINT: 大きな整数型
	- UNSIGNED: 0 以上
	- AUTO_INCREMENT: 自動で連番を振る
	- PRIMARY KEY: 行を一意に識別するキー
- name VARCHAR(100) NOT NULL:
	- VARCHAR(100): 最大 100 文字の可変長文字列
	- NOT NULL: 空（NULL）を許可しない
- email VARCHAR(255) UNIQUE NOT NULL:
	- UNIQUE: 重複を許さない
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP:
	- DEFAULT CURRENT_TIMESTAMP: 何も指定しない場合は現在時刻を入れる

手順 5: シード
--------------
理由: 開発時の動作確認を早くするため。

コード（db/seeds/001_users.sql）
```
INSERT INTO users (name, email) VALUES
	('Alice', 'alice@example.com'),
	('Bob', 'bob@example.com');
```

解説
- 最低限のデータを入れて API 動作確認ができるようにする
- データの例として仕様の理解にも使う

手順 6: 起動と接続
-----------------
理由: Docker で MySQL を起動し、接続確認をするため。

1) 起動
```
docker compose -f db/docker-compose.yml up -d
```

解説
- `-d` はバックグラウンド起動

2) 接続（mysql）
```
mysql -h 127.0.0.1 -u app -papp_password -P 3306 app_db
```

解説
- `-h`: 接続先ホスト
- `-u`: ユーザー名
- `-p`: パスワード
- `-P`: ポート
- 最後の `app_db`: 接続するデータベース名

手順 7: マイグレーション/シードの適用
-----------------------------------
理由: 作成した SQL を DB に反映するため。

例: コンテナに対して実行
```
docker exec -i restapi-db mysql -u app -papp_password app_db < db/migrations/001_create_users.sql
docker exec -i restapi-db mysql -u app -papp_password app_db < db/seeds/001_users.sql
```

解説
- `docker exec -i`: コンテナ内でコマンドを実行する
- `< ...sql`: SQL ファイルの中身を MySQL に流し込む

どこまで書くべきか（目安）
--------------------------
- init: 「初回起動で必ず必要」な処理だけ（ユーザー/権限/初期 DB など）
- schema: その時点の完成形を 1 ファイルで表現できる範囲
- migrations: 変更のたびに 1 ファイル追加（既存を編集しない）
- seeds: 動作確認に必要な最小データだけ
- 迷ったら「今の API が動く最小限」を優先する

次の一歩
--------
- backend の .env に接続情報を設定する
- backend の models に SQL/ORM 実装を追加する
