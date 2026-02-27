# プロフェッショナルなREST APIアプリケーション開発ガイド
## フェーズ1-3: フロントエンド完全実装ガイド

---

## 概要

このガイドは、シンプルなユーザー管理UIを、**注文管理・レビュー機能を備えた本格的なEコマースフロントエンド**へ完全実装するためのガイドです。

### 学習目標

- ✅ Phase 1: ユーザー管理UI（既存）
- ✅ Phase 2: 製品一覧・詳細ページ実装
- ✅ Phase 3: 注文履歴・レビュー投稿機能実装
- ✅ Single Page Application（SPA）化による高速ナビゲーション
- ✅複数ページ・リソースの管理（Products, Orders, Reviews）
- ✅ 高度なUIコンポーネント設計
- ✅ APIデータの効率的な管理（キャッシング、同期）
- ✅ ユーザーエクスペリエンスの向上

### 実装アーキテクチャ

```
フロントエンド（React）
├── Pages
│   ├── SelectRole       （役割選択）
│   ├── Dashboard        （ホーム）
│   ├── ProductList      （製品一覧・検索）← Phase 2
│   ├── ProductDetail    （製品詳細）← Phase 2
│   ├── OrderList        （注文履歴）← Phase 3
│   ├── UsersPage        （管理者: ユーザー管理）
│   └── App              （レイアウト）
├── Components
│   ├── Header
│   ├── FilterPanel
│   ├── Pagination
│   ├── ProductCard
│   ├── LoadingSpinner
│   ├── UserForm
│   ├── UserItem
│   └── EditForm
├── APIサービス
│   ├── usersAPI
│   ├── productsAPI      ← Phase 2
│   ├── categoriesAPI
│   └── httpClient
└── 状態管理
  ├── useProducts      ← Phase 2
  └── useCart
```

---

## UI/UX設計

### ページ構成（Wire Frame）

```
┌────────────────────────────────────────────────────┐
│                   HEADER / NAV                       │
│  Logo | 検索 | Products | Orders | MyPage            │
├────────────────────────────────────────────────────┤
│                                                    │
│  Page Content（以下のいずれかを表示）              │
│  ┌─────────────────────────────────────────────┐ │
│  │ 1. ホーム（Dashboard）                      │ │
│  │  - おすすめ製品カルーセル                    │ │
│  │  - 新着製品                                  │ │
│  │  - ユーザーステータス                        │ │
│  └─────────────────────────────────────────────┘ │
│                                                    │
│  ┌─────────────────────────────────────────────┐ │
│  │ 2. 製品一覧（Products）                     │ │
│  │  ┌─────────────────────────────────────┐   │ │
│  │  │ フィルタパネル（左）                │   │ │
│  │  │ - カテゴリー                        │   │ │
│  │  │ - 価格帯                            │   │ │
│  │  │ - 並び順                            │   │ │
│  │  └─────────────────────────────────────┘   │ │
│  │  ┌─────────────────────────────────────┐   │ │
│  │  │  製品グリッド（右・中央）           │   │ │
│  │  │  [ ] [ ] [ ]                        │   │ │
│  │  │  [ ] [ ] [ ]  ← ProductCard        │   │ │
│  │  │  ┌─────┬─────┬─────┐               │   │ │
│  │  │  │ << │ 1 2 │ >> │ ← ページネーション │   │ │
│  │  │  └─────┴─────┴─────┘               │   │ │
│  │  └─────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────┘ │
│                                                    │
│  ┌─────────────────────────────────────────────┐ │
│  │ 3. 製品詳細（ProductDetail）                │ │
│  │  [ 画像 ]  名前 | ☆4.5 | $1500           │ │
│  │            説明 | 在庫: 50個               │ │
│  │            [ 数量選択 ] [ カートに追加 ]   │ │
│  │  レビュー:                                 │ │
│  │  ★★★★★ 「素晴らしい！」                │ │
│  │  - by User1                                │ │
│  └─────────────────────────────────────────────┘ │
│                                                    │
│  ┌─────────────────────────────────────────────┐ │
│  │ 4. 注文一覧（Orders）                       │ │
│  │  Order #1001 | 2026-02-15 | $5000 | 配送中 │ │
│  │  Order #1000 | 2026-02-10 | $3000 | 配達済 │ │
│  │  ...                                        │ │
│  └─────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│                    FOOTER                          │
│       About | Privacy | Contact © 2026            │
└────────────────────────────────────────────────────┘
```

