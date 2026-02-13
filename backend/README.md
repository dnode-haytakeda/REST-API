Backend 手順書（Node.js + Express）
==================================

この手順書は「何をどのファイルに書くのか」「なぜそこに書くのか」「何をしているのか」を
段階的に理解できるようにしたものです。最終的には API サーバーが動く最小構成を作り、
役割ごとにコードを分けられるようにします。

前提
----
- Node.js (LTS) が入っていること
- ここでは CommonJS で書く想定（TypeScript ではなく JavaScript）

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

手順 8: バリデーション
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

手順 9: モデル（DB 連携）
------------------------
理由: DB 操作を一箇所にまとめ、コントローラから切り離すため。

src/models/exampleModel.js
```
const findAll = async () => {
	// 実際の DB 実装はここに書く
	return [];
};

module.exports = { findAll };
```

手順 10: 起動スクリプト
----------------------
理由: 開発と本番で起動方法を切り替えるため。

package.json の scripts 例（参考）
```
"scripts": {
	"dev": "nodemon src/server.js",
	"start": "node src/server.js"
}
```

次の一歩
--------
- DB を使うなら db/README.md にある手順を進める
- ルーティングを増やし、CRUD の基本 API を作る
- テストを追加する
