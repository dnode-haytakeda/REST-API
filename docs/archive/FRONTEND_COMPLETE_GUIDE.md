# フロントエンド完全構築ガイド

> **目的:** React + Vite でモダンなEコマースフロントエンドを0から構築し、認証・製品一覧・注文管理UIを実装する

---

## 📋 目次

1. [概要](#概要)
2. [環境構築](#環境構築)
3. [ディレクトリ構成](#ディレクトリ構成)
4. [ルーティング設計](#ルーティング設計)
5. [API通信層](#api通信層)
6. [認証システム](#認証システム)
7. [ページ実装](#ページ実装)
8. [コンポーネント実装](#コンポーネント実装)
9. [カスタムフック](#カスタムフック)
10. [スタイリング](#スタイリング)
11. [改善機能](#改善機能)
12. [テスト方法](#テスト方法)

---

## 概要

### 技術スタック

| 技術 | バージョン | 用途 |
|------|----------|------|
| React | 19.x | UIライブラリ |
| Vite | 7.x | ビルドツール |
| React Router | 7.x | ルーティング |
| modern-normalize | 3.x | リセットCSS |

### ページ構成

| パス | ページ | 説明 |
|------|--------|------|
| `/` | SelectRole | 役割選択（起動直後） |
| `/mypage` | Dashboard | エンドユーザーホーム |
| `/mypage/products` | ProductList | 製品一覧・検索 |
| `/mypage/products/:id` | ProductDetail | 製品詳細 |
| `/mypage/orders` | OrderList | 注文履歴 |
| `/mypage/login` | LoginPage | ログイン |
| `/mypage/register` | RegisterPage | 新規登録 |
| `/admin/users` | UsersPage | 管理者ユーザー管理 |
| `/admin/login` | AdminLoginPage | 管理者ログイン |

### 実装フェーズ

| フェーズ | 内容 | 期間目安 |
|---------|------|---------|
| Phase 1 | 環境構築・基本ルーティング | Week 1 |
| Phase 2 | 製品一覧・詳細ページ | Week 2 |
| Phase 3 | 注文履歴・レビュー機能 | Week 3 |
| Phase 4 | 認証UI（ログイン・登録） | Week 4 |
| Phase 5 | 改善（ホームページ充実・バリデーション） | Week 5 |

---

## 環境構築

### プロジェクト作成

```bash
# frontendディレクトリでViteプロジェクト作成
cd /Users/haytakeda/Sites/RESTAPI
npm create vite@latest frontend -- --template react

# 依存パッケージインストール
cd frontend
npm install

# React Router追加
npm install react-router-dom

# リセットCSS追加
npm install modern-normalize
```

### 開発サーバー起動

```bash
npm run dev
```

デフォルトで `http://localhost:5173` で起動

### vite.config.js

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

**ポイント:** `proxy` 設定でAPIリクエストをバックエンドに転送（CORS回避）

---

## ディレクトリ構成

```
frontend/
├── src/
│   ├── main.jsx                   # エントリーポイント
│   ├── pages/                     # ページコンポーネント
│   │   ├── App.jsx                # レイアウト（Header, Footer）
│   │   ├── SelectRole.jsx         # 役割選択
│   │   ├── Dashboard.jsx          # ホーム
│   │   ├── ProductList.jsx        # 製品一覧
│   │   ├── ProductDetail.jsx      # 製品詳細
│   │   ├── OrderList.jsx          # 注文履歴
│   │   ├── LoginPage.jsx          # ログイン
│   │   ├── RegisterPage.jsx       # 新規登録
│   │   ├── AdminLoginPage.jsx     # 管理者ログイン
│   │   └── UsersPage.jsx          # ユーザー管理
│   ├── components/                # 再利用可能コンポーネント
│   │   ├── Header.jsx             # ヘッダー
│   │   ├── FilterPanel.jsx        # フィルタパネル
│   │   ├── Pagination.jsx         # ページネーション
│   │   ├── ProductCard.jsx        # 製品カード
│   │   ├── LoadingSpinner.jsx     # ローディング
│   │   └── ProtectedRoute.jsx     # 認証ルート
│   ├── contexts/                  # React Context
│   │   └── AuthContext.jsx        # 認証状態管理
│   ├── services/                  # API通信
│   │   ├── httpClient.js          # HTTP共通処理
│   │   ├── authAPI.js             # 認証API
│   │   ├── productsAPI.js         # 製品API
│   │   ├── categoriesAPI.js       # カテゴリーAPI
│   │   └── ordersAPI.js           # 注文API
│   ├── hooks/                     # カスタムフック
│   │   ├── useProducts.js         # 製品状態管理
│   │   └── useOrders.js           # 注文状態管理
│   ├── utils/                     # ユーティリティ
│   │   └── validators.js          # バリデーション関数
│   └── styles/                    # スタイル
│       ├── global.css             # グローバルスタイル
│       ├── components.css         # コンポーネントスタイル
│       └── variables.css          # CSS変数
├── index.html
├── vite.config.js
└── package.json
```

---

## ルーティング設計

### src/main.jsx

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// リセットCSS（必ず最初に読み込む）
import "modern-normalize/modern-normalize.css";

// グローバルスタイル
import "./styles/global.css";
import "./styles/components.css";

// 認証プロバイダー
import { AuthProvider } from "./contexts/AuthContext";

// ページコンポーネント
import SelectRole from "./pages/SelectRole";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import OrderList from "./pages/OrderList";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import UsersPage from "./pages/UsersPage";
import App from "./pages/App";

// 保護されたルート
import ProtectedRoute from "./components/ProtectedRoute";

function RootApp() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 起動直後の選択画面 */}
          <Route path="/" element={<SelectRole />} />

          {/* App: ヘッダー・フッター含むレイアウト */}
          <Route element={<App />}>
            {/* エンドユーザー（公開） */}
            <Route path="/mypage" element={<Dashboard />} />
            <Route path="/mypage/products" element={<ProductList />} />
            <Route path="/mypage/products/:id" element={<ProductDetail />} />
            <Route path="/mypage/login" element={<LoginPage />} />
            <Route path="/mypage/register" element={<RegisterPage />} />

            {/* エンドユーザー（認証必須） */}
            <Route
              path="/mypage/orders"
              element={
                <ProtectedRoute>
                  <OrderList />
                </ProtectedRoute>
              }
            />

            {/* 管理者 */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={<Navigate to="/admin/users" replace />}
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<div>ページが見つかりません</div>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RootApp />);
```

### ルーティングマップ

| パス | 認証 | ロール | コンポーネント |
|------|------|--------|---------------|
| `/` | 不要 | - | SelectRole |
| `/mypage` | 不要 | - | Dashboard |
| `/mypage/products` | 不要 | - | ProductList |
| `/mypage/products/:id` | 不要 | - | ProductDetail |
| `/mypage/login` | 不要 | - | LoginPage |
| `/mypage/register` | 不要 | - | RegisterPage |
| `/mypage/orders` | **必須** | user+ | OrderList |
| `/admin/login` | 不要 | - | AdminLoginPage |
| `/admin/users` | **必須** | **admin** | UsersPage |

---

## API通信層

### src/services/httpClient.js

```javascript
const API_BASE = "http://localhost:3000/api";

class HttpClient {
  async request(method, endpoint, data = null, params = null) {
    let url = `${API_BASE}${endpoint}`;

    // クエリパラメータを追加
    if (params) {
      const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
      );
      if (Object.keys(filteredParams).length > 0) {
        const queryString = new URLSearchParams(filteredParams).toString();
        url += `?${queryString}`;
      }
    }

    // ヘッダー構築
    const headers = {
      "Content-Type": "application/json",
    };

    // トークン自動付与
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
        const error = new Error(
          errorData.error?.message || `HTTP ${response.status}`
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

export const httpClient = new HttpClient();
```

### src/services/authAPI.js

```javascript
import { httpClient } from "./httpClient";

export const authAPI = {
  /**
   * ユーザー登録
   */
  register: (name, email, password) => {
    return httpClient.post("/auth/register", { name, email, password });
  },

  /**
   * ログイン
   */
  login: (email, password) => {
    return httpClient.post("/auth/login", { email, password });
  },

  /**
   * 現在のユーザー情報取得
   */
  getMe: () => {
    return httpClient.get("/auth/me");
  },

  /**
   * ログアウト
   */
  logout: () => {
    return httpClient.post("/auth/logout");
  },
};
```

### src/services/productsAPI.js

```javascript
import { httpClient } from "./httpClient";

export const productsAPI = {
  /**
   * 製品一覧取得
   */
  getAll: (params = {}) => {
    return httpClient.get("/products", params);
  },

  /**
   * 製品詳細取得
   */
  getById: (id) => {
    return httpClient.get(`/products/${id}`);
  },

  /**
   * 人気製品取得
   */
  getPopular: (limit = 10) => {
    return httpClient.get("/products/popular", { limit });
  },

  /**
   * カテゴリー一覧取得
   */
  getCategories: () => {
    return httpClient.get("/products/categories");
  },
};
```

### src/services/ordersAPI.js

```javascript
import { httpClient } from "./httpClient";

export const ordersAPI = {
  /**
   * 注文一覧取得
   */
  getAll: (params = {}) => {
    return httpClient.get("/orders", params);
  },

  /**
   * 注文詳細取得
   */
  getById: (id) => {
    return httpClient.get(`/orders/${id}`);
  },

  /**
   * 注文作成
   */
  create: (orderData) => {
    return httpClient.post("/orders", orderData);
  },
};
```

---

## 認証システム

### src/contexts/AuthContext.jsx

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
        error: err.message || "ログインに失敗しました",
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
        error: err.message || "登録に失敗しました",
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

### src/components/ProtectedRoute.jsx

```javascript
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // ローディング中
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 未認証
  if (!isAuthenticated) {
    // 管理者ルートは管理者ログインへ
    if (location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    // その他はユーザーログインへ
    return <Navigate to="/mypage/login" state={{ from: location }} replace />;
  }

  // ロールチェック
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="error-message">
        この操作を実行する権限がありません
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
```

---

## ページ実装

### src/pages/App.jsx

```javascript
import { Outlet } from "react-router-dom";
import Header from "../components/Header";

const App = () => {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <p>© 2026 RESTAPI Ecommerce. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
```

### src/pages/SelectRole.jsx

```javascript
import { Link } from "react-router-dom";

const SelectRole = () => {
  return (
    <div className="select-role-page">
      <h1>REST API Ecommerce</h1>
      <p>役割を選択してください</p>

      <div className="role-buttons">
        <Link to="/mypage" className="role-button user-button">
          🛒 エンドユーザーとして入る
        </Link>
        <Link to="/admin/login" className="role-button admin-button">
          🔧 管理者としてログイン
        </Link>
      </div>
    </div>
  );
};

export default SelectRole;
```

### src/pages/Dashboard.jsx

```javascript
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productsAPI } from "../services/productsAPI";
import LoadingSpinner from "../components/LoadingSpinner";

const Dashboard = () => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        const response = await productsAPI.getPopular(8);
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

      {/* 人気製品セクション */}
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
                    {product.view_count > 0 && (
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

      {/* 追加セクション */}
      <section className="dashboard-info">
        <div className="info-card">
          <h3>🎁 新着製品</h3>
          <p>最新の製品をチェック</p>
          <Link
            to="/mypage/products?sort=created_at&order=desc"
            className="btn btn-outline"
          >
            新着を見る
          </Link>
        </div>
        <div className="info-card">
          <h3>⭐️ 高評価製品</h3>
          <p>レビュー評価の高い製品</p>
          <Link
            to="/mypage/products?sort=rating&order=desc"
            className="btn btn-outline"
          >
            高評価を見る
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
```

### src/pages/ProductList.jsx

```javascript
import { useSearchParams } from "react-router-dom";
import useProducts from "../hooks/useProducts";
import FilterPanel from "../components/FilterPanel";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";

const ProductList = () => {
  const [searchParams] = useSearchParams();
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

### src/pages/ProductDetail.jsx

```javascript
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { productsAPI } from "../services/productsAPI";
import LoadingSpinner from "../components/LoadingSpinner";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productsAPI.getById(id);
        setProduct(response.data);
      } catch (err) {
        console.error("Failed to fetch product:", err);
        setError(err.message || "製品の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="error-page">
        <h2>エラー</h2>
        <p>{error}</p>
        <Link to="/mypage/products" className="btn btn-primary">
          製品一覧に戻る
        </Link>
      </div>
    );
  }

  if (!product) {
    return <div>製品が見つかりません</div>;
  }

  return (
    <div className="product-detail-page">
      <nav className="breadcrumb">
        <Link to="/mypage">ホーム</Link>
        <span> / </span>
        <Link to="/mypage/products">製品一覧</Link>
        <span> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="product-detail-container">
        <div className="product-image-section">
          <img
            src={product.image_url || "/placeholder.jpg"}
            alt={product.name}
            className="product-main-image"
          />
        </div>

        <div className="product-info-section">
          <span className="product-category">{product.category_name}</span>
          <h1>{product.name}</h1>

          <div className="product-rating">
            <span className="stars">
              {"★".repeat(Math.round(product.rating || 0))}
              {"☆".repeat(5 - Math.round(product.rating || 0))}
            </span>
            <span className="rating-value">
              {product.rating ? Number(product.rating).toFixed(1) : "未評価"}
            </span>
            <span className="reviews-count">
              ({product.reviews_count || 0}件のレビュー)
            </span>
          </div>

          <p className="product-price">
            ¥{Number(product.price).toLocaleString()}
          </p>

          <p className="product-description">{product.description}</p>

          <div className="product-stock">
            {product.stock > 0 ? (
              <span className="in-stock">在庫あり（{product.stock}個）</span>
            ) : (
              <span className="out-of-stock">在庫切れ</span>
            )}
          </div>

          <div className="product-actions">
            <button
              className="btn btn-primary btn-large"
              disabled={product.stock === 0}
            >
              カートに追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
```

### src/pages/LoginPage.jsx

```javascript
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/mypage";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ログイン</h1>

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
              placeholder="example@email.com"
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
              minLength={8}
              placeholder="********"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p className="auth-footer">
          アカウントをお持ちでないですか？{" "}
          <Link to="/mypage/register">新規登録</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
```

### src/pages/RegisterPage.jsx

```javascript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // パスワード確認
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください");
      return;
    }

    setLoading(true);

    const result = await register(name, email, password);

    if (result.success) {
      navigate("/mypage", { replace: true });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>新規登録</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">名前</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="山田太郎"
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
              placeholder="example@email.com"
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
              minLength={8}
              placeholder="8文字以上"
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
              placeholder="パスワードを再入力"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "登録中..." : "登録"}
          </button>
        </form>

        <p className="auth-footer">
          すでにアカウントをお持ちですか？{" "}
          <Link to="/mypage/login">ログイン</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
```

---

## コンポーネント実装

### src/components/Header.jsx

```javascript
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/mypage/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/mypage" className="logo">
          🛒 E-Commerce
        </Link>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="製品を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">🔍</button>
        </form>

        <nav className="nav-links">
          <Link to="/mypage/products">製品一覧</Link>

          {isAuthenticated ? (
            <>
              <Link to="/mypage/orders">注文履歴</Link>
              <span className="user-name">
                {user.name}
                {user.role === "admin" && " (管理者)"}
              </span>
              <button onClick={handleLogout} className="btn btn-outline">
                ログアウト
              </button>
            </>
          ) : (
            <Link to="/mypage/login" className="btn btn-primary">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
```

### src/components/FilterPanel.jsx

```javascript
import { useState, useEffect } from "react";
import { productsAPI } from "../services/productsAPI";
import { validatePriceRange } from "../utils/validators";

const FilterPanel = ({ onFilter }) => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category_id: "",
    min_price: "",
    max_price: "",
    sort: "created_at",
    order: "desc",
  });
  const [validationError, setValidationError] = useState(null);

  // カテゴリー取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsAPI.getCategories();
        setCategories(response);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // 入力変更
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  // フィルター適用
  const handleApplyFilter = () => {
    // バリデーション
    const validation = validatePriceRange(
      filters.min_price ? Number(filters.min_price) : undefined,
      filters.max_price ? Number(filters.max_price) : undefined
    );

    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    onFilter({
      category_id: filters.category_id || undefined,
      min_price: filters.min_price ? Number(filters.min_price) : undefined,
      max_price: filters.max_price ? Number(filters.max_price) : undefined,
      sort: filters.sort,
      order: filters.order,
    });
  };

  // リセット
  const handleReset = () => {
    const resetFilters = {
      category_id: "",
      min_price: "",
      max_price: "",
      sort: "created_at",
      order: "desc",
    };
    setFilters(resetFilters);
    setValidationError(null);
    onFilter({
      category_id: undefined,
      min_price: undefined,
      max_price: undefined,
      sort: "created_at",
      order: "desc",
    });
  };

  return (
    <aside className="filter-panel">
      <h3>フィルター</h3>

      {validationError && (
        <div className="validation-error">{validationError}</div>
      )}

      {/* カテゴリー */}
      <div className="filter-group">
        <label>カテゴリー</label>
        <select
          name="category_id"
          value={filters.category_id}
          onChange={handleChange}
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
        <div className="price-range">
          <input
            type="number"
            name="min_price"
            placeholder="最小"
            value={filters.min_price}
            onChange={handleChange}
            min="0"
          />
          <span>〜</span>
          <input
            type="number"
            name="max_price"
            placeholder="最大"
            value={filters.max_price}
            onChange={handleChange}
            min="0"
          />
        </div>
      </div>

      {/* 並び順 */}
      <div className="filter-group">
        <label>並び順</label>
        <select name="sort" value={filters.sort} onChange={handleChange}>
          <option value="created_at">新着順</option>
          <option value="price">価格順</option>
          <option value="rating">評価順</option>
          <option value="name">名前順</option>
        </select>
        <select name="order" value={filters.order} onChange={handleChange}>
          <option value="desc">降順</option>
          <option value="asc">昇順</option>
        </select>
      </div>

      {/* ボタン */}
      <div className="filter-actions">
        <button className="btn btn-primary" onClick={handleApplyFilter}>
          適用
        </button>
        <button className="btn btn-outline" onClick={handleReset}>
          リセット
        </button>
      </div>
    </aside>
  );
};

export default FilterPanel;
```

### src/components/ProductCard.jsx

```javascript
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  return (
    <Link to={`/mypage/products/${product.id}`} className="product-card">
      <div className="product-card-image">
        <img
          src={product.image_url || "/placeholder.jpg"}
          alt={product.name}
        />
        {product.is_featured && <span className="featured-badge">おすすめ</span>}
      </div>

      <div className="product-card-content">
        <span className="product-card-category">{product.category_name}</span>
        <h3 className="product-card-title">{product.name}</h3>

        <div className="product-card-rating">
          <span className="stars">
            {"★".repeat(Math.round(product.rating || 0))}
          </span>
          <span className="rating-text">
            {product.rating ? Number(product.rating).toFixed(1) : "-"}
          </span>
          <span className="reviews-count">({product.reviews_count || 0})</span>
        </div>

        <p className="product-card-price">
          ¥{Number(product.price).toLocaleString()}
        </p>

        {product.stock === 0 && (
          <span className="out-of-stock-badge">在庫切れ</span>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
```

### src/components/Pagination.jsx

```javascript
const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < pages) onPageChange(page + 1);
  };

  // ページ番号の配列を生成
  const getPageNumbers = () => {
    const numbers = [];
    const maxVisible = 5;

    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(pages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }

    return numbers;
  };

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={handlePrev}
        disabled={page === 1}
      >
        ←
      </button>

      {getPageNumbers().map((num) => (
        <button
          key={num}
          className={`pagination-btn ${num === page ? "active" : ""}`}
          onClick={() => onPageChange(num)}
        >
          {num}
        </button>
      ))}

      <button
        className="pagination-btn"
        onClick={handleNext}
        disabled={page === pages}
      >
        →
      </button>
    </div>
  );
};

export default Pagination;
```

### src/components/LoadingSpinner.jsx

```javascript
const LoadingSpinner = () => {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>読み込み中...</p>
    </div>
  );
};

export default LoadingSpinner;
```

---

## カスタムフック

### src/hooks/useProducts.js

```javascript
import { useState, useEffect, useCallback } from "react";
import { productsAPI } from "../services/productsAPI";

const useProducts = (initialFilters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState(initialFilters);

  const fetchProducts = useCallback(async (newFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const mergedFilters = { ...filters, ...newFilters };
      setFilters(mergedFilters);

      const response = await productsAPI.getAll(mergedFilters);
      setProducts(response.data || []);
      setPagination(response.pagination || {});
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError(err.message || "製品の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 初回取得
  useEffect(() => {
    fetchProducts(initialFilters);
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

---

## スタイリング

### src/styles/global.css

```css
/* リセット（modern-normalizeが基本を担当） */
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

/* ボタン */
.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #007bff;
  color: #007bff;
}

.btn-outline:hover {
  background-color: #007bff;
  color: white;
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
}

/* エラーメッセージ */
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

.validation-error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}# フォーム
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
```

### src/styles/components.css

```css
/* ヘッダー */
.header {
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
}

.search-form {
  flex: 1;
  display: flex;
  max-width: 400px;
}

.search-form input {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 4px 0 0 4px;
}

.search-form button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-links a {
  color: #495057;
}

.nav-links a:hover {
  color: #007bff;
}

.user-name {
  font-weight: 500;
  color: #495057;
}

/* メインコンテンツ */
.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
}

/* フッター */
.footer {
  background-color: #343a40;
  color: white;
  padding: 1.5rem;
  text-align: center;
}

/* 製品グリッド */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* 製品カード */
.product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.product-card-image {
  position: relative;
  height: 200px;
  background-color: #f8f9fa;
}

.product-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: #ffc107;
  color: #000;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 4px;
}

.product-card-content {
  padding: 1rem;
}

.product-card-category {
  font-size: 0.75rem;
  color: #6c757d;
  text-transform: uppercase;
}

.product-card-title {
  font-size: 1rem;
  margin: 0.5rem 0;
  color: #212529;
}

.product-card-rating .stars {
  color: #ffc107;
}

.product-card-price {
  font-size: 1.25rem;
  font-weight: bold;
  color: #007bff;
  margin-top: 0.5rem;
}

/* フィルターパネル */
.filter-panel {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-panel h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #007bff;
}

.filter-group {
  margin-bottom: 1.5rem;
}

.filter-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

.price-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-range input {
  flex: 1;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.filter-actions .btn {
  flex: 1;
}

/* 製品一覧ページ */
.product-list-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .product-list-container {
    grid-template-columns: 1fr;
  }
}

/* ページネーション */
.pagination {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ced4da;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ダッシュボード */
.dashboard-page {
  max-width: 1000px;
  margin: 0 auto;
}

.dashboard-subtitle {
  color: #6c757d;
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.view-all-link {
  color: #007bff;
}

.popular-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
}

.popular-product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.popular-product-card:hover {
  transform: translateY(-4px);
}

.dashboard-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
}

.info-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.info-card h3 {
  margin-top: 0;
}

/* 認証ページ */
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.auth-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.auth-container h1 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-form .btn {
  width: 100%;
  margin-top: 1rem;
}

.auth-footer {
  text-align: center;
  margin-top: 1.5rem;
  color: #6c757d;
}

.auth-footer a {
  color: #007bff;
}

/* ローディング */
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 役割選択ページ */
.select-role-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.select-role-page h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.role-buttons {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}

.role-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 3rem;
  background: white;
  color: #333;
  border-radius: 12px;
  font-size: 1.25rem;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.role-button:hover {
  transform: translateY(-4px);
}
```

---

## 改善機能

### src/utils/validators.js

```javascript
/**
 * 価格帯バリデーション
 */
export const validatePriceRange = (minPrice, maxPrice) => {
  // 両方未入力はOK
  if (minPrice === undefined && maxPrice === undefined) {
    return { isValid: true, error: null };
  }

  // 負の数値チェック
  if (minPrice !== undefined && minPrice < 0) {
    return { isValid: false, error: "最小価格は0以上で入力してください" };
  }
  if (maxPrice !== undefined && maxPrice < 0) {
    return { isValid: false, error: "最大価格は0以上で入力してください" };
  }

  // 最小 > 最大のチェック
  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    minPrice > maxPrice
  ) {
    return { isValid: false, error: "最小価格は最大価格以下にしてください" };
  }

  // 極端に大きな値のチェック
  const MAX_PRICE_LIMIT = 100000000;
  if (minPrice !== undefined && minPrice > MAX_PRICE_LIMIT) {
    return {
      isValid: false,
      error: `最小価格は${MAX_PRICE_LIMIT.toLocaleString()}円以下にしてください`,
    };
  }
  if (maxPrice !== undefined && maxPrice > MAX_PRICE_LIMIT) {
    return {
      isValid: false,
      error: `最大価格は${MAX_PRICE_LIMIT.toLocaleString()}円以下にしてください`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * メールバリデーション
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: "メールアドレスは必須です" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "有効なメールアドレスを入力してください" };
  }

  return { isValid: true, error: null };
};

/**
 * パスワードバリデーション
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: "パスワードは必須です" };
  }

  if (password.length < 8) {
    return { isValid: false, error: "パスワードは8文字以上にしてください" };
  }

  return { isValid: true, error: null };
};
```

---

## テスト方法

### 起動確認

```bash
# フロントエンド起動
cd frontend
npm run dev

# ブラウザで確認
open http://localhost:5173
```

### 認証テスト

1. `/mypage/register` で新規登録
2. `/mypage/login` でログイン
3. `/mypage/orders` にアクセス（認証必須を確認）
4. ログアウト後、再度 `/mypage/orders` にアクセス（リダイレクトを確認）

### 製品検索テスト

1. `/mypage/products` で製品一覧を表示
2. フィルタパネルでカテゴリー・価格帯を設定
3. 「適用」ボタンをクリック
4. 「リセット」ボタンで初期状態に戻る

### URLクエリパラメータテスト

```
/mypage/products?search=iPhone
/mypage/products?category_id=1&min_price=10000
/mypage/products?sort=price&order=asc
```

---

## Docker対応

### frontend/Dockerfile

```dockerfile
# ビルドステージ
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 本番ステージ
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### frontend/nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPAのルーティング対応
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API プロキシ
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

**このガイドに従って実装することで、認証・製品検索・注文管理機能を備えた本格的なEコマースフロントエンドを構築できます。**
