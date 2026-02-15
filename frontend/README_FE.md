Frontend 手順書（例: React + Vite + Backend CRUD 連携）
======================================================

この手順書はフロントエンドを段階的に理解して作れるようにまとめたものです。
「データ一覧の表示」「追加」「編集」「削除」をバックエンド API と連携させます。
デザインは最小限に、**動作理解**を優先しています。

前提
----
- Node.js (LTS)
- バックエンド API が `http://localhost:3000/api` で動作していること
- React の基本概念（JSX、コンポーネント）の理解があること

実行時間
--------
- 初心者: 約 30-40 分
- 経験者: 約 15-20 分

手順の流れ
----------

| 手順 | 作成ファイル | エラー状態 | 説明 |
|------|-----------|---------|------|
| 1-2 | ディレクトリ | なし | npm run dev が正常に動作 |
| 3 | main.jsx | ⚠️ import エラー | App.jsx が見つからない |
| 4 | src/pages/App.jsx | ⚠️ import エラー | コンポーネントが見つからない |
| 5-6 | src/services/api.js | ⚠️ import エラー | API 関数は完成 |
| 7 | src/components/UserForm.jsx | ⚠️ import エラー | フォーム UI 完成 |
| 8 | src/components/EditForm.jsx | ⚠️ import エラー | 編集フォーム完成 |
| 9 | src/components/UserItem.jsx | ✅ 解決！ | **すべてのエラーが消えて動作開始** |
| 10 | src/styles/global.css | ✅ 完成 | スタイル適用完了 |

**重要**: 手順 3-8 まで、モジュール not found エラーが出ます。これは **正常です**。手順 9 ですべてが揃って動作を始めます。

ディレクトリ構成（目的）
------------------------
- src/components: 再利用 UI コンポーネント（ボタン、入力欄など）
- src/pages: 画面単位（ページ）
- src/hooks: カスタムフック（ロジックの再利用）
- src/styles: スタイルシート
- src/utils: API 通信など共通関数
- src/services: API 連携ロジック

手順 1: Vite プロジェクト作成（既に完了）
----------------------------------------
理由: 最小構成の React アプリを素早く用意できるため。

ステータス: ✅ 完了

確認: Vite が正常に起動しているか

ターミナルで実行：
```bash
npm run dev
```

期待される出力：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

ブラウザで確認：
1. `http://localhost:5173` にアクセス
2. Vite + React ロゴが表示される
3. ブラウザのコンソール（F12）にエラーがない

✅ ここまで完了したら、次の手順に進みます。

手順 2: 必要なディレクトリを作成
-------------------------------
理由: API 通信・コンポーネント・ページをフォルダ分けして管理しやすくするため。

操作手順

ターミナルで実行：
```bash
cd frontend
mkdir -p src/components src/services src/pages src/styles
```

確認:
```bash
ls -R src/
```

期待される出力:
```
src/:
assets     components  index.css  main.jsx    pages  services  styles

src/components:
（空）

src/pages:
（空）

src/services:
（空）

src/styles:
（空）
```

✅ ここまで完了したら、次の手順に進みます。







手順 3: エントリポイント（main.jsx）の編集
-----------------------------------------------
理由: React アプリの起点を整理し、スタイルを一括読み込みするため。

⚠️ 注意: この手順以降、手順 4 までは **エラーが表示されます**。これは正常です。手順を完了するたびに解決していきます。

現在の main.jsx
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

編集内容（グローバルスタイルの場所を変更し、App を pages フォルダから呼び込む）

操作手順
1. VS Code で `src/main.jsx` をダブルクリックして開く
2. ファイル全体を選択（Cmd+A）して削除
3. 以下のコードをコピー & ペースト

コード（src/main.jsx を完全に置き換え）
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './pages/App'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

解説
- `import App from "./pages/App"`: App を pages フォルダから読み込む（手順 4 で作成）
- `import "./styles/global.css"`: グローバルスタイルを styles フォルダから読み込む（手順 11 で作成）
- `StrictMode`: React 18 以降の推奨インポート記法
- `createRoot`: React 18 以降の標準 API

⚠️ エラーが出ます: `Cannot find module './pages/App'`
→ これは正常です。手順 4 で App.jsx を作成したら解決します。

手順 4: ページコンポーネント（App.jsx）の作成
----------------------------------------------
理由: 画面全体のレイアウトを一箇所で管理するため。

⚠️ 注意: この手順完了時点でも、まだ部品コンポーネント（手順 7-9）がないため **エラーが続きます**。これは正常です。

操作手順

**ステップ 1: 既存の src/App.jsx と src/App.css を削除**