### 色とモデル

```css
Primary Color：#007bff （ボタン、リンク）
Success Color：#28a745 （購入完了）
Warning Color：#ffc107 （確認、待機）
Danger Color： #dc3545 （削除、エラー）
Gray：#6c757d   （テキスト、背景）
```

---

## ファイル構成

### 新しいディレクトリ構成

```
frontend/
├── src/
│   ├── pages/                         ← ページコンポーネント
│   │   ├── App.jsx                    ← メインページ（改良版）
│   │   ├── SelectRole.jsx             ← 役割選択
│   │   ├── Dashboard.jsx              ← ホーム
│   │   ├── ProductList.jsx            ← 製品一覧
│   │   ├── ProductDetail.jsx          ← 製品詳細
│   │   ├── OrderList.jsx              ← 注文一覧
│   │   └── UsersPage.jsx              ← 管理者ユーザー管理
│   ├── components/                    ← 再利用可能コンポーネント
│   │   ├── EditForm.jsx               ← 編集フォーム
│   │   ├── FilterPanel.jsx            ← フィルタパネル
│   │   ├── Header.jsx                 ← ヘッダー
│   │   ├── LoadingSpinner.jsx         ← ローディング表示
│   │   ├── Pagination.jsx             ← ページネーション
│   │   ├── ProductCard.jsx            ← 製品カード（リスト用）
│   │   ├── UserForm.jsx               ← ユーザー作成フォーム
│   │   └── UserItem.jsx               ← ユーザー表示
│   ├── services/                      ← APIサービス
│   │   ├── api.js                     ← 既存（ユーザー用）
│   │   ├── categoriesAPI.js           ← カテゴリーAPI
│   │   ├── httpClient.js              ← HTTP共通処理
│   │   └── productsAPI.js             ← 製品API
│   ├── hooks/                         ← カスタムフック（状態管理）
│   │   ├── useCart.js                 ← カート状態管理
│   │   └── useProducts.js             ← 製品状態管理
│   ├── styles/
│   │   ├── components.css             ← コンポーネント固有
│   │   ├── global.css                 ← グローバルスタイル
│   │   └── variables.css              ← CSS変数
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

---

## ルーティング（SPA化）

### React Router v7の導入

**package.json に追加:**

```bash
npm install react-router-dom@7.0.0
```

### ルーティング設定

この手順では、起動直後の選択画面と、エンドユーザー/管理者のルート分離を実現します。

1. `/` は **役割選択ページ** を表示する
2. エンドユーザー機能は `/mypage/*` に集約する
3. 管理者機能（ユーザー管理）は `/admin/*` に移動する
4. ルート直下の空白表示を防ぐため、`/admin` は `/admin/users` にリダイレクトする

### 📁 ファイル: `frontend/src/main.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/main.jsx`

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// ページコンポーネント
import SelectRole from "./pages/SelectRole";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import OrderList from "./pages/OrderList";
import UsersPage from "./pages/UsersPage";

// ショーケットコンポーネント
import App from "./pages/App";  // Header, Footer含む

function RootApp() {
  return (
    <Router>
      <Routes>
        {/* 起動直後の選択画面 */}
        <Route path="/" element={<SelectRole />} />

        {/* App: ヘッダー・フッター含むレイアウト */}
        <Route element={<App />}>
          {/* エンドユーザー */}
          <Route path="/mypage" element={<Dashboard />} />
          <Route path="/mypage/products" element={<ProductList />} />
          <Route path="/mypage/products/:id" element={<ProductDetail />} />
          <Route path="/mypage/orders" element={<OrderList />} />

          {/* 管理者 */}
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<UsersPage />} />

          {/* 404 */}
          <Route path="/mypage/*" element={<div>ページが見つかりません</div>} />
          <Route path="/admin/*" element={<div>ページが見つかりません</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RootApp />);
