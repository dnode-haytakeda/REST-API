Frontend 手順書（例: React + Vite）
=================================

この手順書はフロントエンドを段階的に理解して作れるようにまとめたものです。
ここでは例として React + Vite を使う想定で説明します（別のフレームワークでも考え方は同じ）。

前提
----
- Node.js (LTS)

ディレクトリ構成（目的）
------------------------
- src/components: 再利用 UI コンポーネント
- src/pages: 画面単位（ページ）
- src/hooks: カスタムフック
- src/styles: グローバル or コンポーネント共通スタイル
- src/utils: 共通関数
- public: 静的ファイル
- tests: テスト

手順 1: Vite プロジェクト作成
---------------------------
理由: 最小構成の React アプリを素早く用意できるため。

```
npm create vite@latest . -- --template react
npm i
```

手順 2: エントリ
----------------
理由: アプリの起点を明確化し、ページとコンポーネントを分離するため。

src/main.jsx
```
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./pages/App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
```

手順 3: ページ
-------------
理由: 画面単位で責務を分け、後からルーティングしやすくするため。

src/pages/App.jsx
```
const App = () => {
	return (
		<main>
			<h1>REST API Client</h1>
		</main>
	);
};

export default App;
```

手順 4: 共通コンポーネント
-------------------------
理由: UI の再利用性と一貫性を高めるため。

src/components/Button.jsx
```
const Button = ({ children, onClick }) => {
	return (
		<button onClick={onClick}>
			{children}
		</button>
	);
};

export default Button;
```

手順 5: API 通信の共通化
------------------------
理由: API の呼び出し方法を統一し、変更に強くするため。

src/utils/api.js
```
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

export const getHealth = async () => {
	const res = await fetch(`${API_BASE}/api/health`);
	if (!res.ok) throw new Error("Failed to fetch health");
	return res.json();
};
```

手順 6: スタイル
---------------
理由: 初期段階でも最低限の見た目を整えるため。

src/styles/global.css
```
body {
	font-family: "Helvetica", "Arial", sans-serif;
	margin: 0;
	padding: 2rem;
}
```

次の一歩
--------
- バックエンドの URL を .env に設定する
- ルーティング（React Router）導入
- API 連携ページの作成
- テスト追加
