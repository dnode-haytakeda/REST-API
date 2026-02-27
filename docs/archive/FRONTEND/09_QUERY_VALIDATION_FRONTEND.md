# 追加開発ガイド: クエリパラメータバリデーション（フロントエンド編）

> **目的:** フロントエンド側でも不正なクエリパラメータを検出し、バックエンドに送信する前にブロックする  
> **対象:** フロントエンド（React / Vite）  
> **前提:** `05_QUERY_VALIDATION_BACKEND.md` のバックエンド実装が完了していること  
> **作成日:** 2026-02-27

---

## 目次

1. [この開発で学べること](#1-この開発で学べること)
2. [フロントエンド側でもバリデーションが必要な理由](#2-フロントエンド側でもバリデーションが必要な理由)
3. [手順 1: クエリバリデータの作成](#3-手順-1-クエリバリデータの作成)
4. [手順 2: useProducts フックの修正](#4-手順-2-useproducts-フックの修正)
5. [手順 3: ProductList ページの修正](#5-手順-3-productlist-ページの修正)
6. [手順 4: productsAPI のエラーハンドリング改善](#6-手順-4-productsapi-のエラーハンドリング改善)
7. [動作確認](#7-動作確認)

---

## 1. この開発で学べること

| テーマ | 学習内容 |
|---|---|
| **多層防御** | フロントエンド＋バックエンドの二重バリデーション |
| **URLSearchParams** | ブラウザURL操作とクエリパラメータ管理 |
| **カスタムフックの拡張** | 既存フックにバリデーション機能を追加 |
| **ユーザーフレンドリーなエラー** | バリデーションエラー時のUI表示 |

---

## 2. フロントエンド側でもバリデーションが必要な理由

バックエンドでバリデーションを実装しましたが、フロントエンドにも追加する理由：

```
❌ バックエンドだけ: 不正URL → ネットワーク通信 → 400エラー → ユーザーにエラー表示
✅ フロント+バック: 不正URL → フロントで即ブロック → ネットワーク通信なし → 高速レスポンス
```

1. **UX向上:** ネットワーク往復を待たず即座にエラー表示できる
2. **サーバー負荷軽減:** 明らかに不正なリクエストがサーバーに到達しない
3. **多層防御:** バックエンドのバリデーションが何らかの理由で突破されても、フロントが第一防御線として機能する

> **重要:** フロントエンドのバリデーションは「UX向上」が目的であり、セキュリティの主防御はバックエンドです（フロントエンドは開発者ツールでバイパス可能なため）。

---

## 3. 手順 1: クエリバリデータの作成

### ファイル: `frontend/src/utils/queryValidator.js`（新規作成）

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

---

## 4. 手順 2: useProducts フックの修正

### ファイル: `frontend/src/hooks/useProducts.js`（修正）

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

---

## 5. 手順 3: ProductList ページの修正

### ファイル: `frontend/src/pages/ProductList.jsx`（修正）

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

---

## 6. 手順 4: productsAPI のエラーハンドリング改善

### ファイル: `frontend/src/services/productsAPI.js`（修正不要・確認のみ）

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

---

## 7. 動作確認

### テストケース

| URL | 期待動作 |
|---|---|
| `/mypage/products` | 正常に全製品表示 |
| `/mypage/products?sort=price&order=asc` | 安い順で表示 |
| `/mypage/products?sort=created_at&order=desc` | 新着順で表示（Dashboard の「新着を見る」） |
| `/mypage/products?sort=rating&order=desc` | 評価順で表示（Dashboard の「高評価を見る」） |
| `/mypage/products?sort=xxx` | フロント側でエラーメッセージ表示 |
| `/mypage/products?order=xx:x;x` | フロント側でエラーメッセージ表示 |

### 確認チェックリスト

- [ ] Dashboard「新着を見る」→ 製品一覧が新着順で表示される
- [ ] Dashboard「高評価を見る」→ 製品一覧が評価順で表示される
- [ ] 手動で不正URLを入力 → エラーメッセージが表示される
- [ ] FilterPanel のフィルター → 正常に動作する
- [ ] ページネーション → 正常に動作する

---

**前提:** このガイドはバックエンド編（`05_QUERY_VALIDATION_BACKEND.md`）と組み合わせて実装してください。  
**次のステップ:** `07_VIEW_CACHE_BACKEND.md`（閲覧履歴キャッシュ）に進みます。
