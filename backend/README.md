Backend 手順書（Node.js + Express + MySQL 連携）
==============================================

この手順書は「何をどのファイルに書くのか」「なぜそこに書くのか」「何をしているのか」を
段階的に理解できるようにしたものです。最終的には API サーバーが動く最小構成を作り、
役割ごとにコードを分けられるようにします。

前提
----
- Node.js (LTS) が入っていること
- ここでは CommonJS で書く想定（TypeScript ではなく JavaScript）
- DB は Docker Hub の MySQL 公式イメージを使用する（db/README.md 参照）

ディレクトリ構成（目的）
------------------------
- src/routes: ルーティング定義（URL と処理の対応）
- src/controllers: リクエスト/レスポンスの入出力を扱う
- src/services: ビジネスロジック（ルール、計算、外部連携）
- src/models: DB とのやり取り（SQL/ORM）
- src/middlewares: 認証やログなどの横断処理
- src/validators: 入力チェック
- src/config: 環境変数や設定の集約
- src/utils: 共通関数
- tests: テスト
- scripts: ローカル操作や一括処理

手順 1: npm 初期化と依存追加
---------------------------
この手順自体は実行コマンドですが、理解のために示します。
理由: Express を動かす最小依存が必要になるため。

1) ルートで初期化
```
npm init -y
```

2) 依存追加
```
npm i express dotenv cors morgan
npm i mysql2
npm i -D nodemon
```

手順 2: エントリポイント
-----------------------
理由: サーバー起動とアプリ定義を分離すると、テストや拡張が簡単になるため。

1) src/app.js を作成（アプリ定義）
```
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const apiRoutes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error");

const app = express();

// 基本ミドルウェア
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ルーティング
app.use("/api", apiRoutes);

// エラーハンドリング
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
```

2) src/server.js を作成（サーバー起動）
```
require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, () => {
	console.log(`API server listening on port ${port}`);
});
```

手順 3: ルーティング
--------------------
理由: URL と処理の対応を一箇所にまとめるため。

1) src/routes/index.js
```
const express = require("express");
const healthRoutes = require("./health");

const router = express.Router();

router.use("/health", healthRoutes);

module.exports = router;
```

2) src/routes/health.js
```
const express = require("express");
const { getHealth } = require("../controllers/healthController");

const router = express.Router();

router.get("/", getHealth);

module.exports = router;
```

手順 4: コントローラ
--------------------
理由: HTTP の入出力だけを担当させ、ビジネスロジックを分離するため。

src/controllers/healthController.js
```
const { buildHealth } = require("../services/healthService");

const getHealth = (req, res) => {
	const payload = buildHealth();
	res.status(200).json(payload);
};

module.exports = { getHealth };
```

手順 5: サービス
----------------
理由: ルールや計算などの「意味」を集約するため。

src/services/healthService.js
```
const buildHealth = () => {
	return {
		status: "ok",
		timestamp: new Date().toISOString(),
	};
};

module.exports = { buildHealth };
```

手順 6: エラーハンドリング
-------------------------
理由: エラー応答の形式を統一し、追跡しやすくするため。

src/middlewares/error.js
```
const notFoundHandler = (req, res) => {
	res.status(404).json({ message: "Not Found" });
};

// eslint を使う場合は next を残す
const errorHandler = (err, req, res, next) => {
	console.error(err);
	res.status(500).json({ message: "Internal Server Error" });
};

module.exports = { notFoundHandler, errorHandler };
```

手順 7: 設定
------------
理由: 環境変数の参照を一箇所に集め、変更に強くするため。

src/config/env.js
```
const getEnv = (key, fallback) => {
	const value = process.env[key];
	if (value === undefined) return fallback;
	return value;
};

module.exports = { getEnv };
```

手順 8: DB 接続
--------------
理由: DB 接続情報とコネクションプールを分離し、再利用しやすくするため。

src/config/db.js
```
const mysql = require("mysql2/promise");
const { getEnv } = require("./env");

const pool = mysql.createPool({
  host: getEnv("DB_HOST", "127.0.0.1"),
  port: Number(getEnv("DB_PORT", "3306")),
  user: getEnv("DB_USER", "app"),
  password: getEnv("DB_PASSWORD", "app_password"),
  database: getEnv("DB_NAME", "app_db"),
  connectionLimit: 10,
});

module.exports = { pool };
```

backend/.env（例）
```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db
```

手順 9: バリデーション
---------------------
理由: 入力不正を早期に弾き、サービス層を安全にするため。

src/validators/exampleValidator.js
```
const validateName = (name) => {
	if (typeof name !== "string" || name.trim().length === 0) {
		return "name is required";
	}
	return null;
};

module.exports = { validateName };
```

