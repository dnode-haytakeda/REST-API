# フロントエンド改善手順書

## 📋 目次
1. [現状分析](#現状分析)
2. [改善項目概要](#改善項目概要)
3. [改善手順](#改善手順)
   - [手順1: リセットCSSの導入](#手順1-リセットcssの導入)
   - [手順2: バリデーション処理のクライアント側実装](#手順2-バリデーション処理のクライアント側実装)
   - [手順3: 検索機能UIの改善](#手順3-検索機能uiの改善)
   - [手順4: 人気製品表示機能の実装](#手順4-人気製品表示機能の実装)
4. [テスト方法](#テスト方法)
5. [学習ポイント](#学習ポイント)

---

## 現状分析

### 現在の構成
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx          # マイページホームタブ（現在空）
│   │   ├── ProductList.jsx        # 製品一覧ページ
│   │   └── ProductDetail.jsx      # 製品詳細ページ
│   ├── components/
│   │   ├── FilterPanel.jsx        # フィルター機能
│   │   └── Header.jsx             # 検索バー含む
│   ├── hooks/
│   │   └── useProducts.js         # 製品取得フック
│   ├── services/
│   │   └── productsAPI.js         # 製品API通信
│   └── styles/
│       ├── global.css             # グローバルスタイル
│       └── components.css         # コンポーネントスタイル
```

### 現在の問題点

#### 1. **リセットCSSが不十分**
- 現在は簡易的なリセット（`*`, `body`等）のみ
- ブラウザごとにデフォルトスタイルが異なるため、Chrome、Safari、Firefoxなどで表示が微妙に異なる可能性がある
- 例: フォーム要素（`<input>`, `<button>`）のスタイルはブラウザ依存度が高い

#### 2. **クライアント側のバリデーション不足**
現在の`FilterPanel.jsx`では、以下のような不適切な入力でもバックエンドにリクエストが送信される:
```javascript
// 問題例:
// - 最小価格 > 最大価格 (例: min=1000, max=500)
// - 負の数値 (例: min=-100)
// - 極端に大きな数値 (例: max=999999999999)
```

これにより:
- **無駄なAPIリクエスト**が発生（サーバーリソースの浪費）
- **ユーザー体験の低下**（サーバーからエラーが返るまで待たされる）

#### 3. **検索機能の位置づけが不明確**
- Headerに検索バーがあるが、検索タイプ（AND/OR）の説明がない
- ユーザーが「複数キーワード検索」をどう入力すべきかわからない

#### 4. **マイページホームタブが空**
- `Dashboard.jsx`に「おすすめ製品や新着情報をここに表示します」とあるが未実装
- ユーザーが最初に訪れるページなのに情報が何もない

---

## 改善項目概要

| 改善項目 | 目的 | 優先度 |
|---------|------|--------|
| リセットCSS導入 | クロスブラウザ対応 | 高 |
| クライアント側バリデーション | 無駄なリクエスト削減 | 高 |
| 検索UI改善 | ユーザビリティ向上 | 中 |
| 人気製品表示 | ホームタブの充実化 | 高 |

---

## 改善手順

### 手順1: リセットCSSの導入

#### 📘 解説
**リセットCSS**とは、ブラウザごとに異なるデフォルトスタイルを統一するためのCSSです。主な選択肢:
- **normalize.css**: ブラウザ間の差異を最小限に修正（推奨）
- **modern-normalize**: 最新ブラウザ向けのnormalize.css
- **reset.css**: 全てのスタイルを完全にリセット

今回は**modern-normalize**を採用します（モダンブラウザに最適化されており、ファイルサイズも小さい）。

---

#### 1.1 パッケージのインストール

```bash
npm install modern-normalize
```

**ファイルパス:** `frontend/`（ターミナルでこのディレクトリに移動してから実行）

**解説:**  
- `modern-normalize`はnpmパッケージとして提供されているため、`npm install`でインストール
- インストール後、`node_modules/modern-normalize/modern-normalize.css`が利用可能になる

---

#### 1.2 リセットCSSの読み込み

**ファイルパス:** `frontend/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ↓↓↓ 追加: リセットCSS（必ず一番最初に読み込む）
import "modern-normalize/modern-normalize.css";

import "./styles/global.css";
import "./styles/components.css";

// 以下は既存のコード...
```

**解説:**
- **読み込み順が重要**: リセットCSSは必ず`global.css`より前に読み込む
- なぜなら、後から読み込んだCSSが優先されるため（カスケーディング）
- これにより、全てのブラウザで統一されたベーススタイルが適用される

---

#### 1.3 グローバルCSSの調整

**ファイルパス:** `frontend/src/styles/global.css`

既存のリセット部分を調整します:

```css
/* 既存の*によるリセットは削除または簡略化 */
/* modern-normalizeがベースを整えてくれるため、最小限のリセットでOK */

html,
body {
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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

/* 以下は既存のままでOK */
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

**解説:**
- `*`による全要素へのリセットは削除（modern-normalizeが担当）
- `font-family`を**システムフォント**に変更（-apple-system等）
  - メリット: OSネイティブのフォントを使うため、読みやすく高速
  - macOS: San Francisco、Windows: Segoe UI、など

---

### 手順2: バリデーション処理のクライアント側実装

#### 📘 解説
**クライアント側バリデーション**は、サーバーにリクエストを送る前にフロントエンドで入力をチェックする処理です。

**メリット:**
1. **即座のフィードバック**: ユーザーが入力した瞬間にエラー表示
2. **サーバー負荷軽減**: 不正なリクエストがサーバーに到達しない
3. **UX向上**: ページ遷移なしでエラー修正可能

**注意点:**
- クライアント側バリデーションは**補助的**なもの
- サーバー側バリデーションも**必須**（セキュリティ上、クライアント側は改竄可能なため）

---

#### 2.1 utilsディレクトリとバリデーション関数の作成

**まず、utilsディレクトリを作成します:**

```bash
# frontendディレクトリで実行
cd /Users/haytakeda/Sites/RESTAPI/frontend
mkdir -p src/utils
```

**ファイルパス:** `frontend/src/utils/validators.js`（新規作成）

```javascript
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

  // 極端に大きな値のチェック（例: 1億円以上）
  const MAX_PRICE_LIMIT = 100000000; // 1億円
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

**解説:**
- **`validatePriceRange`**: 価格帯フィルター専用のバリデーション
  - `null`チェック: 未入力の場合はフィルタ無効として扱う
  - 負の数、min > max、極端な数値をチェック
  - エラーメッセージを日本語で返す（ユーザーフレンドリー）

- **`validateNumber`**: 汎用的な数値バリデーション
  - `options`で柔軟にカスタマイズ可能
  - 他のページ（ProductDetailの数量入力など）でも再利用可能

---

#### 2.2 FilterPanelの改善

**ファイルパス:** `frontend/src/components/FilterPanel.jsx`

```jsx
import { useState, useEffect } from "react";
import { categoriesAPI } from "../services/categoriesAPI";
import { validatePriceRange } from "../utils/validators"; // ← 追加

const FilterPanel = ({ onFilter }) => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category_id: null,
    min_price: null,
    max_price: null,
    sort: "created_at",
  });
  
  // ↓↓↓ 追加: バリデーションエラー状態
  const [priceError, setPriceError] = useState(null);

  // カテゴリー読み込み（既存）
  useEffect(() => {
    categoriesAPI
      .getActive()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // ↓↓↓ 修正: 入力変更時はローカル状態だけ更新（APIは呼ばない）
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // 価格入力時のみバリデーション
    if (key === "min_price" || key === "max_price") {
      const validation = validatePriceRange(
        newFilters.min_price,
        newFilters.max_price
      );
      
      if (!validation.isValid) {
        setPriceError(validation.error);
        return;
      } else {
        setPriceError(null);
      }
    }
  };

  // ↓↓↓ 追加: 「適用」押下時にのみフィルター実行（全フィールド対象）
  const handleApplyFilter = () => {
    const validation = validatePriceRange(filters.min_price, filters.max_price);
    if (!validation.isValid) {
      setPriceError(validation.error);
      return;
    }

    setPriceError(null);
    // category_id / min_price / max_price / sort をまとめて適用
    onFilter(filters);
  };

  return (
    <aside className="filter-panel">
      <h3>フィルター</h3>

      {/* カテゴリー（既存） */}
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

      {/* ↓↓↓ 修正: 価格帯（エラー表示追加） */}
      <div className="filter-group">
        <label>価格帯</label>
        <div className="price-inputs">  {/* ← divでラップ */}
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
        {/* ↓↓↓ 追加: エラーメッセージ表示 */}
        {priceError && (
          <p className="validation-error">{priceError}</p>
        )}
      </div>

      {/* ソート（既存） */}
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

      {/* ↓↓↓ 追加: 適用ボタン（カテゴリー・価格帯・ソートを一括適用） */}
      <button
        className="btn btn-primary full-width"
        onClick={handleApplyFilter}
        disabled={Boolean(priceError)}
      >
        フィルターを適用
      </button>

      {/* リセット（既存） */}
      <button
        className="btn btn-outline full-width"
        onClick={() => {
          setFilters({
            category_id: null,
            min_price: null,
            max_price: null,
            sort: "created_at",
          });
          setPriceError(null); // ← エラーもクリア
          // リセットは明示的操作なので即時反映してOK
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

**解説:**
1. **`priceError`状態の追加**: エラーメッセージを保持
2. **`handleFilterChange`の修正**: 
  - 入力変更時はローカル状態更新のみ（**バックエンドには送らない**）
  - 価格入力時に`validatePriceRange`を呼び出してエラーを即時表示
3. **`handleApplyFilter`の追加**:
  - `適用`ボタン押下時に最終バリデーション
  - 正常時のみ`onFilter(filters)`を実行（この時点で初めてリクエスト）
  - `filters` に含まれる**全フィールド（カテゴリー・価格帯・ソート）**をまとめて適用
4. **エラー表示**: `{priceError && <p>...}`でエラーを表示
5. **HTML属性の追加**: `min="0"`, `step="100"`で入力をガイド

---

#### 2.3 エラーメッセージのスタイル追加

**ファイルパス:** `frontend/src/styles/components.css`

既存ファイルの末尾に追加:

```css
/* バリデーションエラーメッセージ */
.validation-error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  font-weight: 500;
}

/* フィルターパネル内の価格帯入力（filter-group内で価格入力を横並びに） */
.filter-group .price-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group .price-inputs input {
  flex: 1;
}

.filter-group .price-inputs span {
  color: #6c757d;
}

/* 適用ボタンとリセットボタンの間隔 */
.filter-panel .btn {
  margin-top: 0.5rem;
}
```

**解説:**
- **`.validation-error`**: 赤色（Bootstrap風）で目立つエラー表示
- **`.price-inputs`**: Flexboxで「最小～最大」を水平配置
- 既存の `.filter-group` スタイルを活用するため、追加のみ

---

### 手順3: 検索機能UIの改善

#### 📘 解説
現在の検索機能は以下の仕様:
- バックエンドで**FULLTEXT MATCH AGAINST (BOOLEAN MODE)**を使用
- `name`と`description`を対象にOR検索
- 日本語検索に対応（MySQLのFULLTEXTインデックス）

しかし、ユーザーはこの挙動を知りません。UIで明示する必要があります。

---

#### 3.1 検索バーのヘルプテキスト追加

**ファイルパス:** `frontend/src/components/Header.jsx`

既存のHeader.jsxを以下のように修正します（placeholderとヒントを追加）:

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
            placeholder="製品を検索...（スペース区切りでOR検索）"  {/* ← 修正 */}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary">
            検索
          </button>
          {/* ↓↓↓ 追加: 検索ヒント */}
          <small className="search-hint">
            例: 「ノートパソコン 軽量」で両方を含む製品を検索
          </small>
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

**解説:**
- **`placeholder`の変更**: 「スペース区切りでOR検索」を明示
- **`<small>`でヒント表示**: 例を示すことでユーザーの理解を助ける

---

#### 3.2 検索ヒントのスタイル追加

**ファイルパス:** `frontend/src/styles/components.css`

既存ファイルの末尾に以下を**追加**:

```css
/* 検索ヒント（既存のスタイルに追記） */
.search-hint {
  color: #6c757d;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  font-style: italic;
}
```

**注意:** `.search-form`スタイルは既に存在するため、修正は不要です。ヒントテキストのスタイルのみ追加してください
```

**解説:**
- **`flex-direction: column`**: 検索ボタンとヒントを縦に配置
- **`.search-hint`**: グレー色で控えめに表示

---

### 手順4: 人気製品表示機能の実装

#### 📘 解説
マイページのホームタブ（Dashboard）に「検索回数が多い製品」を表示します。

ただし、現状では**製品の閲覧数や検索回数のトラッキング機能がバックエンドに存在しない**ため、以下の2ステップで実装します:

**【今回のフロントエンド実装】**
1. バックエンドに`/products/popular`エンドポイントがあると仮定してフロントエンドを先行実装
2. ダミーデータで表示確認

**補足:** フロントエンドは `httpClient` のベースURLが `http://localhost:3000/api` です。  
そのため `httpClient.get("/products/popular")` は実際には `GET /api/products/popular` を呼び出します。

**【次のバックエンド実装】**
- 製品閲覧のトラッキング機能
- `product_views`テーブルの作成
- `/products/popular`エンドポイントの実装

→ バックエンド手順書で詳細を記載します。

---

#### 4.1 人気製品API関数の追加

**ファイルパス:** `frontend/src/services/productsAPI.js`

```javascript
import httpClient from "./httpClient";

export const productsAPI = {
  // 製品一覧取得（既存）
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
  },

  // ↓↓↓ 追加: 人気製品取得（閲覧数上位）
  getPopular: async (limit = 10) => {
    return httpClient.get("/products/popular", { limit });
  },

  // 製品詳細取得（既存）
  getDetail: async (id) => {
    return httpClient.get(`/products/${id}`);
  },

  // 製品作成（既存）
  create: async (productData) => {
    return httpClient.post("/products", productData);
  },

  // 製品更新（既存）
  update: async (id, updates) => {
    return httpClient.put(`/products/${id}`, updates);
  },

  // 製品削除（既存）
  delete: async (id) => {
    return httpClient.delete(`/products/${id}`);
  },
};
```

**解説:**
- **`getPopular`関数**: `/products/popular`にGETリクエスト
- `limit`パラメータで取得件数を指定（デフォルト10件）

---

#### 4.2 Dashboardページの改善

**ファイルパス:** `frontend/src/pages/Dashboard.jsx`

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
    // 人気製品を取得
    const fetchPopularProducts = async () => {
      try {
        const response = await productsAPI.getPopular(8); // 8件取得
        setPopularProducts(response.data || []);
      } catch (err) {
        console.error("Failed to fetch popular products:", err);
        setError("人気製品の取得に失敗しました");
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
      <p className="dashboard-subtitle">
        よく検索される製品をご紹介します
      </p>

      {error && <div className="error-message">{error}</div>}

      {/* 人気製品セクション */}
      <section className="popular-products-section">
        <div className="section-header">
          <h2>🔥 人気製品</h2>
          <Link to="/mypage/products" className="view-all-link">
            すべての製品を見る →
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
                      ⭐ {product.rating ? Number(product.rating).toFixed(1) : "未評価"}
                    </span>
                    {product.view_count && (
                      <span className="view-count">
                        👁️ {product.view_count.toLocaleString()} 回閲覧
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 追加の情報セクション（オプション） */}
      <section className="dashboard-info">
        <div className="info-card">
          <h3>🎁 新着製品</h3>
          <p>最新の製品をチェック</p>
          <Link to="/mypage/products?sort=created_at&order=desc" className="btn btn-outline">
            新着を見る
          </Link>
        </div>
        <div className="info-card">
          <h3>⭐ 高評価製品</h3>
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

**解説:**
1. **`useEffect`でデータ取得**: ページ読み込み時に`getPopular`を呼び出し
2. **`popularProducts`状態**: 取得した製品データを保持
3. **グリッド表示**: 8件の製品をカード形式で表示
4. **`view_count`の表示**: バックエンドから返される閲覧数を表示（後で実装）
5. **追加セクション**: 新着・高評価へのリンクも追加（UX向上）

---

#### 4.3 Dashboardのスタイル追加

**ファイルパス:** `frontend/src/styles/components.css`

既存ファイルの末尾に追加:

```css
/* ===================================
   Dashboard ページ
   =================================== */

.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.dashboard-subtitle {
  color: #6c757d;
  margin-bottom: 2rem;
}

/* 人気製品セクション */
.popular-products-section {
  margin-bottom: 3rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
}

.view-all-link {
  color: var(--primary-color, #007bff);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: var(--primary-dark, #0056b3);
}

/* 人気製品グリッド */
.popular-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.popular-product-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
  display: block;
}

.popular-product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

.popular-product-card .product-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.popular-product-card .product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popular-product-card .product-info {
  padding: 1rem;
}

.popular-product-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popular-product-card .product-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color, #007bff);
  margin-bottom: 0.5rem;
}

.popular-product-card .product-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #6c757d;
}

.view-count {
  font-size: 0.75rem;
}

/* ダッシュボード情報カード */
.dashboard-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
}

.info-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
}

.info-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.info-card p {
  color: #6c757d;
  margin-bottom: 1rem;
}
```

**解説:**
- **グリッドレイアウト**: `grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))`で自動調整
- **ホバーエフェクト**: カードにマウスを乗せると浮き上がる動き
- **レスポンシブ対応**: 画面幅に応じて列数が自動変更

---

## テスト方法

### 1. リセットCSSの確認

**手順:**
1. `npm run dev`でアプリケーション起動
2. Chrome、Firefox、Safariで開く
3. フォーム要素（入力欄、ボタン）のスタイルが統一されているか確認

**確認ポイント:**
- `<input>`の高さやパディングが各ブラウザで同じ
- ボタンのフォントサイズが統一されている

---

### 2. バリデーションの動作確認

**テストケース:**

| 操作 | 最小価格 | 最大価格 | 期待される動作 |
|------|---------|---------|---------------|
| 正常 | 1000 | 5000 | 入力時はリクエストなし、`適用`押下でフィルター実行 |
| 異常 | 5000 | 1000 | エラー表示「最小価格は最大価格以下に...」、`適用`しても送信されない |
| 異常 | -100 | 5000 | エラー表示「最小価格は0以上で...」 |
| 異常 | 1000 | 200000000 | エラー表示「最大価格は100,000,000円以下に...」 |
| 正常 | (空) | (空) | 入力時はリクエストなし、`適用`押下でフィルター実行 |

**追加テストケース（全フィールド一括適用の確認）:**

| 操作 | カテゴリー | ソート | 期待される動作 |
|------|-----------|-------|---------------|
| 入力のみ | PC周辺機器 | 評価が高い | 入力時はリクエストなし |
| 適用押下 | PC周辺機器 | 評価が高い | `category_id` と `sort` を含む1回のリクエスト送信 |
| 再変更のみ | 家電 | 新着順 | 変更時はリクエストなし |
| 再適用押下 | 家電 | 新着順 | 最新の全フィールド条件で1回送信 |

**実施方法:**
1. `/mypage/products`にアクセス
2. ブラウザの開発者ツールでNetworkタブを開く
3. 左側のフィルターパネルでカテゴリー・価格帯・ソートを変更（この時点ではリクエストが増えないことを確認）
4. `フィルターを適用`ボタンを押し、初めてリクエストが送信されることを確認
5. リクエストのクエリに、設定したカテゴリー・価格帯・ソートがすべて含まれていることを確認
6. 異常値入力時はエラーメッセージが表示され、`適用`しても送信されないことを確認

---

### 3. 検索UIの確認

**手順:**
1. ヘッダーの検索バーにマウスを乗せる
2. プレースホルダーに「スペース区切りでOR検索」が表示されているか
3. 下部にヒントテキストが表示されているか
4. 「ノート 軽量」で検索して結果を確認

---

### 4. 人気製品表示の確認

**注意:** バックエンドが未実装の場合、エラーメッセージが表示されます。

**手順:**
1. `/mypage`（ホーム）にアクセス
2. ローディング表示の後、「人気製品の取得に失敗しました」または製品一覧が表示される
3. バックエンド実装後、8件の製品がグリッドで表示されることを確認

**【ダミーデータでテストする場合】**

一時的に`Dashboard.jsx`の`useEffect`を以下に変更:

```jsx
useEffect(() => {
  // ダミーデータでテスト
  const dummyProducts = [
    { id: 1, name: "ノートパソコン", price: 89800, rating: 4.5, view_count: 1523, image_url: "" },
    { id: 2, name: "マウス", price: 2980, rating: 4.8, view_count: 892, image_url: "" },
    // ... 以下略
  ];
  setPopularProducts(dummyProducts);
  setLoading(false);
}, []);
```

---

## 学習ポイント

### 1. クライアント側バリデーションの重要性
- **目的**: UX向上 + サーバー負荷軽減
- **注意**: サーバー側バリデーションも必須（セキュリティ）
- **実装パターン**: 
  - 入力onChange時にリアルタイム検証
  - エラー状態を`useState`で管理
  - エラーがある場合はAPI呼び出しをスキップ

### 2. リセットCSSの役割
- **ブラウザ間の差異を吸収**: デフォルトスタイルは各ブラウザで異なる
- **選択肢**: 
  - `normalize.css`: 最小限の修正（推奨）
  - `reset.css`: 全てリセット（カスタマイズ前提）
- **読み込み順**: 必ずアプリのCSSより前に読み込む

### 3. Reactのカスタムフック活用
- **`useProducts`フック**: 製品取得ロジックを再利用可能に
- **メリット**: 
  - ページコンポーネントがシンプルになる
  - テストしやすい
  - 複数ページで同じロジックを共有可能

### 4. グリッドレイアウトの基本
```css
grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
```
- **`auto-fill`**: 列数を自動調整
- **`minmax(250px, 1fr)`**: 最小250px、最大は均等配分
- **レスポンシブ対応**: メディアクエリ不要で画面幅に追従

### 5. エラーハンドリングのベストプラクティス
- **try-catch-finally**: 非同期処理のエラー処理
- **エラー状態の管理**: `useState`でエラーメッセージを保持
- **ユーザーへのフィードバック**: エラー時は具体的なメッセージを表示

---

## 次のステップ

フロントエンドの改善が完了したら、次は**バックエンド手順書**に進んでください。

- `IMPROVEMENT_ROADMAP_BACKEND.md`: サーバー側のバリデーション、検索ロジック改善、人気製品APIの実装
- `IMPROVEMENT_ROADMAP_DB.md`: 閲覧数トラッキング用のテーブル追加

---

## トラブルシューティング

### Q1. modern-normalizeがインストールできない
```bash
# npmキャッシュをクリア
npm cache clean --force
npm install modern-normalize
```

### Q2. バリデーションエラーが表示されない
- ブラウザの開発者ツールでコンソールエラーを確認
- `validators.js`のインポートパスが正しいか確認
- `setPriceError`が正しく呼ばれているか`console.log`でデバッグ

### Q3. 人気製品が表示されない
- 現時点ではバックエンドAPIが未実装なため正常
- エラーメッセージ「人気製品の取得に失敗しました」が表示されればOK
- バックエンド実装後に自動的に表示される

---

**作成日:** 2026年2月25日  
**対象バージョン:** React 19.2.0, Vite 7.3.1  
**作成者:** 世界トップレベルエンジニア 🚀
