# 認証システム実装ガイド【フロントエンド編】

> **目的:** ユーザー体験に優れた認証UIを実装し、安全な状態管理とルーティング保護を実現する

---

## 📋 目次

1. [前提条件](#前提条件)
2. [アーキテクチャ設計](#アーキテクチャ設計)
3. [認証コンテキスト実装](#認証コンテキスト実装)
4. [API通信層の更新](#api通信層の更新)
5. [ログインページ実装](#ログインページ実装)
6. [登録ページ実装](#登録ページ実装)
7. [Protected Routes実装](#protected-routes実装)
8. [ルーティング更新](#ルーティング更新)
9. [ヘッダーの更新](#ヘッダーの更新)
10. [テスト方法](#テスト方法)

---

## 前提条件

✅ **データベース準備完了**（`DATABASE_AUTH_IMPLEMENTATION.md`完了）  
✅ **バックエンド実装完了**（`BACKEND_AUTH_IMPLEMENTATION.md`完了）
- 認証APIが実装済み（`/api/auth/register`, `/api/auth/login`等）
- JWTトークンが発行される

---

## アーキテクチャ設計

### 認証フロー（フロントエンド）

```
【ユーザー登録】
Register Page → Submit → API Call → Success → Save Token → Navigate to /mypage

【ログイン】
Login Page → Submit → API Call → Success → Save Token → Navigate to Dashboard

【認証状態の確認】
App Load → Check localStorage → Token exists? → Validate with /api/auth/me → Set User

【保護されたルート】
Navigate to /mypage/orders → Check Auth → Not Authenticated? → Redirect to /mypage/login
```

### 状態管理の設計

React Context API を使用した認証状態のグローバル管理

```
AuthContext (Provider)
  ├─ user: { id, name, email, role }
  ├─ token: string
  ├─ isAuthenticated: boolean
  ├─ isLoading: boolean
  ├─ login(email, password)
  ├─ register(name, email, password)
  └─ logout()
```

### なぜContext APIか？

| 方法 | メリット | デメリット | 選択理由 |
|------|---------|-----------|---------|
| useState（props） | シンプル | props地獄 | ✗ |
| Redux | 強力、開発ツール充実 | 学習コスト高、設定複雑 | ✗ |
| Context API | React標準、シンプル | 大規模では性能問題 | ✅ 今回のスケールに最適 |

---

## 認証コンテキスト実装

### 📁 ファイル: `frontend/src/contexts/AuthContext.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/contexts/AuthContext.jsx`

**役割:** 認証状態をアプリ全体で共有するコンテキスト

```javascript
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
        console.error("Auth initialization error:", err);
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
      console.warn("Logout request failed:", err);
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

### なぜこう書くのか？

#### 1. `localStorage` にトークンを保存

```javascript
localStorage.setItem('token', data.data.token);
```

**利点:**
- ページリロードしても認証状態を維持
- ブラウザを閉じても7日間（JWT有効期限）は有効

**セキュリティ考慮:**
- ⚠️ XSS（クロスサイトスクリプティング）に脆弱
- 本番環境では `httpOnly` Cookie + CSRF対策を推奨
- 今回は学習用にシンプルな localStorage を採用

#### 2. 初回ロード時の認証確認

```javascript
useEffect(() => {
  const initAuth = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    // /api/auth/me で現在のユーザー情報を取得
    const response = await fetch('...');
  };
  
  initAuth();
}, [token]);
```

**理由:**
- ページリロード時に localStorage のトークンを確認
- トークンが有効かバックエンドに問い合わせ
- 無効なトークン（期限切れ等）は削除

#### 3. カスタムフック `useAuth()` の提供

```javascript
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
```

**使い方:**

```javascript
// 任意のコンポーネントで
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user.name}!</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

---

## API通信層の更新

### 📁 ファイル: `frontend/src/services/httpClient.js`（既存ファイルを更新）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/services/httpClient.js`

**変更内容:** すべてのリクエストに自動的にJWTトークンを含める

```javascript
const API_BASE = "http://localhost:3000/api";

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
    };

    // ★ 追加: localStorage からトークンを取得して自動付与
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
    };

    if (data && ["POST", "PUT", "PATCH"].includes(method)) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error?.message || `HTTP ${response.status}`);
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

### なぜ httpClient に自動付与するのか？

```javascript
// ❌ 各APIコールで毎回手動でトークン指定（DRY違反）
const response = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// ✅ httpClient を使えば自動で付与（一箇所で管理）
const response = await httpClient.get('/users');  // トークンは自動付与
```

### 📁 ファイル: `frontend/src/services/authAPI.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/services/authAPI.js`

**役割:** 認証APIをサービス層に集約（AuthContextから直接fetchしない）

```javascript
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

### 📁 ファイル: `frontend/src/services/api.js`（既存ファイルを更新）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/services/api.js`

**変更内容:** 管理者ページで使用するユーザーAPIを `httpClient` に統一

```javascript
import httpClient from "./httpClient";

// ユーザー一覧取得
export const fetchUsers = async () => {
  return httpClient.get("/users");
};

// ユーザー詳細取得
export const fetchUser = async (id) => {
  return httpClient.get(`/users/${id}`);
};

// ユーザー作成
export const createUser = async (name, email) => {
  return httpClient.post("/users", { name, email });
};

// ユーザー更新（全置き換え）
export const updateUser = async (id, name, email) => {
  return httpClient.put(`/users/${id}`, { name, email });
};

// ユーザー部分更新
export const patchUser = async (id, fields) => {
  return httpClient.patch(`/users/${id}`, fields);
};

// ユーザー削除
export const deleteUser = async (id) => {
  return httpClient.delete(`/users/${id}`);
};
```

---

## ログインページ実装

### エンドユーザー用ログインページ

### 📁 ファイル: `frontend/src/pages/LoginPage.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/LoginPage.jsx`

**役割:** 一般ユーザー向けのログインUI

```javascript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    setIsLoading(false);

    if (result.success) {
      navigate('/mypage');
    } else {
      setError(result.error || 'ログインに失敗しました');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ログイン</h1>
        <p className="auth-subtitle">エンドユーザーアカウントでログイン</p>

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

          <button type="submit" className="btn btn-primary full-width" disabled={isLoading}>
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="auth-link">
          アカウントをお持ちでない方は <Link to="/mypage/register">こちらから登録</Link>
        </p>

        <p className="auth-link">
          <Link to="/">← 役割選択に戻る</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
```

### 管理者用ログインページ

### 📁 ファイル: `frontend/src/pages/AdminLoginPage.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/AdminLoginPage.jsx`

**役割:** 管理者向けのログインUI

```javascript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    setIsLoading(false);

    if (result.success) {
      // ログイン成功後、roleを確認
      // user は AuthContext で自動更新されるため、少し待つ
      setTimeout(() => {
        if (user?.role === 'admin') {
          navigate('/admin');
        } else {
          setError('管理者アカウントでログインしてください');
        }
      }, 100);
    } else {
      setError(result.error || 'ログインに失敗しました');
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

          <button type="submit" className="btn btn-primary full-width" disabled={isLoading}>
            {isLoading ? 'ログイン中...' : '管理者ログイン'}
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

### なぜ管理者ログインで `user.role` を確認するのか？

```javascript
if (user?.role === 'admin') {
  navigate('/admin');
} else {
  setError('管理者アカウントでログインしてください');
}
```

**理由:**
- 一般ユーザーが管理者ログインページからログインするのを防ぐ
- バックエンドでもrole確認はするが、フロントでも早期チェック
- UX向上（不正なログイン試行に即座にフィードバック）

---

## 登録ページ実装

### 📁 ファイル: `frontend/src/pages/RegisterPage.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/RegisterPage.jsx`

**役割:** エンドユーザーの新規登録UI

```javascript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // バリデーション: パスワード一致確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    // バリデーション: パスワード強度
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setIsLoading(true);

    const result = await register(name, email, password);

    setIsLoading(false);

    if (result.success) {
      navigate('/mypage');
    } else {
      setError(result.error || '登録に失敗しました');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ユーザー登録</h1>
        <p className="auth-subtitle">新規アカウントを作成</p>

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
              placeholder="山田 太郎"
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

          <button type="submit" className="btn btn-primary full-width" disabled={isLoading}>
            {isLoading ? '登録中...' : '登録'}
          </button>
        </form>

        <p className="auth-link">
          既にアカウントをお持ちの方は <Link to="/mypage/login">こちらからログイン</Link>
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

---

## Protected Routes実装

### 📁 ファイル: `frontend/src/components/ProtectedRoute.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/components/ProtectedRoute.jsx`

**役割:** 認証が必要なルートを保護し、未ログインユーザーをログインページにリダイレクト

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 認証が必要なルートを保護するコンポーネント
 * @param {Object} props
 * @param {React.ReactNode} props.children - 保護する子コンポーネント
 * @param {string} props.requiredRole - 必要な役割（'user' または 'admin'）省略時は認証のみ
 * @param {string} props.redirectTo - リダイレクト先（省略時は /mypage/login）
 */
const ProtectedRoute = ({ children, requiredRole, redirectTo = '/mypage/login' }) => {
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

  // 役割チェック（requiredRole が指定されている場合）
  if (requiredRole && user?.role !== requiredRole) {
    // 権限不足の場合は403ページまたはホームへ
    return (
      <div className="error-page">
        <h1>アクセス権限がありません</h1>
        <p>このページにアクセスする権限がありません。</p>
      </div>
    );
  }

  // 認証済み & 権限OK → 子コンポーネント表示
  return children;
};

export default ProtectedRoute;
```

### なぜ `<Navigate replace />` を使うのか？

```javascript
<Navigate to="/mypage/login" replace />
```

**`replace` の意味:**
- ブラウザ履歴を「置き換える」
- 「戻る」ボタンで保護されたページに戻らない

**シナリオ:**
1. ユーザーが `/mypage/orders` にアクセス（未ログイン）
2. `/mypage/login` にリダイレクト
3. ログイン成功 → `/mypage` に遷移
4. 「戻る」ボタン → **`/mypage/orders` ではなく `/` に戻る**

`replace` がない場合、「戻る」で `/mypage/orders` → また `/mypage/login` にリダイレクト（無限ループ）

---

## ルーティング更新

### 📁 ファイル: `frontend/src/main.jsx`（既存ファイルを更新）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/main.jsx`

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

          {/* エンドユーザー: 認証関連（認証不要） */}
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

### なぜ `<AuthProvider>` でラップするのか？

```javascript
<AuthProvider>
  <Router>
    <Routes>...</Routes>
  </Router>
</AuthProvider>
```

**理由:**
- `AuthProvider` がアプリ全体をラップ
- どのコンポーネントからも `useAuth()` で認証状態にアクセス可能
- Router の外側に配置（Routerより上位のグローバル状態）

---

## ヘッダーの更新

### 📁 ファイル: `frontend/src/components/Header.jsx`（既存ファイルを更新）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/components/Header.jsx`

**変更内容:** ログアウトボタンとユーザー情報表示を追加

```javascript
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
    window.location.href = `/mypage/products?search=${encodeURIComponent(searchQuery)}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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

---

## スタイリング

### 📁 ファイル: `frontend/src/styles/components.css`（既存ファイルに追加）

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/styles/components.css`

**追加内容:** 認証ページと管理者用のスタイル

```css
/* 認証ページ共通 */
.auth-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: var(--spacing-xl);
}

.auth-container {
  background: white;
  padding: var(--spacing-xxl);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 450px;
  width: 100%;
}

.auth-container h1 {
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
  color: var(--dark-color);
  text-align: center;
}

.auth-subtitle {
  text-align: center;
  color: var(--gray-color);
  margin-bottom: var(--spacing-lg);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-group label {
  font-weight: 500;
  color: var(--dark-color);
}

.form-group input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.auth-link {
  text-align: center;
  margin-top: var(--spacing-md);
  color: var(--gray-color);
}

.auth-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.auth-link a:hover {
  text-decoration: underline;
}

/* 管理者ログインページ */
.admin-auth-page {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* ヘッダー: ユーザーメニュー */
.user-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-name {
  font-weight: 500;
  color: var(--dark-color);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
}

/* ローディング */
.loading-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
}

/* エラーページ */
.error-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xl);
  text-align: center;
}

.error-page h1 {
  color: var(--danger-color);
  margin-bottom: var(--spacing-md);
}
```

---

## テスト方法

### 1. フロントエンド起動

```bash
cd /Users/haytakeda/Sites/RESTAPI/frontend
npm run dev
```

### 2. テストシナリオ

#### シナリオ1: エンドユーザー登録

1. `http://localhost:5173/` にアクセス
2. 「エンドユーザー」ボタンをクリック
3. `/mypage/login` にリダイレクトされる（未ログイン）
4. 「こちらから登録」リンクをクリック
5. 登録フォームに入力:
   - 名前: テストユーザー
   - メール: test@example.com
   - パスワード: password123
6. 「登録」ボタンをクリック
7. `/mypage` にリダイレクトされる（ログイン成功）
8. ヘッダーに「👤 テストユーザー」が表示される

#### シナリオ2: 管理者ログイン

1. `http://localhost:5173/` にアクセス
2. 「管理者」ボタンをクリック
3. `/admin/login` にリダイレクトされる
4. ログインフォームに入力:
   - メール: admin@example.com
   - パスワード: password123
5. 「管理者ログイン」ボタンをクリック
6. `/admin` にリダイレクトされる（ユーザー管理画面）

#### シナリオ3: 保護されたルート

1. ログアウト状態で `/mypage/orders` に直接アクセス
2. 自動的に `/mypage/login` にリダイレクトされる
3. ログイン後、再度 `/mypage/orders` にアクセス
4. 正常に表示される

#### シナリオ4: 権限エラー

1. 一般ユーザーでログイン（hanako@example.com）
2. `/admin` に直接アクセス
3. 「アクセス権限がありません」が表示される

---

## まとめ

### 実装したファイル

| カテゴリ | ファイル | 役割 |
|---------|---------|------|
| Context | `contexts/AuthContext.jsx` | 認証状態のグローバル管理 |
| Pages | `pages/LoginPage.jsx` | エンドユーザーログイン |
| Pages | `pages/AdminLoginPage.jsx` | 管理者ログイン |
| Pages | `pages/RegisterPage.jsx` | エンドユーザー登録 |
| Components | `components/ProtectedRoute.jsx` | ルート保護 |
| Services | `services/httpClient.js`（更新） | JWT自動付与 |
| Routes | `main.jsx`（更新） | ルーティング設定 |
| Styles | `styles/components.css`（追加） | 認証UIスタイル |

### 認証フロー完成

```
未ログイン → ログイン/登録 → 認証済み → 保護されたページにアクセス可能
                                ↓
                            ログアウト → 未ログイン
```

### セキュリティ対策

✅ JWTトークンの自動付与  
✅ 未ログインユーザーのリダイレクト  
✅ 役割ベースのアクセス制御  
✅ パスワード強度チェック  
✅ アカウント有効性確認  

---

## 次のステップ（任意・発展）

### セキュリティ強化

1. **HTTPS対応**（本番環境では必須）
2. **httpOnly Cookie** でトークン管理（XSS対策）
3. **CSRF対策**
4. **リフレッシュトークン** の実装
5. **パスワードリセット** 機能

### UX改善

1. **ソーシャルログイン**（Google、Facebook等）
2. **2要素認証（2FA）**
3. **Remember Me** 機能
4. **ログインセッション管理** ページ

---

**作成日:** 2026年2月19日  
**バージョン:** 1.0  
**対象:** React Frontend + REST API Backend