ターミナルで実行：
```bash
rm src/App.jsx src/App.css
```

確認（App.jsx が消えたことを確認）：
```bash
ls -la src/App.jsx  # これで「No such file」と出れば OK
```

**ステップ 2: src/pages/App.jsx を作成**

ターミナルで実行：
```bash
touch src/pages/App.jsx
```

**ステップ 3: コード全体をファイルに入力**

1. VS Code で `src/pages/App.jsx` をダブルクリックして開く
2. 以下のコード全体をコピー
3. ファイル内に貼り付け（上書き）
4. Cmd+S で保存

コード（src/pages/App.jsx 全体を上書き）
```jsx
import { useState, useEffect } from "react";
import { fetchUsers, createUser, updateUser, deleteUser } from "../services/api";
import UserForm from "../components/UserForm";
import UserItem from "../components/UserItem";
import EditForm from "../components/EditForm";

const App = () => {
	const [users, setUsers] = useState([]);
	const [editingUser, setEditingUser] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		loadUsers();
	}, []);

	const loadUsers = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchUsers();
			setUsers(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async (name, email) => {
		try {
			await createUser(name, email);
			await loadUsers();
		} catch (err) {
			setError(err.message);
		}
	};

	const handleUpdate = async (id, name, email) => {
		try {
			await updateUser(id, name, email);
			setEditingUser(null);
			await loadUsers();
		} catch (err) {
			setError(err.message);
		}
	};

	const handleDelete = async (id) => {
		try {
			await deleteUser(id);
			await loadUsers();
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<main>
			<h1>ユーザー管理</h1>

			{error && <p style={{ color: "red" }}>エラー: {error}</p>}

			<section>
				<h2>{editingUser ? "編集" : "新規作成"}</h2>
				{editingUser ? (
					<EditForm
						user={editingUser}
						onSubmit={handleUpdate}
						onCancel={() => setEditingUser(null)}
					/>
				) : (
					<UserForm onSubmit={handleCreate} />
				)}
			</section>

			<section>
				<h2>ユーザー一覧</h2>
				{loading ? (
					<p>読み込み中...</p>
				) : users.length === 0 ? (
					<p>ユーザーがいません</p>
				) : (
					<ul>
						{users.map((user) => (
							<UserItem
								key={user.id}
								user={user}
								onEdit={setEditingUser}
								onDelete={handleDelete}
							/>
						))}
					</ul>
				)}
			</section>
		</main>
	);
};

export default App;
```

解説
- `useState`: ユーザー一覧・編集対象・読み込み状態を管理
- `useEffect`: マウント時に `loadUsers()` を 1 回だけ実行
- `handleCreate/Update/Delete`: 各操作後に `loadUsers()` でリストを再取得
- このコンポーネントは手順 7-9 で作成する子コンポーネントを使用

⚠️ エラーが続きます: `Cannot find module '../services/api'` など複数
→ これは正常です。手順 5-6（API）と手順 7-9（コンポーネント）で解決します。



手順 5-6: API 通信関数の作成（GET, POST, PUT, PATCH, DELETE）
--------------------------------------------------------------
理由: バックエンド API と通信するすべての関数を一箇所に集めるため。

⚠️ 注意: この手順完了後、エラーは解消され始めます。

操作手順

**ステップ 1: src/services/api.js を作成**

ターミナルで実行：
```bash
touch src/services/api.js
```

**ステップ 2: コード全体をファイルに入力**

1. VS Code で `src/services/api.js` をダブルクリックして開く
2. 以下のコード全体をコピー
3. ファイル内に貼り付け（上書き）
4. Cmd+S で保存

コード（src/services/api.js 全体 - 単一ファイルで完结）
```javascript
const API_BASE = "http://localhost:3000/api";

// ユーザー一覧取得
export const fetchUsers = async () => {
	const res = await fetch(`${API_BASE}/users`);
	if (!res.ok) throw new Error("Failed to fetch users");
	return res.json();
};

// ユーザー詳細取得
export const fetchUser = async (id) => {
	const res = await fetch(`${API_BASE}/users/${id}`);
	if (!res.ok) throw new Error("User not found");
	return res.json();
};

// ユーザー作成
export const createUser = async (name, email) => {
	const res = await fetch(`${API_BASE}/users`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, email }),
	});
	if (!res.ok) throw new Error("Failed to create user");
	return res.json();
};

// ユーザー更新（全置き換え）
export const updateUser = async (id, name, email) => {
	const res = await fetch(`${API_BASE}/users/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, email }),
	});
	if (!res.ok) throw new Error("Failed to update user");
	return res.json();
};