```

### ルーティングマップ

| パス | コンポーネント | 説明 |
|------|-------------|------|
| `/` | SelectRole | 役割選択（起動直後に表示） |
| `/mypage` | Dashboard | エンドユーザーのホーム |
| `/mypage/products` | ProductList | 製品一覧・検索 |
| `/mypage/products/:id` | ProductDetail | 製品詳細 |
| `/mypage/orders` | OrderList | 注文一覧 |
| `/admin/users` | UsersPage | 管理者のユーザー管理 |

---

## APIサービス層の拡張

### HTTP共通処理

### 📁 ファイル: `frontend/src/services/httpClient.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/services/httpClient.js`

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

    const options = {
      method,
      headers: { "Content-Type": "application/json" },
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

### 製品API

### 📁 ファイル: `frontend/src/services/productsAPI.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/services/productsAPI.js`

```javascript
import httpClient from "./httpClient";

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
    if (filters.is_featured !== undefined) params.is_featured = filters.is_featured;

    return httpClient.get("/products", params);
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

### カテゴリーAPI

### 📁 ファイル: `frontend/src/services/categoriesAPI.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/services/categoriesAPI.js`

```javascript
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

---

## コンポーネント設計

### Header コンポーネント

### 📁 ファイル: `frontend/src/components/Header.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/components/Header.jsx`

```javascript
import { Link } from "react-router-dom";
import { useState } from "react";
import "../styles/components.css";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    // ProductList に検索クエリを渡す
    window.location.href = `/mypage/products?search=${encodeURIComponent(searchQuery)}`;
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* ロゴ */}
        <Link to="/" className="logo">
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
        </nav>
      </div>
    </header>
  );
};

export default Header;
```

### ProductCard コンポーネント

### 📁 ファイル: `frontend/src/components/ProductCard.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/components/ProductCard.jsx`

```javascript
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
        <Link to={`/products/${product.id}`}>
          <img src={product.image_url || "/placeholder.jpg"} alt={product.name} />
        </Link>
        {product.is_featured && <span className="badge-featured">おすすめ</span>}
      </div>

      {/* 情報 */}
      <div className="product-info">
        <Link to={`/products/${product.id}`} className="product-name">
          <h3>{product.name}</h3>
        </Link>

        {/* 価格・レーティング */}
        <div className="product-meta">
          <span className="price">¥{product.price.toLocaleString()}</span>
          <div className="rating">
            ★ {product.rating?.toFixed(1) || "未評価"}
            <span className="reviews-count">({product.reviews_count || 0})</span>
          </div>
        </div>

        {/* 説明 */}
        <p className="product-description">{product.description?.slice(0, 50)}...</p>

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

### FilterPanel コンポーネント

### 📁 ファイル: `frontend/src/components/FilterPanel.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/components/FilterPanel.jsx`