手順 10: モデル（DB 連携）
-------------------------
理由: DB 操作を一箇所にまとめ、コントローラから切り離すため。

src/models/userModel.js
```
const { pool } = require("../config/db");

const findAll = async () => {
	const [rows] = await pool.query("SELECT id, name, email, created_at FROM users");
	return rows;
};

module.exports = { findAll };
```

手順 11: サービス（DB を利用）
-----------------------------
理由: データ取得をサービス層で組み立て、コントローラを薄くするため。

src/services/userService.js
```
const { findAll } = require("../models/userModel");

const listUsers = async () => {
	return findAll();
};

module.exports = { listUsers };
```

手順 12: コントローラ（DB を利用）
---------------------------------
理由: HTTP 入出力だけに責務を限定するため。

src/controllers/userController.js
```
const { listUsers } = require("../services/userService");

const getUsers = async (req, res, next) => {
	try {
		const users = await listUsers();
		res.status(200).json(users);
	} catch (err) {
		next(err);
	}
};

module.exports = { getUsers };
```

手順 13: ルーティング（DB を利用）
---------------------------------
理由: DB を使う API をエンドポイントとして公開するため。

src/routes/users.js
```
const express = require("express");
const { getUsers } = require("../controllers/userController");

const router = express.Router();

router.get("/", getUsers);

module.exports = router;
```

src/routes/index.js に追加
```
const userRoutes = require("./users");

router.use("/users", userRoutes);
```

手順 14: 起動スクリプト
----------------------
理由: 開発と本番で起動方法を切り替えるため。

package.json の scripts 例（参考）
```
"scripts": {
	"dev": "nodemon src/server.js",
	"start": "node src/server.js"
}
```

手順 15: ユーザー詳細取得（Read One）
------------------------------------
理由: 個別のユーザー情報を ID で取得できるようにするため。

1) モデルに追加（src/models/userModel.js）
```
const findById = async (id) => {
	const [rows] = await pool.query(
		"SELECT id, name, email, created_at FROM users WHERE id = ?",
		[id]
	);
	return rows[0] || null;
};

module.exports = { findAll, findById };
```

解説
- `WHERE id = ?` でパラメータ化クエリを使い、SQL インジェクション対策
- `[id]` が `?` に代入される
- `rows[0]` で1件目を取り出し、なければ `null`

2) サービスに追加（src/services/userService.js）
```
const { findAll, findById } = require("../models/userModel");

const getUserById = async (id) => {
	return findById(id);
};

module.exports = { listUsers, getUserById };
```

解説
- モデルから取得したデータをそのまま返す
- 将来的に加工やバリデーションを追加する余地を残す

3) コントローラに追加（src/controllers/userController.js）
```
const { listUsers, getUserById } = require("../services/userService");

const getUser = async (req, res, next) => {
	try {
		const user = await getUserById(req.params.id);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.status(200).json(user);
	} catch (err) {
		next(err);
	}
};

module.exports = { getUsers, getUser };
```

解説
- `req.params.id` で URL パラメータを取得
- 見つからなければ 404 を返す
- エラーは `next(err)` でエラーハンドラに渡す

4) ルーティングに追加（src/routes/users.js）
```
const { getUsers, getUser } = require("../controllers/userController");

router.get("/:id", getUser);
```

解説
- `/:id` で動的パラメータを定義
- `/users/1` なら `req.params.id` に `"1"` が入る

手順 16: ユーザー作成（Create）
-------------------------------
理由: 新しいユーザーを DB に追加できるようにするため。

1) モデルに追加（src/models/userModel.js）
```
const create = async (name, email) => {
	const [result] = await pool.query(
		"INSERT INTO users (name, email) VALUES (?, ?)",
		[name, email]
	);
	return result.insertId;
};

module.exports = { findAll, findById, create };
```

解説
- `INSERT INTO` で新規レコードを作成
- `result.insertId` で自動採番された ID を返す

2) サービスに追加（src/services/userService.js）
```
const { findAll, findById, create } = require("../models/userModel");

const createUser = async (name, email) => {
	const id = await create(name, email);
	return { id, name, email };
};

module.exports = { listUsers, getUserById, createUser };
```

解説
- 作成した ID と入力値を返す
- 将来的に重複チェックや検証を追加できる

3) コントローラに追加（src/controllers/userController.js）
```
const { listUsers, getUserById, createUser } = require("../services/userService");

const postUser = async (req, res, next) => {
	try {
		const { name, email } = req.body;
		if (!name || !email) {
			return res.status(400).json({ message: "name and email are required" });
		}
		const user = await createUser(name, email);
		res.status(201).json(user);
	} catch (err) {
		next(err);
	}
};

module.exports = { getUsers, getUser, postUser };
```