// ユーザー部分更新
export const patchUser = async (id, fields) => {
	const res = await fetch(`${API_BASE}/users/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(fields),
	});
	if (!res.ok) throw new Error("Failed to patch user");
	return res.json();
};

// ユーザー削除
export const deleteUser = async (id) => {
	const res = await fetch(`${API_BASE}/users/${id}`, {
		method: "DELETE",
	});
	if (!res.ok) throw new Error("Failed to delete user");
	return res.status === 204 ? null : res.json();
};
```

解説
- `API_BASE`: バックエンドの URL を一箇所で管理（環境変数をまだ使わない理由：シンプルさを優先）
- `async/await`: HTTP リクエストが完了するまで待つ
- `fetch()`: ブラウザ組み込み API で HTTP リクエストを送信
- `if (!res.ok)`: ステータスコード 2xx〜3xx をチェック、エラー時は throw
- `return res.json()`: レスポンスを JavaScript オブジェクトに変換

確認方法
```bash
# ファイルが正しく作成されたか確認
cat src/services/api.js | head -10  # 最初の10行表示
```

⚠️ エラーがもう少し残っています: `Cannot find module '../components/UserForm'` など
→ これは正常です。手順 7-9 でコンポーネント作成後に解決します。

手順 7: ユーザー作成フォームコンポーネント
-------------------------------------------
理由: ユーザーが新規データを入力・送信できる UI を作成するため。

操作手順

**ステップ 1: ファイルを作成**

ターミナルで実行：
```bash
touch src/components/UserForm.jsx
```

**ステップ 2: コード全体をファイルに入力**

1. VS Code で `src/components/UserForm.jsx` をダブルクリックして開く
2. 以下のコード全体をコピー
3. ファイル内に貼り付け（上書き）
4. Cmd+S で保存

コード（src/components/UserForm.jsx 全体）
```jsx
import { useState } from "react";

const UserForm = ({ onSubmit }) => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			await onSubmit(name, email);
			setName("");
			setEmail("");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<input
				type="text"
				placeholder="名前"
				value={name}
				onChange={(e) => setName(e.target.value)}
				required
			/>
			<input
				type="email"
				placeholder="メール"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				required
			/>
			<button type="submit" disabled={loading}>
				{loading ? "送信中..." : "作成"}
			</button>
		</form>
	);
};

export default UserForm;
```

解説
- `onSubmit`: 親コンポーネント（App.jsx）から渡される関数
- `e.preventDefault()`: フォーム送信時のページリロードを阻止
- `value={name}` + `onChange`: 入力値と状態を同期（制御コンポーネント）
- `disabled={loading}`: 送信中はボタンを無効化

手順 8: ユーザー更新フォームコンポーネント
-------------------------------------------
理由: 既存ユーザーの情報を編集できる UI を作成するため。

操作手順

**ステップ 1: ファイルを作成**

ターミナルで実行：
```bash
touch src/components/EditForm.jsx
```

**ステップ 2: コード全体をファイルに入力**

1. VS Code で `src/components/EditForm.jsx` をダブルクリックして開く
2. 以下のコード全体をコピー
3. ファイル内に貼り付け（上書き）
4. Cmd+S で保存

コード（src/components/EditForm.jsx 全体）
```jsx
import { useState } from "react";

const EditForm = ({ user, onSubmit, onCancel }) => {
	const [name, setName] = useState(user.name);
	const [email, setEmail] = useState(user.email);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			await onSubmit(user.id, name, email);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				required
			/>
			<input
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				required
			/>
			<button type="submit" disabled={loading}>
				{loading ? "更新中..." : "更新"}
			</button>
			<button type="button" onClick={onCancel}>
				キャンセル
			</button>
		</form>
	);
};

export default EditForm;
```

解説
- `user`: 親コンポーネントから渡される編集対象のユーザーオブジェクト
- `user.name`, `user.email`: 初期値として設定
- `onCancel`: 「キャンセル」ボタンで呼ばれる親コンポーネントの関数
- `type="button"` on onCancel button: フォーム送信を避けるための指定

手順 9: ユーザー削除ボタンコンポーネント
-----------------------------------------
理由: ユーザー一覧に編集・削除ボタンを表示する UI を作成するため。

⚠️ 注意: この手順完了後、**すべてのエラーが解決されて、アプリが起動できるようになります**。

操作手順

**ステップ 1: ファイルを作成**

ターミナルで実行：
```bash
touch src/components/UserItem.jsx
```

**ステップ 2: コード全体をファイルに入力**

1. VS Code で `src/components/UserItem.jsx` をダブルクリックして開く
2. 以下のコード全体をコピー
3. ファイル内に貼り付け（上書き）
4. Cmd+S で保存

コード（src/components/UserItem.jsx 全体）
```jsx
const UserItem = ({ user, onEdit, onDelete }) => {
	const handleDelete = async () => {
		if (window.confirm(`${user.name} を削除しますか？`)) {
			await onDelete(user.id);
		}
	};

	return (
		<li>
			<span>{user.name} ({user.email})</span>
			<button onClick={() => onEdit(user)}>編集</button>
			<button onClick={handleDelete} style={{ color: "red" }}>
				削除
			</button>
		</li>
	);
};

export default UserItem;
```

解説
- `user`: 表示対象のユーザーオブジェクト
- `onEdit`, `onDelete`: 親コンポーネント（App.jsx）から渡される関数
- `window.confirm()`: 削除前に確認ダイアログを表示

確認: エラーが消えたか確認
```bash
# ブラウザの開発者ツール（F12）で、コンソール欄にエラーがないか確認
# もしくは、ターミナルの `npm run dev` 出力に赤いエラーメッセージがないか確認
```

手順 10: スタイル（最小限）
--------------------------
理由: 見た目を最低限整えるため。

操作手順

**ステップ 1: ファイルを作成**

ターミナルで実行：
```bash
touch src/styles/global.css
```

**ステップ 2: コード全体をファイルに入力**

1. VS Code で `src/styles/global.css` をダブルクリックして開く
2. 以下のコード全体をコピー
3. ファイル内に貼り付け（上書き）
4. Cmd+S で保存

コード（src/styles/global.css 全体）
```css
body {
	font-family: "Helvetica", "Arial", sans-serif;
	margin: 0;
	padding: 2rem;
	background: #f5f5f5;
}

main {
	max-width: 800px;
	margin: 0 auto;
	background: white;
	padding: 2rem;
	border-radius: 8px;
}

section {
	margin: 2rem 0;
	padding-bottom: 2rem;
	border-bottom: 1px solid #ddd;
}

form {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

input {
	padding: 0.5rem;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 1rem;
}

button {
	padding: 0.5rem 1rem;
	background: #007bff;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 1rem;
}

button:disabled {
	background: #ccc;
	cursor: not-allowed;
}

ul {
	list-style: none;
	padding: 0;
}

li {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1rem;
	background: #f9f9f9;
	margin: 0.5rem 0;
	border-radius: 4px;
}
```

解説
- `display: flex`: ボタンやリスト要素を横並びに配置
- `gap: 1rem`: フォーム要素間の垂直スペース
- `justify-content: space-between`: ユーザー情報とボタンを両端に配置
- `button:disabled`: 送信中のボタンをグレーアウト

確認: ブラウザで実際に見てみる
```bash
# ターミナルで npm run dev が動いているはず
# ブラウザで http://localhost:5173 にアクセス
# ページが表示されて、スタイルが適用されているか確認
```

✅ 完成！

完成後のテスト
--------------

手順 10 まで完了したら、実際に CRUD 操作をテストしてください。

**テスト手順:**

1. ブラウザで `http://localhost:5173` にアクセス
2. 「新規作成」セクションにユーザー名とメール を入力して「作成」ボタンを押す
3. 「ユーザー一覧」に新しいユーザーが表示される
4. 「編集」ボタンをクリック → 値を変更 → 「更新」を押す
5. 一覧で変更が反映される
6. 「削除」ボタンをクリック →確認ダイアログで「OK」を押す
7. 一覧からユーザーが消える

**エラーが出た場合:**
- ブラウザコンソール（F12）にエラーメッセージが表示される
- バックエンドが `http://localhost:3000/api` で起動しているか確認
- ターミナルで `npm run dev` の出力にエラーがないか確認

トラブルシューティング
---------------------

**Q: Blank ページが表示される**
- A: ブラウザコンソール（F12）を確認 → エラーメッセージをコピーして検索

**Q: タイムアウトエラーが出る**
- A: バックエンド API が起動しているか確認 → `npm run dev` を backend/ で実行

**Q: 「モジュールが見つからない」エラーが出る**
- A: 手順を飛ばしていないか確認 → 順番通り実行

次の一歩
--------

フロントエンドが完成したので、以下の改善に挑戦できます：

1. **React Router** で複数ページに分割
2. **フォームバリデーション** を強化（メール形式のチェック、必須チェックなど）
3. **ローカルストレージ** でデータをキャッシュ
4. **Jest** でテストを追加
5. **Tailwind CSS** でスタイルを高度に