```javascript
import { useState, useEffect } from "react";
import { categoriesAPI } from "../services/categoriesAPI";

const FilterPanel = ({ onFilter }) => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category_id: null,
    min_price: null,
    max_price: null,
    sort: "created_at",
  });

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
    onFilter(newFilters);
  };

  return (
    <aside className="filter-panel">
      <h3>フィルター</h3>

      {/* カテゴリー */}
      <div className="filter-group">
        <label>カテゴリー</label>
        <select
          value={filters.category_id || ""}
          onChange={(e) => handleFilterChange("category_id", e.target.value || null)}
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
        <input
          type="number"
          placeholder="最小"
          value={filters.min_price || ""}
          onChange={(e) => handleFilterChange("min_price", e.target.value ? parseFloat(e.target.value) : null)}
        />
        <span>～</span>
        <input
          type="number"
          placeholder="最大"
          value={filters.max_price || ""}
          onChange={(e) => handleFilterChange("max_price", e.target.value ? parseFloat(e.target.value) : null)}
        />
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

      {/* リセット */}
      <button
        className="btn btn-outline full-width"
        onClick={() => {
          setFilters({
            category_id: null,
            min_price: null,
            max_price: null,
            sort: "created_at",
          });
          onFilter({});
        }}
      >
        フィルターをリセット
      </button>
    </aside>
  );
};

export default FilterPanel;
```

### Pagination コンポーネント

### 📁 ファイル: `frontend/src/components/Pagination.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/components/Pagination.jsx`