解説
- `req.body` からリクエストボディを取得
- 必須項目がなければ 400 を返す
- 作成成功時は 201（Created）を返す

4) ルーティングに追加（src/routes/users.js）
```
const { getUsers, getUser, postUser } = require("../controllers/userController");

router.post("/", postUser);
```

手順 17: ユーザー更新（Update）
-------------------------------
理由: 既存ユーザーの全フィールドを上書き更新するため。

1) モデルに追加（src/models/userModel.js）
```
const update = async (id, name, email) => {
	const [result] = await pool.query(
		"UPDATE users SET name = ?, email = ? WHERE id = ?",
		[name, email, id]
	);
	return result.affectedRows;
};

module.exports = { findAll, findById, create, update };
```

解説
- `UPDATE` で既存レコードを更新
- `affectedRows` で更新された行数を返す（0 なら対象なし）

2) サービスに追加（src/services/userService.js）
```
const { findAll, findById, create, update } = require("../models/userModel");

const updateUser = async (id, name, email) => {
	const affectedRows = await update(id, name, email);
	if (affectedRows === 0) return null;
	return { id, name, email };
};

module.exports = { listUsers, getUserById, createUser, updateUser };
```

解説
- 更新行数が 0 なら `null` を返す
- 更新成功時は更新後のデータを返す

3) コントローラに追加（src/controllers/userController.js）
```
const { listUsers, getUserById, createUser, updateUser } = require("../services/userService");

const putUser = async (req, res, next) => {
	try {
		const { name, email } = req.body;
		if (!name || !email) {
			return res.status(400).json({ message: "name and email are required" });
		}
		const user = await updateUser(req.params.id, name, email);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.status(200).json(user);
	} catch (err) {
		next(err);
	}
};

module.exports = { getUsers, getUser, postUser, putUser };
```

解説
- PUT は全フィールド必須
- 対象がなければ 404 を返す

4) ルーティングに追加（src/routes/users.js）
```
const { getUsers, getUser, postUser, putUser } = require("../controllers/userController");

router.put("/:id", putUser);
```

手順 18: ユーザー部分更新（Partial Update）
------------------------------------------
理由: 一部のフィールドだけを更新するため。

1) モデルに追加（src/models/userModel.js）
```
const partialUpdate = async (id, fields) => {
	const keys = Object.keys(fields);
	const values = Object.values(fields);
	const setClause = keys.map((key) => `${key} = ?`).join(", ");
	const [result] = await pool.query(
		`UPDATE users SET ${setClause} WHERE id = ?`,
		[...values, id]
	);
	return result.affectedRows;
};

module.exports = { findAll, findById, create, update, partialUpdate };
```

解説
- `fields` オブジェクトから動的に SET 句を生成
- 例: `{ name: "Alice" }` → `"SET name = ?"`

2) サービスに追加（src/services/userService.js）
```
const { findAll, findById, create, update, partialUpdate } = require("../models/userModel");

const patchUser = async (id, fields) => {
	const affectedRows = await partialUpdate(id, fields);
	if (affectedRows === 0) return null;
	return findById(id);
};

module.exports = { listUsers, getUserById, createUser, updateUser, patchUser };
```

解説
- 更新後に最新データを取得して返す
- 部分更新なので入力されたフィールドだけが変わる

3) コントローラに追加（src/controllers/userController.js）
```
const { listUsers, getUserById, createUser, updateUser, patchUser } = require("../services/userService");

const patchUserHandler = async (req, res, next) => {
	try {
		const fields = req.body;
		if (Object.keys(fields).length === 0) {
			return res.status(400).json({ message: "No fields to update" });
		}
		const user = await patchUser(req.params.id, fields);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		res.status(200).json(user);
	} catch (err) {
		next(err);
	}
};

module.exports = { getUsers, getUser, postUser, putUser, patchUserHandler };
```

解説
- PATCH は一部フィールドだけでOK
- 空のリクエストは 400 を返す

4) ルーティングに追加（src/routes/users.js）
```
const { getUsers, getUser, postUser, putUser, patchUserHandler } = require("../controllers/userController");

router.patch("/:id", patchUserHandler);
```

手順 19: ユーザー削除（Delete）
-------------------------------
理由: ユーザーを DB から削除するため。

1) モデルに追加（src/models/userModel.js）
```
const deleteById = async (id) => {
	const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
	return result.affectedRows;
};

module.exports = { findAll, findById, create, update, partialUpdate, deleteById };
```

解説
- `DELETE FROM` で指定 ID のレコードを削除
- `affectedRows` で削除された行数を返す

2) サービスに追加（src/services/userService.js）
```
const { findAll, findById, create, update, partialUpdate, deleteById } = require("../models/userModel");

const removeUser = async (id) => {
	const affectedRows = await deleteById(id);
	return affectedRows > 0;
};

module.exports = { listUsers, getUserById, createUser, updateUser, patchUser, removeUser };
```

