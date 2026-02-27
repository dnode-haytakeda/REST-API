# フロントエンド構築ガイド - ECサイト React アプリケーション

> **対象読者**: IT初心者（空のフォルダからReactアプリを構築したい方）
> **前提**: バックエンドAPI（02_BACKEND_GUIDE.md）が稼働中であること
> **技術スタック**: React 19 + Vite 7 + React Router 7

---

## 目次

1. [全体像とアーキテクチャ](#1-全体像とアーキテクチャ)
2. [Phase 1: プロジェクト初期構築](#2-phase-1-プロジェクト初期構築)
3. [Phase 2: 基盤レイヤー（HTTP通信・認証）](#3-phase-2-基盤レイヤーhttp通信認証)
4. [Phase 3: 認証画面の実装](#4-phase-3-認証画面の実装)
5. [Phase 4: EC機能の実装（商品・注文）](#5-phase-4-ec機能の実装商品注文)
6. [Phase 5: 管理者画面の実装](#6-phase-5-管理者画面の実装)
7. [Phase 6: スタイリング（CSS）](#7-phase-6-スタイリングcss)
8. [Phase 7: Docker対応](#8-phase-7-docker対応)
9. [Phase 8: クエリパラメータバリデーション（フロントエンド側）](#9-phase-8-クエリパラメータバリデーションフロントエンド側)
10. [動作確認手順](#10-動作確認手順)
11. [トラブルシューティング](#11-トラブルシューティング)
- [付録A: ファイル作成チェックリスト](#付録a-ファイル作成チェックリスト)
- [付録B: React 主要概念のまとめ](#付録b-react-主要概念のまとめ)
- [付録C: React / CSS 基礎知識](#付録c-react--css-基礎知識)
- [付録D: 商品一覧アーキテクチャ設計参照](#付録d-商品一覧アーキテクチャ設計参照)

---

## 1. 全体像とアーキテクチャ

### 1.1 このアプリでできること

| 機能 | 説明 |
|------|------|
| ロール選択 | エンドユーザー / 管理者を選択してログイン |
| ユーザー認証 | 新規登録・ログイン・ログアウト（JWT認証） |
| ダッシュボード | 人気商品一覧・おすすめ情報の表示 |
| 商品一覧 | カテゴリ・価格・並び順でフィルタリング、ページネーション |
| 商品詳細 | 商品情報の表示、カート追加 |
| カート機能 | localStorage を使った簡易カート |
| 管理者画面 | ユーザーCRUD（作成・読取・更新・削除） |

### 1.2 技術スタック

```
React 19.2.0          → UIライブラリ
Vite 7.3.1             → 開発サーバー・ビルドツール
react-router-dom 7.0.0 → シングルページアプリのルーティング
modern-normalize 3.0.1 → ブラウザ間のCSS差異を統一
Context API            → 認証状態のグローバル管理
fetch API              → バックエンドとのHTTP通信
localStorage           → トークン・カートデータの永続化
```

### 1.3 ディレクトリ構成

```
frontend/
├── Dockerfile              # Docker用ビルド設定
├── index.html              # SPAのエントリポイント（HTMLテンプレート）
├── package.json            # 依存関係・スクリプト
├── vite.config.js          # Vite設定
├── public/                 # 静的ファイル（faviconなど）
└── src/
    ├── main.jsx            # Reactアプリのエントリポイント（ルーティング定義）
    ├── index.css           # Viteデフォルトスタイル
    ├── components/         # 再利用可能なUIコンポーネント
    │   ├── Header.jsx         # 共通ヘッダー（ナビ・検索・ユーザーメニュー）
    │   ├── ProtectedRoute.jsx # 認証ガード（ログイン必須ルート）
    │   ├── LoadingSpinner.jsx # ローディング表示
    │   ├── FilterPanel.jsx    # 商品フィルターパネル
    │   ├── ProductCard.jsx    # 商品カード
    │   ├── Pagination.jsx     # ページネーション
    │   ├── UserForm.jsx       # ユーザー作成フォーム
    │   ├── UserItem.jsx       # ユーザー一覧アイテム
    │   └── EditForm.jsx       # ユーザー編集フォーム
    ├── contexts/           # React Context（グローバル状態）
    │   └── AuthContext.jsx    # 認証コンテキスト
    ├── hooks/              # カスタムフック
    │   ├── useProducts.js     # 商品一覧取得ロジック
    │   └── useCart.js         # カート管理ロジック
    ├── pages/              # ページコンポーネント
    │   ├── App.jsx            # レイアウト（Header + Outlet）
    │   ├── SelectRole.jsx     # ロール選択画面
    │   ├── LoginPage.jsx      # ログイン画面
    │   ├── RegisterPage.jsx   # 新規登録画面
    │   ├── AdminLoginPage.jsx # 管理者ログイン画面
    │   ├── Dashboard.jsx      # ダッシュボード
    │   ├── ProductList.jsx    # 商品一覧
    │   ├── ProductDetail.jsx  # 商品詳細
    │   ├── OrderList.jsx      # 注文一覧（プレースホルダー）
    │   └── UsersPage.jsx      # 管理者：ユーザー管理
    ├── services/           # API通信レイヤー
    │   ├── httpClient.js      # 汎用HTTPクライアント（fetch wrapper）
    │   ├── api.js             # ユーザーAPI
    │   ├── authAPI.js         # 認証API
    │   ├── productsAPI.js     # 商品API
    │   └── categoriesAPI.js   # カテゴリAPI
    ├── styles/             # CSSファイル
    │   ├── variables.css      # CSS変数（テーマカラー等）
    │   ├── global.css         # グローバルスタイル
    │   └── components.css     # コンポーネント用スタイル
    └── utils/              # ユーティリティ
        └── validators.js      # バリデーション関数
```

### 1.4 画面遷移図

```
/ (ロール選択)
├── /mypage/login        → ログイン
├── /mypage/register     → 新規登録
├── /mypage              → App レイアウト（Header + Outlet）
│   ├── /mypage          → Dashboard（要認証）
│   ├── /mypage/products → 商品一覧（要認証）
│   ├── /mypage/products/:id → 商品詳細（要認証）
│   └── /mypage/orders   → 注文一覧（要認証）
├── /admin/login         → 管理者ログイン
└── /admin               → ユーザー管理（要認証 + admin権限）
```

### 1.5 データフロー

```
[ユーザー操作]
    ↓
[ページ/コンポーネント] ← useAuth() で認証状態取得
    ↓
[サービス層] (productsAPI, authAPI 等)
    ↓
[HttpClient] (fetch + Bearer トークン自動付与)
    ↓
[バックエンドAPI] http://localhost:3000/api/...
```

---

## 2. Phase 1: プロジェクト初期構築

### 2.1 Viteでプロジェクト作成

```bash
# frontendフォルダを作成
mkdir frontend && cd frontend

# Vite + React プロジェクトを初期化
npm create vite@latest . -- --template react

# 依存パッケージをインストール
npm install

# 追加パッケージをインストール
npm install react-router-dom modern-normalize
```

**各パッケージの役割:**
- `react-router-dom`: URLに応じて表示するページを切り替える（SPA ルーティング）
- `modern-normalize`: ブラウザごとのCSSの差異を統一する（リセットCSS）

### 2.2 package.json

Vite が自動生成する `package.json` を確認し、以下の内容になっていることを確かめます。

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "modern-normalize": "^3.0.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^7.3.1"
  }
}
```

> **`"type": "module"` とは？**
> Node.js で ES Modules（`import/export`）を使うための設定です。React / Vite は ESM が標準です。

### 2.3 vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
```

**解説:**
- `defineConfig()`: Viteの設定関数。IDEの補完を効かせるために使います
- `react()`: JSX変換やReact Fast Refresh（コード変更時のホットリロード）を有効にするプラグイン

### 2.4 index.html（SPAのエントリポイント）

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**解説:**
- `<div id="root">`: ReactアプリがマウントされるDOM要素
- `<script type="module" src="/src/main.jsx">`: Viteが `main.jsx` を読み込んでアプリを起動
- SPAでは、この1つのHTMLファイルですべてのページを表示します

### 2.5 src/main.jsx（アプリのエントリポイント）

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// リセットCSS（一番最初に読み込む）
import "modern-normalize/modern-normalize.css";
import "./styles/global.css";
import "./styles/components.css";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";

// Pages
import SelectRole from "./pages/SelectRole";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import OrderList from "./pages/OrderList";
import UsersPage from "./pages/UsersPage";

// Components
import App from "./pages/App";
import ProtectedRoute from "./components/ProtectedRoute";

function RootApp() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 起動直後の選択画面（認証不要） */}
          <Route path="/" element={<SelectRole />} />

          {/* エンドユーザー: 認証関連（認証不要）*/}
          <Route path="/mypage/login" element={<LoginPage />} />
          <Route path="/mypage/register" element={<RegisterPage />} />

          {/* エンドユーザー: 保護されたルート */}
          <Route path="/mypage" element={<App />}>
            <Route
              index
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="products"
              element={
                <ProtectedRoute>
                  <ProductList />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/:id"
              element={
                <ProtectedRoute>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedRoute>
                  <OrderList />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 管理者: 認証関連（認証不要） */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* 管理者: 保護されたルート */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<div>ページが見つかりません</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RootApp />);
```

**重要ポイント解説:**

| 概念 | 説明 |
|------|------|
| `BrowserRouter as Router` | URLベースのルーティングを有効にする。`as Router` は短い別名 |
| `AuthProvider` | 認証状態をアプリ全体で共有するための Context Provider（後述） |
| `function RootApp()` | ルーティング全体を1つのコンポーネントにまとめて可読性を向上 |
| `Routes / Route` | URLパスとコンポーネントの対応を定義する |
| `ProtectedRoute` | ログインしていないユーザーをリダイレクトするガードコンポーネント |
| `redirectTo="/admin/login"` | 管理者向けルートでは管理者ログインページにリダイレクト |
| `path="products/:id"` | `:id` は動的パラメータ。`/products/5` なら `id=5` |
| `index` | 親ルート自体のパスにマッチする子ルート（`/mypage` → Dashboard） |

> **なぜ `App` をルーティング内に配置するのか？**
> `App` は「ヘッダー + コンテンツ領域」のレイアウトコンポーネントです。
> `/mypage` 配下のページはすべてこのレイアウト内で表示されます。
> 一方、ログイン画面やロール選択画面はヘッダー不要なので、`App` の外に配置しています。

---

## 3. Phase 2: 基盤レイヤー（HTTP通信・認証）

### 3.1 HTTPクライアント: src/services/httpClient.js

バックエンドAPIとの通信を一元管理するクラスです。すべてのAPI呼び出しがこのクラスを経由します。

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

class HttpClient {
  async request(method, endpoint, data = null, params = null) {
    let url = `${API_BASE}${endpoint}`;

    // クエリパラメータを追加
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    // ヘッダーの構築
    const headers = {
      "Content-Type": "application/json",
    }

    // localstorage からトークンを取得して自動付与
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers
    };

    if (data && ["POST", "PUT", "PATCH"].includes(method)) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error(`[${method} ${endpoint}] Error:`, err);
      throw err;
    }
  }

  get(endpoint, params = null) {
    return this.request("GET", endpoint, null, params);
  }

  post(endpoint, data) {
    return this.request("POST", endpoint, data);
  }

  put(endpoint, data) {
    return this.request("PUT", endpoint, data);
  }

  patch(endpoint, data) {
    return this.request("PATCH", endpoint, data);
  }

  delete(endpoint) {
    return this.request("DELETE", endpoint);
  }
}

export default new HttpClient();
```

**重要ポイント:**

| 概念 | 説明 |
|------|------|
| `import.meta.env.VITE_API_BASE_URL` | Viteの環境変数。`.env` ファイルで `VITE_` プレフィックスの変数を定義すると使用可能 |
| `Bearer ${token}` | JWT認証で使われる標準的なヘッダー形式 |
| `localStorage.getItem("token")` | ブラウザに保存されたトークンを取得 |
| `request(method, endpoint, data, params)` | 全HTTPメソッドの共通処理。メソッド名を第1引数で受け取る |
| `export default new HttpClient()` | アプリ全体で1つのインスタンスを共有（シングルトン） |
| `response.status === 204` | DELETEリクエストなど、レスポンスボディが空の場合の処理 |

### 3.2 認証API: src/services/authAPI.js

```js
import httpClient from "./httpClient";

export const authAPI = {
  register: (name, email, password) =>
    httpClient.post("/auth/register", { name, email, password }),

  login: (email, password) =>
    httpClient.post("/auth/login", { email, password }),

  getMe: () => httpClient.get("/auth/me"),

  logout: () => httpClient.post("/auth/logout"),
};
```

### 3.3 商品API: src/services/productsAPI.js

```js
import httpClient from "./httpClient";

/**
 * 商品関連のAPI呼び出し
 */
export const productsAPI = {
  // 製品一覧取得（フィルター・ページング対応）
  getList: async (filters = {}) => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      sort: filters.sort || "created_at",
      order: filters.order || "asc",
    };

    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.search) params.search = filters.search;
    if (filters.is_featured !== undefined)
      params.is_featured = filters.is_featured;

    return httpClient.get("/products", params);
  getPopular: async (limit = 10) => {
    return httpClient.get("/products/popular", { limit });
  },

  // 製品詳細取得
  getDetail: async (id) => {
    return httpClient.get(`/products/${id}`);
  },

  // 製品作成
  create: async (productData) => {
    return httpClient.post("/products", productData);
  },

  // 製品更新
  update: async (id, updates) => {
    return httpClient.put(`/products/${id}`, updates);
  },

  // 製品削除
  delete: async (id) => {
    return httpClient.delete(`/products/${id}`);
  },
};
```

### 3.4 カテゴリAPI: src/services/categoriesAPI.js

```js
import httpClient from "./httpClient";

export const categoriesAPI = {
  // 全カテゴリー取得
  getAll: async () => {
    return httpClient.get("/products/categories");
  },

  // アクティブなカテゴリーのみ取得
  getActive: async () => {
    return httpClient.get("/products/categories", { is_active: true });
  },
};
```

### 3.5 ユーザーAPI: src/services/api.js

```js
import httpClient from "./httpClient";

// ユーザー一覧取得
export const fetchUsers = async () => {
  const response = await httpClient.get("/users");
  return response.data;
};

// ユーザー詳細取得
export const fetchUser = async (id) => {
  const response = await httpClient.get(`/users/${id}`);
  return response.data;
};

// ユーザー作成
export const createUser = async (name, email) => {
  const response = await httpClient.post("/users", { name, email });
  return response.data;
};

// ユーザー更新（全置き換え）
export const updateUser = async (id, name, email) => {
  const response = await httpClient.put(`/users/${id}`, { name, email });
  return response.data;
};

// ユーザー部分更新
export const patchUser = async (id, fields) => {
  const response = await httpClient.patch(`/users/${id}`, fields);
  return response.data;
};

// ユーザー削除
export const deleteUser = async (id) => {
  return httpClient.delete(`/users/${id}`);
};
```

> **`response.data` のアンラップについて:**
> バックエンドAPIは `{ data: [...] }` の形でレスポンスを返すことがあります。
> このサービス層で `response.data` を取り出しておくことで、コンポーネント側では直接データを使えます。

### 3.6 認証コンテキスト: src/contexts/AuthContext.jsx

React Context を使って、アプリ全体で認証状態（ログインユーザー情報、トークン）を共有します。

```jsx
import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/authAPI";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  // 初回ロード時: トークンがあれば現在のユーザー情報を取得
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        setUser(response.data.user);
      } catch (err) {
        console.error("Auth initialization error", err);
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]);

  // ログイン
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);

      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem("token", response.data.token);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  };

  // ユーザー登録
  const register = async (name, email, password) => {
    try {
      const response = await authAPI.register(name, email, password);

      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem("token", response.data.token);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.warn("Logout request failed", err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// カスタムフック: useAuth()
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
```

**Context パターンの解説:**

```
                       AuthProvider（状態を管理）
                       ┌──────────────────────┐
                       │ user, token, login()  │
                       │ register(), logout()  │
                       └──────────┬───────────┘
                                  │ value={...}
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              LoginPage      Dashboard      Header
              useAuth()      useAuth()      useAuth()
              → login()      → user.name   → logout()
```

> **login/register の戻り値パターン:**
> エラー時に例外を投げるのではなく `{ success: false, error }` を返すパターンを採用しています。
> これにより、呼び出し側で try-catch を書かなくても `if (!result.success)` でエラー処理できます。

### 3.7 認証ガード: src/components/ProtectedRoute.jsx

ログインしていないユーザーを自動的にログインページへリダイレクトします。

```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * 認証が必要なルートを保護するコンポーネント
 * @param {Object} props
 * @param {React.ReactNode} props.children - 保護するコンポーネント
 * @param {string} props.requiredRole - 必要な役割('user' または 'admin')省略時は認証のみ
 * @param {string} props.redirectTo - リダイレクト先(省略時は /mypage/login)
 */
const ProtectedRoute = ({
  children,
  requiredRole,
  redirectTo = "/mypage/login",
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // 認証確認中はローディング表示
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  // 未認証の場合はログインページへ
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // 役割チェック(requiredRole が指定されている場合)
  if (requiredRole && user?.role !== requiredRole) {
    // 権限不足の場合は403ページまたはホームへ
    return (
      <div className="error-page">
        <h1>アクセス権限がありません</h1>
        <p>このページにアクセスする権限がありません</p>
      </div>
    );
  }

  // 認証済み & 権限OK → 子コンポーネント表示
  return children;
};

export default ProtectedRoute;
```

**使い方（main.jsx のルーティング内）:**
```jsx
{/* 一般ユーザー向け認証ガード */}
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

{/* 管理者権限が必要なルート */}
<ProtectedRoute requiredRole="admin">
  <UsersPage />
</ProtectedRoute>
```

### 3.8 ローディングスピナー: src/components/LoadingSpinner.jsx

```jsx
const LoadingSpinner = () => {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
```

> `role="status"` と `aria-live="polite"` はスクリーンリーダーに「状態表示」であることを伝えるアクセシビリティ属性です。`sr-only` クラスは視覚的には非表示ですが、スクリーンリーダーには読み上げられます。

---

## 4. Phase 3: 認証画面の実装

### 4.1 ロール選択画面: src/pages/SelectRole.jsx

アプリのトップページ。「エンドユーザー」か「管理者」かを選択します。

```jsx
import { useNavigate } from "react-router-dom";

const SelectRole = () => {
    const navigate = useNavigate();

    return ( 
        <div className="role-select-page">
            <h1>どちらで利用しますか？</h1>
            <div className="role-select-actions">
                <button className="btn btn-primary" onClick={() => navigate("/mypage/login")}>
                    エンドユーザー
                </button>
                <button className="btn btn-primary" onClick={() => navigate("/admin/login")}>
                    管理者
                </button>
            </div>
        </div>
    )
}

export default SelectRole;
```

**ポイント:**
- `useNavigate()` はReact Router のフックで、プログラム的にページ遷移を行います
- ボタンクリックで `navigate("/パス")` を呼ぶと、そのURLに遷移します

### 4.2 ログインページ: src/pages/LoginPage.jsx

```jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    setIsLoading(false);

    if (result.success) {
      navigate("/mypage");
    } else {
      setError(result.error || "ログインに失敗しました");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ログイン</h1>
        <p className="auth-subtitle">エンドユーザーでログイン</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={isLoading}
          >
            {isLoading ? "ログイン中" : "ログイン"}
          </button>
        </form>

        <p className="auth-link">
          アカウントを持ちでない方は{" "}
          <Link to="/mypage/register">こちらから登録</Link>
        </p>

        <p className="auth-link">
          <Link to="/">役割選択に戻る</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
```

**login の戻り値パターン:**

```
AuthContext の login() は { success, error } を返す:
  - 成功時: { success: true }
  - 失敗時: { success: false, error: "エラーメッセージ" }

呼び出し側は try-catch ではなく result.success で分岐する:
  const result = await login(email, password);
  if (result.success) navigate("/mypage");
  else setError(result.error);
```

### 4.3 新規登録ページ: src/pages/RegisterPage.jsx

```jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // バリデーション: パスワード一致確認
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    // バリデーション: パスワード強度
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    setIsLoading(true);

    const result = await register(name, email, password);

    setIsLoading(false);

    if (result.success) {
      navigate("/mypage");
    } else {
      setError(result.error || "登録に失敗しました");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ユーザー登録</h1>
        <p className="auth-sbtitle">新規アカウントを作成</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">お名前</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="deloitte 太郎"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード（8文字以上）</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード（確認）</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={isLoading}
          >
            {isLoading ? "登録中..." : "登録"}
          </button>
        </form>

        <p className="auth-link">
          すでにアカウントを持ちの方は <Link to="/mypage/login"></Link>
        </p>

        <p className="auth-link">
          <Link to="/">← 役割選択に戻る</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
```

**バリデーションのポイント:**
- **クライアント側**（フロントエンド）: パスワード一致チェック、最小文字数チェック → UXの向上
- **サーバー側**（バックエンド）: メールの重複チェック、データベースへの保存前検証 → セキュリティ

必ず**両方**でバリデーションを行います（クライアント側は簡単に回避できるため）。

### 4.4 管理者ログインページ: src/pages/AdminLoginPage.jsx

```jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    setIsLoading(false);

    if (result.success) {
      // ログイン成功後、roleを確認
      // user は AuthContext で自動更新されるため、少し待つ
      setTimeout(() => {
        if (user?.role === "admin") {
          navigate("/admin");
        } else {
          setError("管理者アカウントでログインしてください");
        }
      }, 1000);
    } else {
      setError(result.error || "ログインに失敗しました");
    }
  };

  return (
    <div className="auth-page admin-auth-page">
      <div className="auth-container">
        <h1>管理者ログイン</h1>
        <p className="auth-subtitle">管理者アカウントでログイン</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={isLoading}
          >
            {isLoading ? "ログイン中..." : "管理者ログイン"}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/">← 役割選択に戻る</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
```

> **`setTimeout(1000)` について:** React の状態更新は非同期で行われます。`login()` の後すぐに `navigate()` すると、状態がまだ更新されていない場合があるため、少し待機しています。本番環境では `useEffect` を使ったより適切な方法を検討してください。

---

## 5. Phase 4: EC機能の実装（商品・注文）

### 5.1 レイアウトコンポーネント: src/pages/App.jsx

認証済みページの共通レイアウトです。全ページ共通のヘッダーを表示し、子ルートを `<Outlet />` で描画します。

```jsx
import { Outlet } from "react-router-dom";
import Header from "../components/Header";

const App = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default App;
```

**ポイント:**

| 要素 | 説明 |
|------|------|
| `<Header />` | 全ページ共通のナビゲーションバー |
| `<Outlet />` | react-router-dom の機能。子ルートのコンポーネントがここに描画される |
| `app-layout` | CSS で `min-height: 100vh` + flexbox を適用し、画面全体を使うレイアウト |

> **なぜ `App` を `pages/` に置くのか？**
> `App` はルーティング定義（`main.jsx`）内で `<Route element={<App />}>` として使われるレイアウトコンポーネントです。ログイン画面やロール選択画面はヘッダー不要なので `App` の外に配置し、認証済みページだけ `App` 内にネストすることで、ヘッダーの表示・非表示を制御しています。

### 5.2 ヘッダー: src/components/Header.jsx

全ページ共通のナビゲーションバーです。

```jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "../styles/components.css";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    // ProductList に検索クエリを渡す
    window.location.href = `/mypage/products?search=${encodeURIComponent(searchQuery)}`;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* ロゴ */}
        <Link to="/mypage" className="logo">
          🛍️ E-Commerce
        </Link>

        {/* 検索フォーム */}
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="製品を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary">
            検索
          </button>
        </form>

        {/* ナビゲーション */}
        <nav className="header-nav">
          <Link to="/mypage">ホーム</Link>
          <Link to="/mypage/products">製品</Link>
          <Link to="/mypage/orders">注文</Link>

          {/* ユーザー情報 */}
          {user && (
            <div className="user-menu">
              <span className="user-name">👤 {user.name}</span>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                ログアウト
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
```

### 5.3 ダッシュボード: src/pages/Dashboard.jsx

ログイン後のトップページ。人気商品を表示します。

```jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productsAPI } from "../services/productsAPI";
import LoadingSpinner from "../components/LoadingSpinner";

const Dashboard = () => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 人気商品を取得
    const fetchPopularProducts = async () => {
      try {
        const response = await productsAPI.getPopular(8); // 8件取得
        setPopularProducts(response.data || []);
      } catch (err) {
        console.error("Failed to fetch popular products:", err);
        setError("人気商品の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchPopularProducts();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="dashboard-page">
      <h1>ホーム</h1>
      <p className="dashboard-subtitle">よく検索される製品をご紹介します</p>

      {error && <div className="error-message">{error}</div>}

      {/** 人気製品セクション */}
      <section className="popular-products-section">
        <div className="section-header">
          <h2>🔥 人気製品</h2>
          <Link to="/mypage/products" className="view-all-link">
            全ての製品を見る →
          </Link>
        </div>

        {popularProducts.length === 0 ? (
          <p>現在、人気製品はありません</p>
        ) : (
          <div className="popular-products-grid">
            {popularProducts.map((product) => (
              <Link
                key={product.id}
                to={`/mypage/products/${product.id}`}
                className="popular-product-card"
              >
                <div className="product-image">
                  <img
                    src={product.image_url || "/placeholder.jpg"}
                    alt={product.name}
                  />
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-price">
                    ¥{Number(product.price).toLocaleString()}
                  </p>
                  <div className="product-meta">
                    <span className="rating">
                      ⭐️{" "}
                      {product.rating
                        ? Number(product.rating).toFixed(1)
                        : "未評価"}
                    </span>
                    {product.view_count && (
                      <span className="view-count">
                        👀 {product.view_count.toLocaleString()} 回閲覧
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/** 追加のセクション（オプション） */}
      <section className="dashboard-info">
        <div className="info-card">
          <h3>🎁 新着製品</h3>
          <p>最新の製品をチェック</p>
          <Link to="/mypage/products?sort=created_at&order=desc" className="btn btn-outline">
            新着を見る
          </Link>
        </div>
        <div className="info-card">
          <h3>⭐️ 高評価製品</h3>
          <p>レビュー評価の高い製品</p>
          <Link to="/mypage/products?sort=rating&order=desc" className="btn btn-outline">
            高評価を見る
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
```

### 5.4 カスタムフック: src/hooks/useProducts.js

商品一覧の取得ロジックを再利用可能なフックとして切り出します。

```js
import { useState, useEffect } from "react";
import { productsAPI } from "../services/productsAPI";

const useProducts = (initialFilters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); // 初回ロード時はtrue
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
    limit: 20,
  });
  const [filters, setFilters] = useState(initialFilters);

  // 製品取得
  const fetchProducts = async (newFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const mergedFilters = {
        ...filters,
        ...newFilters,
        page: newFilters.page || filters.page || 1,
      };
      
      const response = await productsAPI.getList(mergedFilters);

      setProducts(response.data || []);
      setPagination(response.pagination || { page: 1, total: 0, pages: 0, limit: 20 });
      setFilters({ ...filters, ...newFilters });
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    loading,
    error,
    pagination,
    filters,
    fetchProducts,
  };
};

export default useProducts;
```

**カスタムフックとは？**
- `use` で始まる関数で、React の状態管理ロジックを再利用可能にするパターンです
- コンポーネントから状態管理のロジックを分離し、テスタビリティと可読性を向上させます

### 5.5 カートフック: src/hooks/useCart.js

localStorage を使ったカート機能です。

```js
import { useState, useEffect } from "react";

const useCart = () => {
  // localStorage から復元
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  // cartが変更されたら localStorage に保存
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addItem = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        // 既存商品：数量を増加
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // 新規商品を追加
        return [...prev, { ...product, quantity }];
      }
    });
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clear = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items: cart,
    count: cart.length,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  };
};

export default useCart;
```

**`useState(() => {...})` とは？**
- `useState` に関数を渡す「遅延初期化」パターンです
- `localStorage.getItem` のような処理は初回レンダリング時に一度だけ実行されます
- 毎回のレンダリングで無駄にlocalStorageを読む事を防ぎます

### 5.6 フィルターパネル: src/components/FilterPanel.jsx

商品一覧ページのサイドバーに表示されるフィルター機能です。

```jsx
import { useState, useEffect } from "react";
import { categoriesAPI } from "../services/categoriesAPI";
import { validatePriceRange } from "../utils/validators";

const FilterPanel = ({ onFilter }) => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category_id: null,
    min_price: null,
    max_price: null,
    sort: "created_at",
  });
  const [priceError, setPriceError] = useState(null);

  // カテゴリー読み込み
  useEffect(() => {
    categoriesAPI
      .getActive()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // 価格入力時のみバリデーション
    if (key === "min_price" || key === "max_price") {
      const validation = validatePriceRange(
        newFilters.min_price,
        newFilters.max_price,
      );

      if (!validation.isValid) {
        setPriceError(validation.error);
        return;
      } else {
        setPriceError(null);
      }
    }
  };

  // 「適用」押下時にのみフィルター実行
  const handleApplyFilter = () => {
    const validation = validatePriceRange(filters.min_price, filters.max_price);
    if (!validation.isValid) {
      setPriceError(validation.error);
      return;
    }

    setPriceError(null);
    onFilter(filters);
  };

  return (
    <aside className="filter-panel">
      <h3>フィルター</h3>

      {/* カテゴリー */}
      <div className="filter-group">
        <label>カテゴリー</label>
        <select
          value={filters.category_id || ""}
          onChange={(e) =>
            handleFilterChange("category_id", e.target.value || null)
          }
        >
          <option value="">すべて</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 価格帯 */}
      <div className="filter-group">
        <label>価格帯</label>
        <div className="price-inputs">
          <input
            type="number"
            placeholder="最小"
            value={filters.min_price || ""}
            onChange={(e) =>
              handleFilterChange(
                "min_price",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            min="0"
            step="100"
          />
          <span>～</span>
          <input
            type="number"
            placeholder="最大"
            value={filters.max_price || ""}
            onChange={(e) =>
              handleFilterChange(
                "max_price",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            min="0"
            step="100"
          />
        </div>
        {/** エラーメッセージ表示 */}
        {priceError && (
          <p className="validation-error">{priceError}</p>
        )}
      </div>

      {/* ソート */}
      <div className="filter-group">
        <label>並び順</label>
        <select
          value={filters.sort}
          onChange={(e) => handleFilterChange("sort", e.target.value)}
        >
          <option value="created_at">新着順</option>
          <option value="price">安い順</option>
          <option value="rating">評価が高い</option>
        </select>
      </div>

      {/** 適用ボタン（カテゴリー・価格帯・ソートを一括適用） */}
      <button 
        className="btn btn-primary full-width"
        onClick={handleApplyFilter}
        disabled={Boolean(priceError)}>
          フィルターを適用
      </button>

      {/* リセット */}
      <button
        className="btn btn-outline full-width"
        onClick={() => {
          const resetFilters = {
            category_id: null,
            min_price: null,
            max_price: null,
            sort: "created_at",
          };
          setFilters(resetFilters);
          setPriceError(null);
          onFilter(resetFilters);
        }}
      >
        フィルターをリセット
      </button>
    </aside>
  );
};

export default FilterPanel;
```

### 5.7 商品カード: src/components/ProductCard.jsx

商品一覧で使用する個別商品のカードコンポーネントです。

```jsx
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  const handleAddToCart = (e) => {
    e.preventDefault();
    // カート機能（後で実装）
    alert(`${product.name} をカートに追加しました`);
  };

  return (
    <div className="product-card">
      {/* 画像 */}
      <div className="product-image">
        <Link to={`/mypage/products/${product.id}`}>
          <img
            src={product.image_url || "/placeholder.jpg"}
            alt={product.name}
          />
        </Link>
        {product.is_featured && (
          <span className="badge-featured">おすすめ</span>
        )}
      </div>

      {/* 情報 */}
      <div className="product-info">
        <Link to={`/mypage/products/${product.id}`} className="product-name">
          <h3>{product.name}</h3>
        </Link>

        {/* 価格・レーティング */}
        <div className="product-meta">
          <span className="price">¥{Number(product.price).toLocaleString()}</span>
          <div className="rating">
            ★ {product.rating ? Number(product.rating).toFixed(1) : "未評価"}
            <span className="reviews-count">
              ({product.reviews_count || 0})
            </span>
          </div>
        </div>

        {/* 説明 */}
        <p className="product-description">
          {product.description?.slice(0, 50)}...
        </p>

        {/* アクション */}
        <button className="btn btn-primary" onClick={handleAddToCart}>
          {product.stock > 0 ? "カートに追加" : "売り切れ"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
```

**ポイント:**
- `Number(product.price).toLocaleString()`: 数値を3桁区切りで表示（例: `1,280`）
- `product.description?.slice(0, 50)`: オプショナルチェーン（`?`）で null 安全にアクセス
- `is_featured` が `true` の場合のみ「おすすめ」バッジを表示
- `product.stock > 0` で在庫の有無によりボタンテキストを切り替えます

### 5.8 ページネーション: src/components/Pagination.jsx

```jsx
const Pagination = ({ page, pages, onPageChange }) => {
  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5; // 表示する最大ページ数
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // 前へ
    buttons.push(
      <button
        key="prev"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="btn-pagination"
      >
        ← 前へ
      </button>
    );

    // ページ番号
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`btn-pagination ${i === page ? "active" : ""}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }

    // 次へ
    buttons.push(
      <button
        key="next"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
        className="btn-pagination"
      >
        次へ →
      </button>
    );

    return buttons;
  };

  return (
    <div className="pagination">
      {renderPageButtons()}
      <span className="pagination-info">
        ページ {page} / {pages}
      </span>
    </div>
  );
};

export default Pagination;
```

### 5.9 商品一覧ページ: src/pages/ProductList.jsx

フィルター・検索・ページネーションを統合した商品一覧ページです。

```jsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import useProducts from "../hooks/useProducts";
import FilterPanel from "../components/FilterPanel";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/components.css";

const ProductList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading, error, pagination, fetchProducts } = useProducts({
    search: searchParams.get("search") || undefined,
    sort: searchParams.get("sort") || undefined,
    order: searchParams.get("order") || undefined,
  });

  const handleFilter = async (filters) => {
    await fetchProducts({ ...filters, page: 1 });
  };

  const handlePageChange = async (page) => {
    await fetchProducts({ page });
  };

  if (error) {
    return <div className="error-message">エラー: {error}</div>;
  }

  return (
    <div className="product-list-page">
      <h1>製品一覧</h1>

      <div className="product-list-container">
        {/* フィルタパネル */}
        <FilterPanel onFilter={handleFilter} />

        {/* メインコンテンツ */}
        <main className="product-main">
          {loading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <p>製品が見つかりません</p>
          ) : (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <Pagination
                  page={pagination.page}
                  pages={pagination.pages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductList;
```

**データの流れ:**
```
ProductList（ページ）
├── FilterPanel → handleFilter() → fetchProducts() → API呼び出し → 再レンダリング
├── ProductCard × N件
└── Pagination → handlePageChange() → fetchProducts({ page: N })
```

### 5.10 商品詳細ページ: src/pages/ProductDetail.jsx

```jsx
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { productsAPI } from "../services/productsAPI";
import useCart from "../hooks/useCart";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    productsAPI
      .getDetail(parseInt(id))
      .then(setProduct)
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      alert(`${product.name} を ${quantity} 個カートに追加しました`);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!product) return <div>製品が見つかりません</div>;

  return (
    <div className="product-detail-page">
      <div className="detail-container">
        {/* 画像 */}
        <div className="detail-image">
          <img
            src={product.image_url || "/placeholder.jpg"}
            alt={product.name}
          />
        </div>

        {/* 情報 */}
        <div className="detail-info">
          <h1>{product.name}</h1>
          <div className="detail-meta">
            <span className="price">¥{Number(product.price).toLocaleString()}</span>
            <span className="rating">
              ⭐ {product.rating ? Number(product.rating).toFixed(1) : "未評価"} ({product.reviews_count || 0}件)
            </span>
          </div>

          <p className="description">{product.description}</p>

          <div className="detail-stock">
            在庫: {product.stock > 0 ? `${product.stock}個` : "売り切れ"}
          </div>

          {/* 数量・カート */}
          <div className="detail-actions">
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value)))
              }
              disabled={product.stock === 0}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              カートに追加
            </button>
          </div>

          {/* 関連製品 */}
          {product.similar_products && product.similar_products.length > 0 && (
            <div className="similar-products">
              <h3>関連製品</h3>
              <div className="similar-grid">
                {product.similar_products.map((related) => (
                  <div key={related.id} className="similar-item">
                    <img
                      src={related.image_url || "/placeholder.jpg"}
                      alt={related.name}
                    />
                    <p>{related.name}</p>
                    <span>¥{related.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
```

### 5.11 注文一覧ページ: src/pages/OrderList.jsx

現在はプレースホルダーです。

```jsx
const OrderList = () => {
  return (
    <div className="order-list-page">
      <h1>注文一覧</h1>
      <p>注文履歴をここに表示します。</p>
    </div>
  );
};

export default OrderList;
```

> **将来の拡張:** バックエンドの注文APIと連携して、注文一覧の取得・表示を実装できます。

---

## 6. Phase 5: 管理者画面の実装

### 6.1 ユーザー管理ページ: src/pages/UsersPage.jsx

管理者がユーザーのCRUD操作を行うページです。

```jsx
import { useState, useEffect } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/api";
import UserForm from "../components/UserForm";
import UserItem from "../components/UserItem";
import EditForm from "../components/EditForm";

const UsersPage = () => {
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
    <div className="users-page">
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
    </div>
  );
};

export default UsersPage;
```

### 6.2 ユーザー作成フォーム: src/components/UserForm.jsx

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

### 6.3 ユーザー編集フォーム: src/components/EditForm.jsx

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

**UserForm と EditForm の違い:**
- `UserForm`: 空のフォーム → 新規作成。送信後にフォームをクリア
- `EditForm`: 既存データで初期化 → 更新。キャンセルボタンあり

### 6.4 ユーザーアイテム: src/components/UserItem.jsx

```jsx
const UserItem = ({ user, onEdit, onDelete }) => {
  const handleDelete = async () => {
    if (window.confirm(`${user.name} を削除しますか？`)) {
      await onDelete(user.id);
    }
  };

  return (
    <li>
      <span>
        {user.name} ({user.email})
      </span>
      <button onClick={() => onEdit(user)}>編集</button>
      <button onClick={handleDelete} style={{ color: "red" }}>
        削除
      </button>
    </li>
  );
};

export default UserItem;
```

---

## 7. Phase 6: スタイリング（CSS）

### 7.1 CSS変数: src/styles/variables.css

テーマカラーやスペーシングを変数として一元管理します。

```css
/* CSS Custom Properties（変数） */
:root {
  /* Colors */
  --primary-color: #007bff;
  --primary-dark: #0056b3;
  --primary-light: #e7f1ff;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --dark-color: #212529;
  --light-color: #f8f9fa;
  --gray-color: #6c757d;
  --border-color: #dee2e6;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-xxl: 3rem;

  /* Typography */
  --font-family-base: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  --font-size-base: 1rem;
  --font-size-sm: 0.875rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --line-height-base: 1.5;

  /* Border Radius */
  --border-radius: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 1rem;

  /* Transitions */
  --transition: all 0.3s ease-in-out;
}
```

**CSS変数の使い方:**
```css
.box {
  padding: var(--spacing-md);        /* → 1rem */
  background-color: var(--primary-color); /* → #007bff */
  border-radius: var(--border-radius);    /* → 0.25rem */
}
```

> テーマカラーを変更したい場合、`variables.css` の値を変えるだけで、アプリ全体に反映されます。

### 7.2 グローバルスタイル: src/styles/global.css

```css
/* modern-normalize がベースを整えるため最小限のリセット */

html,
body {
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #212529;
  background-color: #f8f9fa;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

### 7.3 コンポーネントスタイル: src/styles/components.css

> ファイルが約900行あるため、主要なセクションを解説します。

```css
@import "./variables.css";

/* ===== ボタン ===== */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  font-weight: 500;
}
.btn-primary { background-color: var(--primary-color); color: white; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
.btn-outline { border: 1px solid var(--primary-color); color: var(--primary-color); background: transparent; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== レイアウト ===== */
.app-layout { min-height: 100vh; display: flex; flex-direction: column; }
.app-content { flex: 1; max-width: 1400px; width: 100%; margin: 0 auto; padding: var(--spacing-xl); }

/* ===== ヘッダー ===== */
.app-header { background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 1000; }

/* ===== 商品カード ===== */
.product-card { background: white; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); overflow: hidden; transition: var(--transition); }
.product-card:hover { box-shadow: 0 8px 16px rgba(0,0,0,0.1); transform: translateY(-4px); }

/* ===== 商品一覧レイアウト ===== */
.product-list-container { display: grid; grid-template-columns: 250px 1fr; gap: var(--spacing-xl); }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg); }

/* ===== ページネーション ===== */
.pagination { display: flex; justify-content: center; gap: var(--spacing-sm); margin: var(--spacing-lg) 0; }
.btn-pagination.active { background-color: var(--primary-color); color: white; }

/* ===== ローディングスピナー ===== */
.spinner { border: 4px solid var(--light-color); border-top: 4px solid var(--primary-color); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* ===== 認証ページ ===== */
.auth-page { min-height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.auth-container { background: white; padding: var(--spacing-xxl); border-radius: var(--border-radius-lg); max-width: 450px; width: 100%; }
.admin-auth-page { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }

/* ===== ロール選択 ===== */
.role-select-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.role-select-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-xl); }

/* ===== レスポンシブ ===== */
@media (max-width: 768px) {
  .product-list-container { grid-template-columns: 1fr; }
  .detail-container { grid-template-columns: 1fr; }
  .header-container { flex-direction: column; }
}
```

> **完全なCSSファイル** は実際のソースコードを参照してください。ここでは各セクションの概要を示しています。

### 7.4 index.css

Vite が自動生成するデフォルトのスタイルです。`global.css` と `components.css` が実際のスタイルを担うため、このファイルは最小限の内容で構いません。

---

## 8. Phase 7: Docker対応

### 8.1 バリデーションユーティリティ: src/utils/validators.js

Docker前に、残りのユーティリティファイルを実装します。

```js
/**
 * 価格バリデーション関数
 * @param {number|string} minPrice - 最小価格
 * @param {number|string} maxPrice - 最大価格
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validatePriceRange = (minPrice, maxPrice) => {
  const min = minPrice ? parseFloat(minPrice) : null;
  const max = maxPrice ? parseFloat(maxPrice) : null;

  // 両方未入力はOK（フィルタなし）
  if (min === null && max === null) {
    return { isValid: true, error: null };
  }

  // 負の数値チェック
  if (min !== null && min < 0) {
    return { isValid: false, error: "最小価格は0以上で入力してください" };
  }
  if (max !== null && max < 0) {
    return { isValid: false, error: "最大価格は0以上で入力してください" };
  }

  // 最小 > 最大のチェック
  if (min !== null && max !== null && min > max) {
    return { isValid: false, error: "最小価格は最大価格以下にしてください" };
  }

  // 極端に大きな値のチェック（1億円以上）
  const MAX_PRICE_LIMIT = 100000000;
  if (min !== null && min > MAX_PRICE_LIMIT) {
    return { isValid: false, error: `最小価格は${MAX_PRICE_LIMIT.toLocaleString()}円以下にしてください` };
  }
  if (max !== null && max > MAX_PRICE_LIMIT) {
    return { isValid: false, error: `最大価格は${MAX_PRICE_LIMIT.toLocaleString()}円以下にしてください` };
  }

  return { isValid: true, error: null };
};

/**
 * 数値入力バリデーション（汎用）
 * @param {number|string} value - 数値
 * @param {Object} options - { min, max, required }
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateNumber = (value, options = {}) => {
  const { min = 0, max = Infinity, required = false } = options;

  // 未入力チェック
  if (value === "" || value === null || value === undefined) {
    if (required) {
      return { isValid: false, error: "この項目は必須です" };
    }
    return { isValid: true, error: null };
  }

  const num = parseFloat(value);

  // 数値チェック
  if (isNaN(num)) {
    return { isValid: false, error: "数値を入力してください" };
  }

  // 範囲チェック
  if (num < min) {
    return { isValid: false, error: `${min}以上の値を入力してください` };
  }
  if (num > max) {
    return { isValid: false, error: `${max}以下の値を入力してください` };
  }

  return { isValid: true, error: null };
};
```

### 8.2 Dockerfile

マルチステージビルドで、開発環境と本番環境を効率的に管理します。

```dockerfile
# ===== ステージ1: ビルド =====
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係のインストール（キャッシュ最適化のためpackage.jsonのみ先にコピー）
COPY package.json package-lock.json ./
RUN npm ci

# ソースコードをコピーしてビルド
COPY . .
RUN npm run build

# ===== ステージ2: 本番 =====
FROM node:20-alpine

WORKDIR /app

# serve パッケージをインストール（静的ファイル配信用）
RUN npm install -g serve

# ビルド成果物のみコピー（ソースコード不要）
COPY --from=builder /app/dist ./dist

# ポート3000で公開
EXPOSE 3000

# 静的ファイルを配信
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**マルチステージビルドの解説:**

```
ステージ1（builder）                   ステージ2（本番）
┌────────────────────┐              ┌────────────────────┐
│ node_modules/      │              │                    │
│ src/               │  ビルド成果物  │ dist/              │
│ package.json       │ ──────────→  │   index.html       │
│ vite.config.js     │  のみコピー   │   assets/          │
│ dist/  ← npm run build           │                    │
│   index.html       │              │ serve（静的配信）    │
│   assets/          │              └────────────────────┘
└────────────────────┘              サイズ: 約50MB
サイズ: 約500MB+
```

**メリット:**
- 本番イメージにソースコード・node_modules が含まれないため、セキュリティとサイズの面で優れている
- `serve -s dist`: `-s` は SPA モードで、未知のURLを全て `index.html` にフォールバックする

### 8.3 環境変数の設定

開発時に `.env` ファイルをフロントエンドのルートに配置します。

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api
```

> **重要:** Vite では `VITE_` プレフィックスが付いた変数のみがクライアントに公開されます。
> 機密情報（APIキー等）は `VITE_` で始めないでください。

---

## 9. Phase 8: クエリパラメータバリデーション（フロントエンド側）

バックエンド側のクエリバリデーション（Phase 5 の 7.2 節で実装済み）に加え、フロントエンドでもURLクエリパラメータを検証します。これにより、不正なURLに対して即座にエラーを表示でき、無駄なAPI通信を防ぎます。

### 9.1 この Phase で学べること

| テーマ | 学習内容 |
|---|---|
| **多層防御** | フロントエンド＋バックエンドの二重バリデーション |
| **URLSearchParams** | ブラウザURL操作とクエリパラメータ管理 |
| **カスタムフックの拡張** | 既存フックにバリデーション機能を追加 |
| **ユーザーフレンドリーなエラー** | バリデーションエラー時のUI表示 |

### 9.2 フロントエンド側でもバリデーションが必要な理由

バックエンドでバリデーションを実装しましたが、フロントエンドにも追加する理由：

```
❌ バックエンドだけ: 不正URL → ネットワーク通信 → 400エラー → ユーザーにエラー表示
✅ フロント+バック: 不正URL → フロントで即ブロック → ネットワーク通信なし → 高速レスポンス
```

1. **UX向上:** ネットワーク往復を待たず即座にエラー表示できる
2. **サーバー負荷軽減:** 明らかに不正なリクエストがサーバーに到達しない
3. **多層防御:** バックエンドのバリデーションが何らかの理由で突破されても、フロントが第一防御線として機能する

> **重要:** フロントエンドのバリデーションは「UX向上」が目的であり、セキュリティの主防御はバックエンドです（フロントエンドは開発者ツールでバイパス可能なため）。

#### 手順 8-1: クエリバリデータの作成

##### ファイル: `frontend/src/utils/queryValidator.js`（新規作成）

```javascript
/**
 * クエリパラメータバリデーション（フロントエンド版）
 *
 * - バックエンドの queryValidator.js と許可値を合わせること
 * - クエリパラメータの正当性を検証し、不正な値を排除する
 */

// バックエンドと同一のホワイトリストを定義
const ALLOWED_SORT_FIELDS = ["price", "rating", "created_at"];
const ALLOWED_ORDER_DIRECTIONS = ["asc", "desc"];

/**
 * URLSearchParams からクエリパラメータを検証する
 *
 * @param {URLSearchParams} searchParams - useSearchParams() で取得したパラメータ
 * @returns {{ isValid: boolean, errors: string[], sanitized: Object }}
 *
 * 使用例:
 *   const [searchParams] = useSearchParams();
 *   const { isValid, errors, sanitized } = validateQueryParams(searchParams);
 */
export const validateQueryParams = (searchParams) => {
  const errors = [];
  const sanitized = {};

  // --- sort ---
  const sort = searchParams.get("sort");
  if (sort !== null) {
    if (!ALLOWED_SORT_FIELDS.includes(sort.toLowerCase())) {
      errors.push(`不正なソートフィールド: "${sort}"`);
    } else {
      sanitized.sort = sort.toLowerCase();
    }
  }

  // --- order ---
  const order = searchParams.get("order");
  if (order !== null) {
    if (!ALLOWED_ORDER_DIRECTIONS.includes(order.toLowerCase())) {
      errors.push(`不正なソート方向: "${order}"`);
    } else {
      sanitized.order = order.toLowerCase();
    }
  }

  // --- search ---
  const search = searchParams.get("search");
  if (search !== null) {
    if (search.length > 200) {
      errors.push("検索キーワードは200文字以内にしてください");
    } else {
      sanitized.search = search;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

/**
 * ホワイトリスト定数をエクスポート（UIでの活用用）
 */
export { ALLOWED_SORT_FIELDS, ALLOWED_ORDER_DIRECTIONS };
```

**コード解説:**
- バックエンドの `ALLOWED_SORT_FIELDS` / `ALLOWED_ORDER_DIRECTIONS` と同じ値を定義しています。フロントエンドとバックエンドは独立したアプリケーションのため、それぞれに定義が必要です
- `URLSearchParams` オブジェクトを直接受け取るため、React Router の `useSearchParams` とシームレスに連携できます
- `page` や `limit` はフロントエンドのUI操作で制御されるため、URLからの直接入力を想定した `sort` / `order` / `search` を主にバリデーションしています

#### 手順 8-2: useProducts フックの修正

##### ファイル: `frontend/src/hooks/useProducts.js`（修正）

バリデーションエラー時にAPIリクエストを送信しないようにします。

```javascript
import { useState, useEffect } from "react";
import { productsAPI } from "../services/productsAPI";

const useProducts = (initialFilters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
    limit: 20,
  });
  const [filters, setFilters] = useState(initialFilters);

  // 製品取得
  const fetchProducts = async (newFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const mergedFilters = {
        ...filters,
        ...newFilters,
        page: newFilters.page || filters.page || 1,
      };

      const response = await productsAPI.getList(mergedFilters);

      setProducts(response.data || []);
      setPagination(response.pagination || { page: 1, total: 0, pages: 0, limit: 20 });
      setFilters({ ...filters, ...newFilters });
    } catch (err) {
      console.error("Failed to fetch products:", err);
      // ↓↓↓ 追加: バックエンドからの400エラー（バリデーションエラー）を適切に表示
      // ※ フロント側バリデーションがバイパスされた場合（DevTools等で
      // 直接APIを叩かれた場合）のセーフティネットとして機能する
      if (err.status === 400 && err.data?.error?.details) {
        setError(err.data.error.details.join("、"));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    loading,
    error,
    pagination,
    filters,
    fetchProducts,
  };
};

export default useProducts;
```

**変更点:**
- `catch` ブロックで、バックエンドから返る400エラー（`INVALID_QUERY_PARAMETER`）の `details` 配列を結合して、ユーザーに分かりやすいエラーメッセージとして表示するようにしました

#### 手順 8-3: ProductList ページの修正

##### ファイル: `frontend/src/pages/ProductList.jsx`（修正）

URLのクエリパラメータをフロントエンドでもバリデーションしてから使用します。

```jsx
import { useSearchParams } from "react-router-dom";
import useProducts from "../hooks/useProducts";
import FilterPanel from "../components/FilterPanel";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import { validateQueryParams } from "../utils/queryValidator";
import "../styles/components.css";

const ProductList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ↓↓↓ 追加: URLクエリパラメータをバリデーション
  const { isValid, errors: queryErrors, sanitized } = validateQueryParams(searchParams);

  const { products, loading, error, pagination, fetchProducts } = useProducts(
    isValid
      ? {
          search: sanitized.search || undefined,
          sort: sanitized.sort || undefined,
          order: sanitized.order || undefined,
        }
      : {} // バリデーションエラー時はフィルターなしで初期表示
  );

  const handleFilter = async (filters) => {
    await fetchProducts({ ...filters, page: 1 });
  };

  const handlePageChange = async (page) => {
    await fetchProducts({ page });
  };

  // ↓↓↓ 追加: クエリバリデーションエラーの表示
  if (!isValid) {
    return (
      <div className="product-list-page">
        <h1>製品一覧</h1>
        <div className="error-message">
          <p>URLのパラメータが不正です:</p>
          <ul>
            {queryErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">エラー: {error}</div>;
  }

  return (
    <div className="product-list-page">
      <h1>製品一覧</h1>

      <div className="product-list-container">
        <FilterPanel onFilter={handleFilter} />

        <main className="product-main">
          {loading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <p>製品が見つかりません</p>
          ) : (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <Pagination
                  page={pagination.page}
                  pages={pagination.pages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductList;
```

**変更点:**
- `validateQueryParams` をインポートし、URLのクエリパラメータをフロント側でもバリデーション
- 不正なクエリの場合はエラーメッセージを表示し、APIリクエスト自体を実行しない
- 正常な場合は `sanitized` の値を `useProducts` に渡す

#### 手順 8-4: productsAPI のエラーハンドリング確認

##### ファイル: `frontend/src/services/productsAPI.js`（修正不要・確認のみ）

現在の `httpClient.js` がすでに HTTP エラー時に `error.status` と `error.data` を設定しているため、`productsAPI.js` の修正は不要です。

```javascript
// httpClient.js の既存コード（変更不要）
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  const error = new Error(
    errorData.error?.message || `HTTP ${response.status}`,
  );
  error.status = response.status;  // ← useProducts でこれを参照
  error.data = errorData;          // ← useProducts でこれを参照
  throw error;
}
```

バックエンドが 400 エラーを返した場合、`error.data.error.details` にバリデーションエラーの配列が入り、`useProducts.js` の `catch` ブロックでこれを取り出してユーザーに表示します。

### 9.3 動作確認

#### テストケース

| URL | 期待動作 |
|---|---|
| `/mypage/products` | 正常に全製品表示 |
| `/mypage/products?sort=price&order=asc` | 安い順で表示 |
| `/mypage/products?sort=created_at&order=desc` | 新着順で表示（Dashboard の「新着を見る」） |
| `/mypage/products?sort=rating&order=desc` | 評価順で表示（Dashboard の「高評価を見る」） |
| `/mypage/products?sort=xxx` | フロント側でエラーメッセージ表示 |
| `/mypage/products?order=xx:x;x` | フロント側でエラーメッセージ表示 |

#### 確認チェックリスト

- [ ] Dashboard「新着を見る」→ 製品一覧が新着順で表示される
- [ ] Dashboard「高評価を見る」→ 製品一覧が評価順で表示される
- [ ] 手動で不正URLを入力 → エラーメッセージが表示される
- [ ] FilterPanel のフィルター → 正常に動作する
- [ ] ページネーション → 正常に動作する

**多層防御の効果:**

```
不正URL → フロントでブロック → APIリクエストなし → サーバー負荷ゼロ
正規URL → フロントOK → バックエンドOK → 正常レスポンス
攻撃URL（DevTools等） → フロントバイパス → バックエンドで400エラー → 安全
```

---

## 10. 動作確認手順

### 9.1 開発サーバーの起動

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスします。

### 9.2 画面ごとの確認チェックリスト

| 画面 | URL | 確認項目 |
|------|-----|----------|
| ロール選択 | `/` | 2つのボタンが表示され、クリックで遷移する |
| ログイン | `/mypage/login` | メール・パスワードでログインできる |
| 新規登録 | `/mypage/register` | アカウント作成後、自動ログインされる |
| ダッシュボード | `/mypage` | 人気商品が表示される（要ログイン） |
| 商品一覧 | `/mypage/products` | フィルター・ページネーションが動作する |
| 商品詳細 | `/mypage/products/:id` | 商品情報が表示され、カートに追加できる |
| 注文一覧 | `/mypage/orders` | プレースホルダーが表示される |
| 管理者ログイン | `/admin/login` | 管理者アカウントでログインできる |
| ユーザー管理 | `/admin` | ユーザーのCRUD操作ができる |
| 404 | `/unknown` | 「ページが見つかりませんでした」が表示される |

### 9.3 テスト用アカウント

DB の seeds で作成されたアカウントを使用します。全アカウント共通でパスワードは `password123` です。

| 役割 | メールアドレス | パスワード | 備考 |
|------|------|------|------|
| 一般ユーザー | alice@example.com | password123 | 001_users.sql で作成 |
| 一般ユーザー | hanako@example.com | password123 | 007_auth_users.sql で作成 |
| 管理者 | admin@example.com | password123 | 007_auth_users.sql で作成 |

> 詳細は `db/seeds/007_auth_users.sql` を参照してください。

### 9.4 API接続の確認

```bash
# バックエンドが起動中であることを確認
curl http://localhost:3000/api/health

# 商品データが取得できることを確認
curl http://localhost:3000/api/products
```

---

## 11. トラブルシューティング

### 11.1 よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `CORS error` | バックエンドが起動していない、またはCORS設定の問題 | バックエンドが正しく起動しているか確認（`app.use(cors())` で全オリジン許可済み） |
| `Failed to fetch` | バックエンドが起動していない | `http://localhost:3000/api/health` で確認 |
| `401 Unauthorized` | トークンが無効または期限切れ | ブラウザの DevTools → Application → Local Storage からトークンを削除してログインし直す |
| `ERR_CONNECTION_REFUSED` | ポートが使用中 or サーバー未起動 | `lsof -i :3000` でプロセス確認 |
| `Module not found` | インポートパスが間違っている | ファイルパスが正しいか確認（Vite では拡張子省略可） |
| 画面が白い | JSエラーが発生している | ブラウザの DevTools → Console でエラーを確認 |

### 10.2 開発ツール

```
ブラウザ DevTools（F12）
├── Console: JavaScriptエラーの確認
├── Network: API通信の確認（ステータスコード、レスポンス内容）
├── Application → Local Storage: トークン・カートデータの確認
└── React DevTools（Chrome拡張）: コンポーネントのstate確認
```

### 10.3 CORS設定（バックエンド側）

フロントエンドからの通信を許可するため、バックエンドの `app.js` で以下の設定が必要です。

```js
const cors = require("cors");
app.use(cors());
```

### 10.4 環境変数が反映されない場合

```bash
# Viteの開発サーバーを再起動（.envの変更後は必要）
npm run dev

# 確認方法（ブラウザのConsoleで実行）
console.log(import.meta.env.VITE_API_BASE_URL);
```

---

## 付録A: ファイル作成チェックリスト

以下の順番でファイルを作成すると、依存関係の問題なく進められます。

```
Phase 1: プロジェクト初期設定
  □ npm create vite@latest . -- --template react
  □ npm install react-router-dom modern-normalize

Phase 2: 基盤レイヤー
  □ src/services/httpClient.js      ← 最初に作成（他のすべてが依存）
  □ src/services/authAPI.js
  □ src/services/productsAPI.js
  □ src/services/categoriesAPI.js
  □ src/services/api.js
  □ src/contexts/AuthContext.jsx
  □ src/components/ProtectedRoute.jsx
  □ src/components/LoadingSpinner.jsx

Phase 3: 認証画面
  □ src/pages/SelectRole.jsx
  □ src/pages/LoginPage.jsx
  □ src/pages/RegisterPage.jsx
  □ src/pages/AdminLoginPage.jsx

Phase 4: EC機能
  □ src/utils/validators.js
  □ src/components/Header.jsx
  □ src/components/FilterPanel.jsx
  □ src/components/ProductCard.jsx
  □ src/components/Pagination.jsx
  □ src/hooks/useProducts.js
  □ src/hooks/useCart.js
  □ src/pages/Dashboard.jsx
  □ src/pages/ProductList.jsx
  □ src/pages/ProductDetail.jsx
  □ src/pages/OrderList.jsx

Phase 5: 管理者画面
  □ src/components/UserForm.jsx
  □ src/components/EditForm.jsx
  □ src/components/UserItem.jsx
  □ src/pages/UsersPage.jsx

Phase 6: スタイリング
  □ src/styles/variables.css
  □ src/styles/global.css
  □ src/styles/components.css

Phase 7: エントリポイント・Docker
  □ src/main.jsx                    ← 全コンポーネント完成後に作成
  □ Dockerfile
  □ .env
```

## 付録B: React 主要概念のまとめ

| 概念 | 説明 | 本プロジェクトでの使用例 |
|------|------|--------------------------|
| **コンポーネント** | UIの部品。関数として定義 | `ProductCard`, `Header` |
| **props** | 親→子へのデータ受け渡し | `<ProductCard product={...} />` |
| **state (useState)** | コンポーネント内の状態管理 | `const [email, setEmail] = useState("")` |
| **useEffect** | 副作用処理（API呼び出し等） | データ取得、認証チェック |
| **Context** | グローバルな状態共有 | `AuthContext`（認証情報） |
| **カスタムフック** | ロジックの再利用 | `useProducts`, `useCart` |
| **React Router** | URLとコンポーネントの対応 | `<Route path="/products" element={...} />` |
| **条件付きレンダリング** | 条件でUIを切り替え | `{error && <div>{error}</div>}` |
| **リスト表示** | 配列をUIに変換 | `products.map(p => <ProductCard key={p.id} />)` |

---

> **次のステップ:** `04_STARTUP_GUIDE.md` で Docker Compose を使った全体起動と動作確認について学びます。

---

## 付録C: React / CSS 基礎知識

> このセクションは IT 初心者向けに、本プロジェクトで使われている React と CSS の基礎概念を図解付きで解説します。

### C.1 State（状態）とは？

State は「**コンポーネントが記憶する値**」です。State が変わると、画面が自動的に再描画されます。

```javascript
const [name, setName] = useState("");
```

| 変数 | 役割 |
|------|------|
| `name` | 現在の値を読み取る |
| `setName` | 値を変更する関数 |
| `""` | 初期値（最初は空） |

**動作フロー:**
```
ユーザー入力 → onChange 発火 → setName() 実行 → name が更新される
  ↓
value={name} が反応 → 画面が再描画される
```

### C.2 Props（プロパティ）とは？

Props は「**親コンポーネントが子コンポーネントに渡すデータや関数**」です。

```jsx
// App.jsx（親）
<UserForm onSubmit={handleCreate} />

// UserForm.jsx（子）
const UserForm = ({ onSubmit }) => {
  await onSubmit(name, email);  // 親の処理を実行
}
```

**親子関係:**
```
App.jsx（親）
  ↓ onSubmit={handleCreate} を渡す
UserForm.jsx（子）
  ↓ onSubmit として受け取る
  ↓ フォーム送信時に実行
App.jsx の handleCreate が実行される
  ↓
バックエンド API に通信
```

### C.3 制御コンポーネント（Controlled Component）

React が入力欄の値を完全に管理する方式です。

```jsx
<input
  value={name}                              // React の状態で値を表示
  onChange={(e) => setName(e.target.value)}  // 入力で状態を更新
/>
```

- `value={name}`: 表示される値は常に React の state と一致
- `onChange`: キー入力のたびに state を更新 → 画面が再描画

### C.4 非同期処理（async/await）

時間がかかる処理（API 通信など）を待つ書き方です。

```javascript
const handleSubmit = async (e) => {
  setLoading(true);              // 送信開始
  try {
    await onSubmit(name, email); // API通信完了を待つ
    setName("");                 // 成功したらクリア
  } finally {
    setLoading(false);           // 成功でも失敗でも必ず実行
  }
};
```

- `await` で「この処理が終わるまで待つ」
- `try/finally` で「成功でも失敗でも確実に後処理を実行」

### C.5 useEffect の動作

```
useEffect(() => { fetchProducts(); }, []);
                                       └─ 依存配列
```

| 依存配列 | 実行タイミング | 用途 |
|---------|-------------|------|
| `[]`（空） | 初回のみ | データの初期取得 |
| `[filters]` | filters が変わったとき | フィルター変更時の再取得 |
| なし | 毎回 | ❌ 無限ループの危険 |

### C.6 CRUD 操作の実行フロー

ユーザーが「作成」ボタンをクリックしてから完了するまでの流れ：

```
1. ユーザーが名前・メールを入力
   onChange → setName("太郎"), setEmail("taro@example.com")

2. 「作成」ボタンをクリック
   handleSubmit() が発動

3. setLoading(true)
   → ボタンが「送信中...」に変わる

4. await onSubmit(name, email)
   → 親の handleCreate を実行

5. await createUser(name, email)
   → POST /api/users にリクエスト送信

6. await loadUsers()
   → GET /api/users で最新一覧を取得
   → setUsers(data) で画面を更新

7. setName(""), setEmail("")
   → 入力欄をクリア

8. setLoading(false)
   → ボタンが「作成」に戻る
```

### C.7 CSS ボックスモデル

HTML の全要素は「箱」として扱われます。

```
┌─────────────────────────────┐
│    margin（外側の余白）        │
│  ┌──────────────────────┐   │
│  │  border（枠線）        │   │
│  │  ┌────────────────┐  │   │
│  │  │ padding（内側）   │  │   │
│  │  │ ┌──────────┐   │  │   │
│  │  │ │コンテンツ  │   │  │   │
│  │  │ └──────────┘   │  │   │
│  │  └────────────────┘  │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

| プロパティ | 意味 | 例 |
|-----------|------|-----|
| `padding: 0.5rem 1rem` | 内側の余白（上下 0.5rem、左右 1rem） | ボタンの文字と枠の間 |
| `border: 1px solid #ccc` | 枠線（1px、実線、グレー） | 入力欄の枠 |
| `margin: 2rem 0` | 外側の余白（上下 2rem、左右 0） | セクション間のスペース |
| `border-radius: 4px` | 角丸（半径 4px） | ボタンやカードの角 |

### C.8 Flexbox（要素の配置）

要素を横並びや縦並びにする方法です。

```css
/* 縦並び */
form { display: flex; flex-direction: column; gap: 1rem; }

/* 横並び（両端配置） */
li { display: flex; justify-content: space-between; align-items: center; }
```

```
flex-direction: column        justify-content: space-between
┌──────────────┐             ┌──────────────────────────────┐
│  ┌────────┐  │             │ [要素1] ←  距離  → [要素2]   │
│  │ 要素1  │  │             └──────────────────────────────┘
│  └────────┘  │
│     gap      │
│  ┌────────┐  │
│  │ 要素2  │  │
│  └────────┘  │
└──────────────┘
```

### C.9 疑似クラス

要素の**状態**に応じてスタイルを変える CSS の書き方です。

| 疑似クラス | 条件 | 使用例 |
|-----------|------|--------|
| `:hover` | マウスを乗せた時 | ボタンの色を濃くする |
| `:active` | クリック中 | 少し縮ませる |
| `:disabled` | disabled 属性がある | グレーアウト+禁止カーソル |
| `:focus` | フォーカスされた時 | 入力欄の枠線をハイライト |

```css
button { background: #007bff; }
button:hover { background: #0056b3; }       /* 濃い青 */
button:disabled { background: #ccc; cursor: not-allowed; }
```

### C.10 段階的エラー解消の仕組み

本プロジェクトでは、ファイルを順番に作成していくため、途中でエラーが出ます。これは**正常な動作**です。

| 手順 | ファイル | エラー状態 | 説明 |
|------|---------|----------|------|
| Phase 1 | プロジェクト初期化 | なし | `npm run dev` が正常動作 |
| Phase 2 | httpClient.js など | ⚠️ import エラー | ページコンポーネントがまだない |
| Phase 3 | 認証画面 | ⚠️ import エラー | EC機能コンポーネントがまだない |
| Phase 4 | EC機能 | ⚠️ import エラー | 管理者画面がまだない |
| Phase 7 | main.jsx 完成 | ✅ 解決！ | **全ファイルが揃って動作開始** |

> 途中でエラーが表示されても、手順通りに進めれば最終的にすべて解消されます。

---

## 付録D: 商品一覧アーキテクチャ設計参照

> このセクションは、商品一覧ページ（ProductList）のデータフローと状態管理を詳細に解説した設計参照資料です。

### D.1 状態の完全マップ（全7個）

| # | 状態名 | 型 | 定義場所 | 所有者 | スコープ | 説明 |
|---|--------|-----|---------|--------|---------|------|
| 1 | **products** | `Product[]` | `useProducts.js` | ProductList | 画面全体 | 表示中の製品リスト |
| 2 | **loading** | `boolean` | `useProducts.js` | ProductList | 画面全体 | ローディング中か |
| 3 | **error** | `string\|null` | `useProducts.js` | ProductList | 画面全体 | エラーメッセージ |
| 4 | **pagination** | `PaginationInfo` | `useProducts.js` | ProductList | 画面全体 | ページ情報 |
| 5 | **filters** (useProducts) | `FilterParams` | `useProducts.js` | ProductList | 画面全体 | APIに送信済みフィルター |
| 6 | **categories** | `Category[]` | `FilterPanel.jsx` | FilterPanel | FilterPanelのみ | カテゴリー選択肢 |
| 7 | **filters** (FilterPanel) | `FilterParams` | `FilterPanel.jsx` | FilterPanel | FilterPanelのみ | UI入力中の値 |

#### 状態 #5 と #7 の違い

```
FilterPanel.filters (状態#7)          useProducts.filters (状態#5)
┌──────────────────┐                 ┌──────────────────┐
│ UI入力中の値      │  onFilter()     │ API送信済みの値   │
│ ユーザーが今選択中 │  ─────────────> │ 実際に使われてる │
│                  │                 │                  │
│ 例: category_id=1 │                 │ 例: category_id=1 │
│     min_price=100 │                 │     page=1        │
└──────────────────┘                 └──────────────────┘
     (入力するたび変化)                    (API呼び出しで更新)
```

### D.2 関数の完全マップ（全4個）

| # | 関数名 | 定義場所 | 引数 | 変更する状態 | 呼び出し元 |
|---|--------|---------|------|------------|-----------|
| 1 | **fetchProducts** | `useProducts.js` | `newFilters?: Object` | #1,#2,#4,#5 | useEffect, handleFilter, handlePageChange |
| 2 | **handleFilter** | `ProductList.jsx` | `filters: Object` | なし（#1を呼ぶ） | FilterPanel (onFilter経由) |
| 3 | **handlePageChange** | `ProductList.jsx` | `page: number` | なし（#1を呼ぶ） | Pagination (onPageChange経由) |
| 4 | **handleFilterChange** | `FilterPanel.jsx` | `key, value` | #7 | select/input の onChange |

#### 関数の呼び出しチェーン

```
関数#4: handleFilterChange (FilterPanel内)
 └─ setFilters() で状態#7を更新
 └─ onFilter() で親に通知
      ↓
関数#2: handleFilter (ProductList内)
 └─ 関数#1 を呼び出す
      ↓
関数#1: fetchProducts (useProducts内)
 └─ API 呼び出し
 └─ setProducts() で状態#1を更新
      ↓
     React が自動で再レンダリング
```

### D.3 全体フロー図

```
┌───────────────────────────────────────────────────────────────┐
│                      ProductList (親)                          │
│                                                                │
│  状態: products[], loading, error, pagination, filters         │
│  関数: handleFilter, handlePageChange                          │
│                                                                │
│  ┌─────────────────────┐       ┌───────────────────────┐    │
│  │  FilterPanel (子)   │       │  ProductCard (子×N)   │    │
│  │                     │       │                       │    │
│  │  状態: categories[], │       │  状態: なし            │    │
│  │        filters      │       │  props: product       │    │
│  │  関数: handle       │       │                       │    │
│  │        FilterChange │       └───────────────────────┘    │
│  └─────────────────────┘                                     │
│           │                                                   │
│           │ onFilter()                                        │
│           └─────────────→ handleFilter()                      │
│                               │                               │
│                               ↓                               │
│                          fetchProducts() ← useProducts内      │
│                               │                               │
│                               ↓                               │
│                          API呼び出し                           │
│                               │                               │
│                               ↓                               │
│                          setProducts() ← 状態#1更新           │
│                               │                               │
│                               ↓                               │
│                          React再レンダリング                   │
└───────────────────────────────────────────────────────────────┘
```

### D.4 フィルター変更時の実行フロー

```
ユーザー操作
  ↓
FilterPanel.jsx  onChange イベント
  ↓
FilterPanel.jsx  handleFilterChange 実行
  ↓
FilterPanel.jsx  setFilters() ← 状態#7更新
  ↓
FilterPanel.jsx  onFilter() ← 親に通知
  ↓
ProductList.jsx  handleFilter 実行（onFilter の実体）
  ↓
ProductList.jsx  fetchProducts() 呼び出し
  ↓
useProducts.js   setLoading(true) ← 状態#2更新
  ↓
useProducts.js   API呼び出し
  ↓
useProducts.js   setProducts() ← 状態#1更新 ★再レンダリングトリガー
  ↓
React内部処理    状態変更検知 → ProductList再実行
  ↓
ProductList.jsx  useProducts() 再呼び出し
  ↓
useProducts.js   useEffect は実行されない（[]なので）
  ↓
useProducts.js   return { products: [新しいデータ], ... }
  ↓
ProductList.jsx  products.map() で新しいリスト描画
```

### D.5 再レンダリングのメカニズム

```
1. どこかで setState() が実行される
   例: setProducts([新しいデータ])
      ↓
2. React がそれを検知
      ↓
3. その状態を使ってるコンポーネントを探す
   → ProductList が使っている
      ↓
4. ProductList の関数を再実行
      ↓
5. useProducts() も再実行される
      ↓
6. useEffect(() => {...}, []) は実行されない
   （[] = 初回のみ実行の意味）
      ↓
7. return で最新の状態を返す
      ↓
8. JSX が新しい状態で再描画される
```

### D.6 実装パターン早見表

#### パターン1: 兄弟コンポーネント間の連携

```javascript
// ❌ 悪い例: 兄弟間で直接通信できない
<FilterPanel />  ❌→  <ProductCard />

// ✅ 良い例: 親を経由する
const ProductList = () => {
  const { products, fetchProducts } = useProducts();
  const handleFilter = (filters) => fetchProducts(filters);
  return (
    <>
      <FilterPanel onFilter={handleFilter} />     {/* 親に通知 */}
      {products.map(p => <ProductCard product={p} />)} {/* 親から受取 */}
    </>
  );
};
```

#### パターン2: カスタムフックでロジック分離

```javascript
// ❌ 悪い例: 全部1ファイルに書く（200行超）
const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchProducts = async () => { /* 複雑な処理 */ };
  useEffect(() => { /* ... */ }, []);
  return ( /* 表示 */ );
};

// ✅ 良い例: ロジックをカスタムフックに分離
const useProducts = () => {
  // 複雑なロジック（60行）
  return { products, loading, fetchProducts };
};
const ProductList = () => {
  const { products, loading, fetchProducts } = useProducts();
  return ( /* 表示だけに集中（50行） */ );
};
```

#### パターン3: 子→親への通知

```javascript
// 親コンポーネント
<FilterPanel onFilter={handleFilter} />  // コールバック関数を渡す

// 子コンポーネント
const FilterPanel = ({ onFilter }) => {
  const handleChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);   // 自分の状態を更新
    onFilter(newFilters);     // 親に通知 ← ここが重要
  };
};
```

### D.7 クイックリファレンス

| やりたいこと | 確認するファイル | キーコード |
|------------|---------------|-----------|
| フィルター変更で製品を再取得 | ProductList.jsx | `handleFilter` → `fetchProducts` |
| ページ番号変更で製品を再取得 | ProductList.jsx | `handlePageChange` → `fetchProducts` |
| 製品データの定義場所 | useProducts.js | `const [products] = useState([])` |
| フィルターUIの値を親に通知 | FilterPanel.jsx | `onFilter(newFilters)` |
| 初回自動でデータ取得 | useProducts.js | `useEffect(() => {...}, [])` |

### D.8 よくある質問

#### Q1: なぜ useState は useProducts 内にあるのに ProductList の状態なの？

`useProducts` は ProductList **の中で**呼ばれているからです。React はフックが「どのコンポーネントから呼ばれたか」を記録しています。

```javascript
const ProductList = () => {
  const { products } = useProducts();  // ← ProductListの状態として登録される
};
```

#### Q2: useEffect の [] はなぜ必要？

`[]`（空の依存配列）がないと、毎回 `fetchProducts` が実行されて**無限ループ**になります。

```javascript
// ❌ 無限ループ
useEffect(() => { fetchProducts(); });
// fetchProducts → setProducts → 再レンダリング → useEffect再実行 → ...

// ✅ 初回のみ実行
useEffect(() => { fetchProducts(); }, []);
```

#### Q3: onFilter のように戻り値がない関数は何のため？

目的は「戻り値」ではなく「**親への通知**」です。`onFilter` を呼ぶことで親の `handleFilter` が実行され、API 呼び出し → 状態更新 → 再レンダリングが連鎖的に起こります。

### D.9 設計の3原則

| 原則 | 説明 | 本プロジェクトでの例 |
|------|------|---------------------|
| **単一責任** | 1つのコンポーネントは1つの仕事 | FilterPanel はフィルターUIのみ担当 |
| **関心の分離** | 表示とロジックを分ける | useProducts でデータ取得ロジックを分離 |
| **データは下る、イベントは上る** | Props で下、callback で上 | `onFilter` で子→親に通知 |