```javascript
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

### LoadingSpinner コンポーネント

### 📁 ファイル: `frontend/src/components/LoadingSpinner.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/components/LoadingSpinner.jsx`

```javascript
const LoadingSpinner = () => {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
```

**補足:** `.spinner` のスタイルは `frontend/src/styles/components.css` に定義済み

---

## 状態管理

### useProducts フック

### 📁 ファイル: `frontend/src/hooks/useProducts.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/hooks/useProducts.js`

```javascript
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
      const response = await productsAPI.getList({
        ...filters,
        ...newFilters,
        page: newFilters.page || filters.page || 1,
      });

      setProducts(response.data);
      setPagination(response.pagination);
      setFilters({ ...filters, ...newFilters });
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch products:", err);
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

### useCart フック（簡易版）

### 📁 ファイル: `frontend/src/hooks/useCart.js`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/hooks/useCart.js`

```javascript
import { useState, useEffect } from "react";

const useCart = () => {
  const [cart, setCart] = useState(() => {
    // localStorage から復元
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

---

## スタイル・レイアウト

### グローバルスタイル

### 📁 ファイル: `frontend/src/styles/variables.css`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/styles/variables.css`

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

### 📁 ファイル: `frontend/src/styles/components.css`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/styles/components.css`

```css
@import "./variables.css";

/* ボタン */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: var(--transition);
  font-weight: 500;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn-outline {
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  background-color: transparent;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 製品カード */
.product-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: var(--transition);
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.product-image {
  position: relative;
  width: 100%;
  height: 250px;
  overflow: hidden;
  background-color: var(--light-color);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge-featured {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  background-color: var(--warning-color);
  color: black;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: bold;
}

.product-info {
  padding: var(--spacing-md);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  text-decoration: none;
  color: var(--dark-color);
  margin-bottom: var(--spacing-sm);
}

.product-name h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  line-height: 1.3;
}

.product-name:hover h3 {
  color: var(--primary-color);
}

/* ページネーション */
.pagination {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  margin: var(--spacing-lg) 0;
  flex-wrap: wrap;
}

.btn-pagination {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  background-color: white;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
}

.btn-pagination:hover:not(:disabled) {
  background-color: var(--light-color);
}

.btn-pagination.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-pagination:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ローディング */
.spinner {
  border: 4px solid var(--light-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 実装ステップ

### Step 1: React Router 導入

```bash
cd frontend
npm install react-router-dom@7.0.0
```

### Step 2: ファイル構造作成

```bash
mkdir -p src/pages src/components src/hooks src/styles
```

### Step 3: ページコンポーネント実装

### 📁 ファイル: `frontend/src/pages/App.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/App.jsx`

```javascript
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

### 📁 ファイル: `frontend/src/pages/SelectRole.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/SelectRole.jsx`

```javascript
import { useNavigate } from "react-router-dom";

const SelectRole = () => {
  const navigate = useNavigate();

  return (
    <div className="role-select-page">
      <h1>どちらで利用しますか？</h1>
      <div className="role-select-actions">
        <button className="btn btn-primary" onClick={() => navigate("/mypage")}
        >
          エンドユーザー
        </button>
        <button className="btn btn-outline" onClick={() => navigate("/admin")}
        >
          管理者
        </button>
      </div>
    </div>
  );
};

export default SelectRole;
```

### 📁 ファイル: `frontend/src/pages/Dashboard.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/Dashboard.jsx`

```javascript
const Dashboard = () => {
  return (
    <div className="dashboard-page">
      <h1>ホーム</h1>
      <p>おすすめ製品や新着情報をここに表示します。</p>
    </div>
  );
};

export default Dashboard;
```

### 📁 ファイル: `frontend/src/pages/ProductList.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/ProductList.jsx`

```javascript
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

### 📁 ファイル: `frontend/src/pages/OrderList.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/OrderList.jsx`

```javascript
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

### 📁 ファイル: `frontend/src/pages/ProductDetail.jsx`

**保存先パス:** `/Users/haytakeda/Sites/RESTAPI/frontend/src/pages/ProductDetail.jsx`

```javascript
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
          <img src={product.image_url || "/placeholder.jpg"} alt={product.name} />
        </div>

        {/* 情報 */}
        <div className="detail-info">
          <h1>{product.name}</h1>
          <div className="detail-meta">
            <span className="price">¥{product.price.toLocaleString()}</span>
            <span className="rating">⭐ {product.rating} ({product.reviews_count}件)</span>
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
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
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
                    <img src={related.image_url || "/placeholder.jpg"} alt={related.name} />
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

---

## テスト・デバッグ

### ブラウザDevTools のデバッグ方法

1. **ネットワークタブ**
   - API呼び出しが見える
   - リクエスト・レスポンス確認

2. **Reactタブ**
   - コンポーネント階層
   - State確認

3. **Consoleタブ**
   - エラー表示
   - `console.log()` 出力

### 手動テストチェックリスト

- [ ] ホームページが表示される
- [ ] 製品一覧が表示される
- [ ] フィルター（カテゴリー、価格）が機能する
- [ ] ページネーションが機能する
- [ ] 検索が機能する
- [ ] 製品詳細が表示される
- [ ] カートに追加できる
- [ ] ページ遷移が速い（SPA確認）

---

## 次のステップ

✅ フロントエンド基本構成完成

**推奨する次の実装:**
- ショッピングカート完全版（カウント、削除）
---

## 関連ドキュメント

| ドキュメント | 内容 | 参照すべき箇所 |
|-----------|------|-------------|
| [DATABASE_STRUCTURE_GUIDE.md](DATABASE_STRUCTURE_GUIDE.md) | DB スキーマ設計 | データ構造・テーブル定義 |
| [BACKEND_APP_DEVELOPMENT.md](BACKEND_APP_DEVELOPMENT.md) | APIエンドポイント仕様 | 各API呼び出しのレスポンス形式 |
| [db/ER_DIAGRAM.md](db/ER_DIAGRAM.md) | ER図（Mermaid） | データ関係理解 |

---

## 実装進行度チェックリスト

### Phase 2: 製品管理UI

- [ ] ProductList.jsx 実装完了
- [ ] ProductDetail.jsx 実装完了
- [ ] FilterPanel.jsx でフィルタリング動作
- [ ] Pagination コンポーネント動作
- [ ] 製品API呼び出し成功
- [ ] カテゴリーフィルター機能
- [ ] 検索機能

### Phase 3: 注文・レビュー UI（推奨事項）

- [ ] OrderList.jsx でユーザーの注文履歴表示

### 将来追加（未実装）

- [ ] OrderDetail.jsx で注文詳細表示
- [ ] ReviewForm.jsx でレビュー投稿フォーム
- [ ] レビュー表示・フィルタリング
- [ ] 星評価表示
- [ ] 認証・ユーザー情報取得