解説
- 削除成功なら `true`、対象なしなら `false`

3) コントローラに追加（src/controllers/userController.js）
```
const { listUsers, getUserById, createUser, updateUser, patchUser, removeUser } = require("../services/userService");

const deleteUser = async (req, res, next) => {
	try {
		const success = await removeUser(req.params.id);
		if (!success) {
			return res.status(404).json({ message: "User not found" });
		}
		res.status(204).send();
	} catch (err) {
		next(err);
	}
};

module.exports = { getUsers, getUser, postUser, putUser, patchUserHandler, deleteUser };
```

解説
- 削除成功時は 204（No Content）を返す
- 対象なしなら 404 を返す

4) ルーティングに追加（src/routes/users.js）
```
const { getUsers, getUser, postUser, putUser, patchUserHandler, deleteUser } = require("../controllers/userController");

router.delete("/:id", deleteUser);
```

Docker化
--------

理由: 開発、本番、チーム間で同じ環境を保証し、「手元ではうまくいったのに...」という問題を防ぐため。

**手順 1: Dockerfile を作成**

**手順 1: backend/Dockerfile を作成**

**ファイルパス**
```
backend/
└── Dockerfile   ← ここに作成
```

**ファイル内容**

backend/Dockerfile に以下を記載：

```dockerfile
# Step 1: ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# package.json のコピー
COPY package.json package-lock.json ./

# 依存のインストール
RUN npm ci

# Step 2: 実行ステージ
FROM node:20-alpine

WORKDIR /app

# builder ステージから node_modules をコピー（サイズ削減）
COPY --from=builder /app/node_modules ./node_modules

# ソースコードをコピー
COPY . .

# ポート公開
EXPOSE 3000

# 起動コマンド
CMD ["npm", "start"]
```

**解説**
- `node:20-alpine`: Alpine Linux ベースで軽量（全体で ~200MB）
- マルチステージビルド: builder で依存をインストール → 実行ステージで必要なファイルのみコピー
- `npm ci`: CI 環境向け（package-lock.json の正確さを保証）
- `npm start`: 本番起動スクリプト（nodemon は開発用なので使わない）

**なぜ package.json を先にコピーするのか？（Docker レイヤーキャッシュ最適化）**

Docker は各命令を「レイヤー」として保存し、ファイルが変わらなければキャッシュ（再利用）します。

```dockerfile
COPY package.json package-lock.json ./   # レイヤー A
RUN npm ci                                # レイヤー B（5分かかる）
COPY . .                                  # レイヤー C
```

**シナリオ：src/app.js を修正してリビルド**
- レイヤー A: package.json 変わってない → ✅ キャッシュ利用
- レイヤー B: npm ci をスキップ → ✅ キャッシュ利用（5分節約）
- レイヤー C: ソースコード変わった → ❌ 再実行（10秒）

**もし COPY . . を先に書くと：**
- src/app.js 変更 → COPY . . が再実行 → npm ci も再実行（毎回5分待つ）

**結論：** package.json を先にコピーすることで、依存が変わらない限り npm install をスキップできる

**手順 2: backend/.dockerignore を作成**

**ファイルパス**
```
backend/
└── .dockerignore   ← ここに作成
```

**ファイル内容**

backend/.dockerignore に以下を記載：
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env.example
tests
```

**解説**
- Docker イメージから不要なファイルを除外
- ビルド時間を短縮、イメージサイズを削減

**手順 3: 環境変数を確認**

backend/.env の確認
```
PORT=3000
DB_HOST=db               # ← ここが重要！docker-compose では service 名を使う
DB_PORT=3306
DB_USER=app
DB_PASSWORD=app_password
DB_NAME=app_db
```

**解説**
- Docker コンテナ間通信では、localhost ではなく service 名（`db`）を使う
- docker-compose.yml で service 名 `db` を定義すると、自動的に DNS 解決される

**手順 4: ローカルで Docker イメージをビルド（オプション）**

```
cd backend
docker build -t restapi-backend:latest .
```

**解説**
- `-t`: タグ名（リポジトリ名:バージョン）
- `.`: Dockerfile の場所

**手順 5: 単独でテスト（オプション）**

```
docker run --env-file .env -p 3000:3000 restapi-backend:latest
```

**注意**
- この段階では DB が起動していないため、API は動作しません
- 次の「Docker Compose」ステップで全サービスを統合します

次の一歩
--------
- requests.http で各エンドポイントをテストする
- バリデーション機能を強化する
- テストを追加する
- Docker Compose で全サービス統合（DOCKER_SETUP.md 参照）
