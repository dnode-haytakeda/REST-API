# ドキュメント品質監査レポート

**監査対象:** `docs/guides/01_DATABASE_GUIDE.md`, `02_BACKEND_GUIDE.md`, `03_FRONTEND_GUIDE.md`, `04_STARTUP_GUIDE.md`, `docs/INDEX.md`
**監査日:** 2025年
**手法:** 全ガイド内コードと実際のソースコードを1行単位で照合

---

## 総合サマリー

| 重大度     | 件数 |
|-----------|------|
| CRITICAL  | 7    |
| MAJOR     | 21   |
| MINOR     | 18   |
| **合計**  | **46** |

---

## 1. INDEX.md の問題

### 1-1. 所要時間の不一致 [MINOR]

- **箇所:** INDEX.md ガイド一覧テーブル
- **ガイド記載:** DB ガイド「約1〜2時間」 / Backend ガイド「約2〜3時間」
- **実際のガイド冒頭:** DB ガイド「約2〜3時間」（01_DATABASE_GUIDE.md 冒頭） / Backend ガイド「約4〜5時間」（02_BACKEND_GUIDE.md 冒頭）
- **影響:** 学習者の計画が狂う

### 1-2. システム構成図のポート番号 [MAJOR]

- **箇所:** INDEX.md システム構成図
- **ガイド記載:** `React Frontend (localhost:5173)`
- **実際:** Docker 環境では `localhost:3001` でフロントエンドを公開（docker-compose.yml で `3001:3000`）。`5173` は Vite 開発サーバー直接起動時のみ有効
- **影響:** Docker 経由での接続先を誤認する可能性

### 1-3. エンドポイント数の誇張 [MINOR]

- **箇所:** INDEX.md バックエンド紹介セクション
- **ガイド記載:** 「20+ エンドポイント実装」
- **実際:** 02_BACKEND_GUIDE.md の API エンドポイント一覧表は 16 件。実コードには `/api/products/popular` もあるが 20 には届かない（最大 17）
- **影響:** 学習者の期待値との乖離

### 1-4. CORS 設定の食い違い [MAJOR]

- **箇所:** INDEX.md トラブルシューティング セクション
- **ガイド記載:**
  ```js
  app.use(cors({ origin: [...], credentials: true }));
  ```
- **実際のソースコード:** `backend/src/app.js` → `app.use(cors())` （オプションなし）
- **影響:** トラブルシューティング手順に従っても、実コードと異なるため混乱する

### 1-5. テーブル数の表記揺れ [MINOR]

- **箇所:** INDEX.md 全体
- **ガイド記載:** INDEX.md では一貫して「7テーブル」
- **しかし:** 01_DATABASE_GUIDE.md Phase 3 完了時に「全6テーブルが作成されました」と明記（L825）。Phase 5 で product_views 追加後に 7 テーブルになる
- **影響:** 軽微。ガイド途中で混乱する可能性

---

## 2. 01_DATABASE_GUIDE.md の問題

### 2-1. Phase 3 完了時のテーブル数 [MINOR]

- **箇所:** L825 付近
- **ガイド記載:** 「全6テーブルが作成されました」
- **実際:** Phase 3 完了時点では users, product_categories, products, orders, order_items, reviews の 6 テーブルで正しい。ただし他箇所で「7テーブル」と書かれているため混乱のもと

### 2-2. SQL ファイル内容の照合結果 [情報]

以下のファイルはガイド記載と実ソースが **完全一致**:
- `db/init/00_init.sql`
- `db/migrations/001_create_users.sql`
- `db/migrations/002_create_product_tables.sql`
- `db/migrations/003_create_orders_reviews.sql`
- `db/migrations/004_add_auth_to_users.sql`
- `db/migrations/005_create_product_views.sql`
- `db/migrations/006_optimize_indexes.sql`
- `db/migrations/007_improve_fulltext_search.sql`
- `db/seeds/001_users.sql`
- `db/seeds/002_product_categories.sql`
- `db/seeds/003_products.sql`
- `db/seeds/007_auth_users.sql`
- `db/seeds/008_product_views_test.sql`
- `db/schema/001_users.sql`
- `db/docker-compose.yml`

**結論:** DB ガイドのコード品質は非常に高い。CRITICAL / MAJOR の問題なし。

---

## 3. 02_BACKEND_GUIDE.md の問題

### 3-1. `GET /api/products/:id` の認証要否が矛盾 [CRITICAL]

- **箇所:** ガイド Phase 3 API エンドポイント一覧表 + `routes/products.js` サンプルコード
- **ガイド記載:** 認証「不要」、コードに `authenticate` ミドルウェアなし
  ```js
  router.get("/:id", getProductDetail);
  ```
- **実際のソース** (`backend/src/routes/products.js`):
  ```js
  router.get("/:id", authenticate, getProductDetail);
  ```
- **影響:** ガイド通りに実装すると認証なしで商品詳細を取得でき、閲覧履歴記録（userId 取得）ができない。ガイドのエンドポイント表にも「不要」と明記されているため、学習者は実コードとの差異に混乱する

### 3-2. `/api/products/popular` エンドポイントの未記載 [CRITICAL]

- **箇所:** ガイド全体（Phase 3 routes/products.js, productController.js, productService.js, productModel.js, API エンドポイント一覧表）
- **ガイド記載:** 当該エンドポイントに関する記述が**一切なし**
- **実際のソース:** `backend/src/routes/products.js` に `router.get("/popular", getPopularProductsHandler)` が存在。関連する controller / service / model にも `getPopularProducts` / `findPopular` / `recordView` 関数が実装済み
- **影響:** フロントエンド (Dashboard) がこのエンドポイントを呼び出しているため、バックエンドガイド通りに実装すると Dashboard が動作しない

### 3-3. `productController.js` — `getProductDetail` の引数差異 [MAJOR]

- **箇所:** ガイド Phase 3 productController.js
- **ガイド記載:** `const product = await getProduct(id);`
- **実際のソース:**
  ```js
  const userId = req.user?.id || null;
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const product = await getProduct(id, userId, ipAddress);
  ```
- **影響:** 閲覧履歴記録の仕組みがガイドに説明されていない

### 3-4. `productService.js` — `getProduct` の引数差異 [MAJOR]

- **箇所:** ガイド Phase 3 productService.js
- **ガイド記載:** `getProduct(id)` のみ
- **実際のソース:** `getProduct(id, userId, ipAddress)` で、内部で `productModel.recordView(id, userId, ipAddress)` を呼び出す
- **影響:** 3-3 と同根。ガイドでは閲覧記録機能が完全に省略されている

### 3-5. `productModel.js` — `findPopular` / `recordView` の未記載 [MAJOR]

- **箇所:** ガイド Phase 3 productModel.js
- **ガイド記載:** `findAll`, `countAll`, `findById`, `create`, `update`, `deleteById` のみ
- **実際のソース:** 上記に加えて `findPopular` と `recordView` が実装されている
- **影響:** 人気製品機能が文書化されていない

### 3-6. `routes/products.js` — `getPopularProductsHandler` の未記載 [MAJOR]

- **箇所:** ガイド Phase 3 routes/products.js
- **ガイド記載:**
  ```js
  const { getProducts, getProductDetail, ... } = require("../controllers/productController");
  ```
- **実際のソース:** `getPopularProductsHandler` も import・登録されている
- **影響:** 3-2 と同根

### 3-7. `authController.js` — ソースコードに typo 2件 [MINOR — ソース側バグ]

- **箇所:** `backend/src/controllers/authController.js` L105 付近
- **実際のソース:** `"Account is desabled"` (正: `"disabled"`)、コメントに `"bcyrpt"` (正: `"bcrypt"`)
- **ガイド記載:** 正しく `"disabled"` / `"bcrypt"` と記載
- **影響:** ソース側の typo。ガイドの方が正しいが、ガイド通りに写経すると実コードと微妙に異なる

### 3-8. `productController.js` — エラーメッセージ末尾の不要スペース [MINOR — ソース側バグ]

- **箇所:** `backend/src/controllers/productController.js`
- **実際のソース:** `"Product not found "`, `"No fields to update "` （末尾にスペース）
- **ガイド記載:** 末尾スペースなし
- **影響:** 軽微。APIレスポンスのエラーメッセージが微妙に異なる

### 3-9. `nodemon` が devDependencies に存在しない [MAJOR]

- **箇所:** ガイド Phase 1 (L179, L193, L205)
- **ガイド記載:** `npm install --save-dev nodemon` を実行し、`"dev": "nodemon src/server.js"` スクリプトを追加
- **実際のソース:** `backend/package.json` に `devDependencies` セクション自体が**存在しない**。`scripts.dev` も未定義
- **影響:** ガイド通りに `npm run dev` を実行できない

### 3-10. `.env` の `JWT_EXPIRES_IN` デフォルト値 [MAJOR]

- **箇所:** ガイド Phase 4 (.env サンプル L238)
- **ガイド記載:** `JWT_EXPIRES_IN=7d`
- **04_STARTUP_GUIDE.md 記載:** `JWT_EXPIRES_IN=24h`
- **実際のソース:** `jwtUtils.js` のフォールバック値は `"7d"`
- **影響:** ガイド間で値が異なる。04 ガイド通りに設定すると 24 時間でトークン切れとなり、02 ガイドの説明（7日間）と食い違う

### 3-11. curl テスト例のレスポンスデータ不正 [MINOR]

- **箇所:** ガイド Phase 2 動作確認セクション
- **ガイド記載:** ユーザー作成レスポンスに `"id": 6, "name": "Charlie"` 、一覧取得に `"name": "Admin User"`
- **実際:** seed データ（001 + 007）投入後は ID=6 は `鈴木三郎`。`Admin User` という名前のユーザーはどの seed にも存在しない（管理者は `管理者` / `田中太郎（管理者）`）
- **影響:** 動作確認時にレスポンスが異なり混乱する可能性

### 3-12. ファイル一覧に `exampleVelidator.js` が未記載 [MINOR]

- **箇所:** ガイド Section 1.3 ファイル構成
- **ガイド記載:** validators ディレクトリに `authValidator.js`, `productValidator.js` のみ
- **実際のソース:** `backend/src/validators/exampleVelidator.js` が存在（ファイル名自体に typo: "Velidator"）
- **影響:** 軽微。未使用ファイルの可能性が高いが、文書化されていない

### 3-13. Dockerfile の構成差異 [MAJOR]

- **箇所:** ガイド末尾 Dockerfile セクション
- **ガイド記載:**
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  EXPOSE 3000
  CMD ["node", "src/server.js"]
  ```
- **実際のソース** (`backend/Dockerfile`):
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package.json package-lock.json ./
  RUN npm ci
  FROM node:20-alpine
  WORKDIR /app
  COPY --from=builder /app/node_modules ./node_modules
  COPY . .
  EXPOSE 3000
  CMD ["npm", "start"]
  ```
- **差異:** 実際はマルチステージビルド、`--only=production` なし、`CMD` が `npm start`
- **影響:** ガイド通りに Dockerfile を作成すると実際の構成と異なる

---

## 4. 03_FRONTEND_GUIDE.md の問題

### 4-1. `package.json` バージョン多数不一致 [MAJOR]

- **箇所:** ガイド Section 1.2 技術スタック / package.json サンプル
- **差異一覧:**

| パッケージ | ガイド記載 | 実際の package.json |
|-----------|-----------|-------------------|
| react | `^19.1.0` | `^19.2.0` |
| react-dom | `^19.1.0` | `^19.2.0` |
| react-router-dom | `^7.6.1` | `^7.0.0` |
| @vitejs/plugin-react | `^4.4.1` | `^5.1.1` |
| eslint | `^9.25.0` | `^9.39.1` |
| eslint-plugin-react-hooks | `^5.2.0` | `^7.0.1` |
| eslint-plugin-react-refresh | `^0.4.19` | `^0.4.24` |
| globals | `^16.0.0` | `^16.5.0` |
| vite | `^7.0.0` | `^7.3.1` |
| @types/react | `^19.1.2` | `^19.2.7` |
| @types/react-dom | `^19.1.2` | `^19.2.3` |
| @eslint/js | `^9.25.0` | `^9.39.1` |

- **影響:** `npm install` 実行時にガイドと異なるバージョンが入る。特に `@vitejs/plugin-react` のメジャーバージョン差（4→5）と `eslint-plugin-react-hooks` のメジャーバージョン差（5→7）は breaking change の可能性

### 4-2. `main.jsx` — 構造が大幅に異なる [CRITICAL]

- **箇所:** ガイド Phase 7 main.jsx
- **主要差異:**

| 項目 | ガイド記載 | 実際のソース |
|------|-----------|-------------|
| import スタイル | `import { StrictMode } from "react"` | `import React from "react"` |
| createRoot | `import { createRoot } from "react-dom/client"` | `import ReactDOM from "react-dom/client"` |
| StrictMode | `<StrictMode>` で囲む | StrictMode なし |
| Router | `<BrowserRouter>` | `<BrowserRouter as Router>` |
| modern-normalize | `import "modern-normalize"` | `import "modern-normalize/modern-normalize.css"` |
| variables.css | `import "./styles/variables.css"` | インポートなし |
| index.css | インポートなし | `./index.css` もインポートなし（ファイルは存在） |
| 構造 | インラインで `createRoot().render()` | `function RootApp()` ラッパー関数 |
| 404 ページ | `<h1>404</h1>` + padding スタイル | `<div>ページが見つかりません</div>` |
| admin ProtectedRoute | `redirectTo` なし | `redirectTo="/admin/login"` |

- **影響:** ガイド通りに main.jsx を作成すると実際のアプリケーションとは根本的に異なる構成になる

### 4-3. `categoriesAPI.js` — import 方式の差異 [MAJOR]

- **箇所:** ガイド L1549 FilterPanel.jsx コード内
- **ガイド記載:** `import categoriesAPI from "../services/categoriesAPI.js"` (default import)
- **実際のソース:** `import { categoriesAPI } from "../services/categoriesAPI"` (named import、拡張子なし)
- **影響:** ガイド通りに書くと `categoriesAPI` は `undefined` になる

### 4-4. `categoriesAPI.getActive()` のレスポンス処理差異 [MAJOR]

- **箇所:** ガイド L1574 FilterPanel.jsx
- **ガイド記載:** `const response = await categoriesAPI.getActive(); setCategories(response.data || []);`
- **実際のソース:** `categoriesAPI.getActive().then(setCategories)` （`.data` アクセスなし、直接 setCategories）
- **実際の `categoriesAPI.getActive()`:** `httpClient.get("/products/categories", { is_active: true })` を返す
- **影響:** `.data` プロパティの有無でカテゴリデータが取れるかどうか変わる

### 4-5. `FilterPanel.jsx` — 設計が大幅に異なる [CRITICAL]

- **箇所:** ガイド Section 5.6
- **主要差異:**

| 項目 | ガイド記載 | 実際のソース |
|------|-----------|-------------|
| props | `{ onFilter, currentFilters }` | `{ onFilter }` のみ |
| state 管理 | 個別 state (`categoryId`, `minPrice` 等) | オブジェクト state (`filters`) |
| `order` state | あり (`"DESC"`) | なし |
| フィルター適用 | `handleApply()` | `handleApplyFilter()` |
| フィルターリセット | `handleReset()` 関数 | インライン onClick |
| 見出しテキスト | 「🔍 絞り込み」 | 「フィルター」 |
| 値の即時反映 | なし（「適用」ボタン式） | `handleFilterChange` でリアルタイムバリデーション + 適用ボタン |

- **影響:** コンポーネントの API（props）が異なるため、ガイド版の FilterPanel を使うと ProductList 側の呼び出しコードも変更が必要

### 4-6. `Dashboard.jsx` — `average_rating` vs `rating` [CRITICAL]

- **箇所:** ガイド L1368 Dashboard.jsx
- **ガイド記載:** `product.average_rating` を参照
  ```jsx
  ⭐ {Number(product.average_rating || 0).toFixed(1)}
  ```
- **実際のソース:** `product.rating` を参照
  ```jsx
  {product.rating ? Number(product.rating).toFixed(1) : "未評価"}
  ```
- **DB スキーマ:** products テーブルのカラム名は `rating` (DECIMAL(3,2))
- **影響:** ガイド通りに実装すると rating が常に `0.0` と表示される。最も基本的なデータバインディングの誤り

### 4-7. `Dashboard.jsx` — 表示テキスト差異 [MINOR]

- **箇所:** ガイド L1326
- **ガイド記載:** `<h1>ようこそ、{user?.name || "ゲスト"}さん！</h1>` （ユーザー名表示）
- **実際のソース:** `<h1>ホーム</h1>` （固定テキスト）
- **追加差異:**
  - ガイド: subtitle「最新のおすすめ商品をチェックしよう」
  - 実際: subtitle「よく検索される製品をご紹介します」
  - ガイド: 人気商品見出し「🔥 人気商品」+ 「すべて見る →」
  - 実際: 「🔥 人気製品」+ 「全ての製品を見る →」
  - ガイド: 新着カード「🆕 新着商品」
  - 実際: 「🎁 新着製品」
  - ガイド: 画像なし時に `<div>No Image</div>` のインラインスタイル表示
  - 実際: `<img src="/placeholder.jpg" />` にフォールバック

### 4-8. `Dashboard.jsx` — `order` パラメータ値の大文字/小文字 [MAJOR]

- **箇所:** ガイド L1384, L1391
- **ガイド記載:** `?sort=created_at&order=DESC` （大文字）
- **実際のソース:** `?sort=created_at&order=desc` （小文字）
- **影響:** バックエンドの `productService.js` が大文字/小文字をどう処理するかに依存。動作が異なる可能性

### 4-9. `ProductList.jsx` — useCart の import 差異 [MAJOR]

- **箇所:** ガイド L1847 ProductList.jsx
- **ガイド記載:** `import useCart from "../hooks/useCart.js";` + `const { addItem } = useCart();`
- **実際のソース:** useCart の import なし。ProductList では `useCart` を使用していない
- **影響:** ガイド通りに書くと不要な import。ProductCard 内で直接 cart 操作している

### 4-10. `ProductList.jsx` — filters の取得とフィルター適用の差異 [MAJOR]

- **箇所:** ガイド L1853
- **ガイド記載:**
  ```jsx
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { products, loading, error, pagination, filters, fetchProducts } = useProducts({
    page: 1, limit: 12, search: searchQuery,
  });
  ```
- **実際のソース:**
  ```jsx
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading, error, pagination, fetchProducts } = useProducts({
    search: searchParams.get("search") || undefined,
    sort: searchParams.get("sort") || undefined,
    order: searchParams.get("order") || undefined,
  });
  ```
- **差異:** 実際は `setSearchParams` も取得、`limit` 指定なし、`sort`/`order` もURL パラメータから取得、`filters` を使用していない

### 4-11. `productsAPI.js` — import 方式の差異 [MAJOR]

- **箇所:** ガイド Section 5.4 useProducts.js
- **ガイド記載:** `import productsAPI from "../services/productsAPI.js"` (default import)
- **実際のソース:** `import { productsAPI } from "../services/productsAPI"` (named import、拡張子なし)
- **影響:** ガイド通りに書くと productsAPI は `undefined` になり、API 呼び出しが全て失敗する

### 4-12. `useProducts.js` — `getList` の `order` デフォルト値 [MINOR]

- **箇所:** ガイドの productsAPI.js getList 内
- **ガイド記載:** デフォルトの `order` に明示的な値なし
- **実際のソース:** `order: filters.order || "asc"` (小文字 "asc")
- **ガイドの FilterPanel:** デフォルト `order: "DESC"` (大文字)
- **影響:** ガイド版 FilterPanel と実際の productsAPI でデフォルトの並び順方向が異なる

### 4-13. `LoginPage.jsx` — subtitle テキスト差異 [MINOR]

- **箇所:** ガイド L902
- **ガイド記載:** `<p className="auth-subtitle">アカウントにサインインしてください</p>`
- **実際のソース:** `<p className="auth-subtitle">エンドユーザーでログイン</p>`
- **影響:** 表示テキストのみ

### 4-14. `RegisterPage.jsx` — クラス名 typo [MINOR — ソース側バグ]

- **箇所:** `frontend/src/pages/RegisterPage.jsx` L49
- **実際のソース:** `className="auth-sbtitle"` (正: `auth-subtitle`)
- **ガイド記載:** `className="auth-subtitle"` (正しい)
- **影響:** CSS スタイルが適用されない

### 4-15. `RegisterPage.jsx` — subtitle テキスト差異 [MINOR]

- **箇所:** ガイド L1009
- **ガイド記載:** `<p className="auth-subtitle">アカウントを作成しましょう</p>`
- **実際のソース:** `<p className="auth-sbtitle">新規アカウントを作成</p>`

### 4-16. `AdminLoginPage.jsx` — subtitle テキスト差異 [MINOR]

- **箇所:** ガイド L1132
- **ガイド記載:** `<p className="auth-subtitle">管理者アカウントでサインイン</p>`
- **実際のソース:** `<p className="auth-subtitle">管理者アカウントでログイン</p>`

### 4-17. `SelectRole.jsx` — 構造差異 [MINOR]

- **箇所:** ガイド Phase 3 SelectRole.jsx
- **ガイド記載:** カード2枚 (`role-card` クラス) + emoji + 説明文付き、`useNavigate` + `Link` の2つを import
- **実際のソース:** シンプルなボタン2つ (`btn btn-primary` クラス) のみ、`useNavigate` のみ import
- **影響:** 見た目が異なるが機能は同等

### 4-18. `ProductCard.jsx` — `average_rating` vs `rating` [CRITICAL]

- **箇所:** ガイド L1742 ProductCard.jsx
- **ガイド記載:**
  ```jsx
  ⭐ {Number(product.average_rating || 0).toFixed(1)}
  ```
- **実際のソース:**
  ```jsx
  ★ {product.rating ? Number(product.rating).toFixed(1) : "未評価"}
  ```
- **影響:** 4-6 と同根。ガイドのフィールド名が DB スキーマと一致しない

### 4-19. `ProductDetail.jsx` — `average_rating` vs `rating` [CRITICAL]

- **箇所:** ガイド L2017
- **ガイド記載:** `product.average_rating`
- **実際のソース:** `product.rating`
- **影響:** 4-6, 4-18 と同根

### 4-20. `Header.jsx` — 検索の実装方式差異 [MINOR]

- **箇所:** ガイド Header.jsx
- **ガイド記載:** `navigate(\`/mypage/products?search=...\`)` (React Router navigate)
- **実際のソース:** `window.location.href = \`/mypage/products?search=...\`` (フルページリロード)
- **影響:** 実際のソースではブラウザが完全リロードするため、SPA の客体ナビゲーションにならない

### 4-21. `Dockerfile` — ステージ名差異 [MINOR]

- **箇所:** ガイド Section 8.2
- **ガイド記載:** ステージ名 `build`
- **実際のソース:** ステージ名 `builder`
- **実際のソースでは** `package.json package-lock.json` を明示的にコピー、ガイドは `package*.json`
- **影響:** 機能的には同等

### 4-22. テスト用アカウント表の説明誤り [MINOR]

- **箇所:** ガイド Section 9.3
- **ガイド記載:** alice@example.com を「001_users.sql で作成」と記述
- **実際:** `001_users.sql` は name と email のみの INSERT で password カラムなし。パスワードは `007_auth_users.sql` の UPDATE 文で設定される
- **影響:** 学習者が seed ファイルの関係を誤解する可能性

### 4-23. CORS 設定の食い違い（INDEX.md と同根） [MAJOR]

- **箇所:** ガイド Section 10.3
- **ガイド記載:**
  ```js
  app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3001"],
    credentials: true,
  }));
  ```
- **実際のソース:** `app.use(cors())` （制限なし）
- **影響:** 1-4 と同根

---

## 5. 04_STARTUP_GUIDE.md の問題

### 5-1. `JWT_EXPIRES_IN` の値が 02 ガイドと不一致 [MAJOR]（3-10 と同根）

- **箇所:** L162, L209
- **ガイド記載:** `JWT_EXPIRES_IN=24h`
- **02_BACKEND_GUIDE.md 記載:** `JWT_EXPIRES_IN=7d`
- **ソースのデフォルト:** `"7d"`
- **影響:** 再掲。ガイド間の整合性が取れていない

### 5-2. テスト用アカウント表の seed ファイル参照誤り [MINOR]

- **箇所:** テストアカウント表
- **ガイド記載:** alice@example.com は「001_users.sql」で作成
- **実際:** 001_users.sql は email と name のみ。パスワード設定は 007_auth_users.sql
- **影響:** 4-22 と同根

### 5-3. `docker-compose.yml` の `command` フォーマット差異 [MINOR]

- **箇所:** docker-compose.yml サンプル
- **ガイド記載:** `command: >-` (YAML 折りたたみスカラー)
- **実際のソース:** 単一行 `command:` フォーマット
- **影響:** 機能的に同等。YAML の書き方の違いのみ

---

## 6. クロスガイド整合性の問題

### 6-1. CORS 設定の一貫性なし

- INDEX.md: `cors({ origin: [...], credentials: true })`
- 03_FRONTEND_GUIDE.md Section 10.3: 同上
- 実際のソース: `cors()` (引数なし)
- 02_BACKEND_GUIDE.md Phase 1 app.js: `cors()` (引数なし) ← **こちらが正しい**
- **結論:** 02 ガイドの app.js コードは正しいが、INDEX.md と 03 ガイドのトラブルシューティングセクションが矛盾

### 6-2. フロントエンドの `productsAPI` / `categoriesAPI` の import 方式

- 03_FRONTEND_GUIDE.md: default import (`import productsAPI from ...`)
- 実際のソース: named import (`import { productsAPI } from ...`)
- **影響:** ガイド通りに書くとアプリが動作しない

### 6-3. `average_rating` vs `rating` の一貫性なし

- 03_FRONTEND_GUIDE.md: 全ページで `product.average_rating` を参照
- 実際の全フロントエンドソース: `product.rating` を使用
- DB スキーマ (`products` テーブル): カラム名は `rating`
- **結論:** ガイドが全箇所で間違っている

---

## 7. ソースコード側のバグ（ガイドは正しいがソースに問題）

| # | ファイル | 問題 | 重大度 |
|---|---------|------|--------|
| 1 | `backend/src/controllers/authController.js` | `"Account is desabled"` → `"disabled"` | MINOR |
| 2 | `backend/src/controllers/authController.js` | コメント `"bcyrpt"` → `"bcrypt"` | MINOR |
| 3 | `backend/src/controllers/productController.js` | エラーメッセージ末尾の不要スペース | MINOR |
| 4 | `backend/src/validators/exampleVelidator.js` | ファイル名 typo `"Velidator"` → `"Validator"` | MINOR |
| 5 | `frontend/src/pages/RegisterPage.jsx` L49 | `className="auth-sbtitle"` → `"auth-subtitle"` | MINOR |
| 6 | `frontend/src/components/Header.jsx` | `window.location.href` での検索（SPA非準拠） | MINOR |

---

## 8. 推奨対応の優先順位

### 最優先（CRITICAL — アプリが動作しない / データ不正）

1. **`average_rating` → `rating` に統一** (4-6, 4-18, 4-19) — 03_FRONTEND_GUIDE.md 全箇所
2. **`/api/products/popular` エンドポイントの文書化** (3-2, 3-3, 3-4, 3-5, 3-6) — 02_BACKEND_GUIDE.md に追加
3. **`GET /products/:id` の認証要否修正** (3-1) — ガイドの表と routes コードを更新
4. **`main.jsx` のコード更新** (4-2) — ガイドを実ソースに合わせる or その逆
5. **`FilterPanel.jsx` の設計統一** (4-5) — ガイドと実ソースの乖離解消
6. **named import への修正** (4-3, 4-11) — `import { productsAPI }` / `import { categoriesAPI }`

### 高優先（MAJOR — 混乱 / 一部動作不良）

7. `JWT_EXPIRES_IN` の統一 (3-10, 5-1) — ガイド間で値を揃える
8. バージョン番号の更新 (4-1) — package.json をどちらかに統一
9. `nodemon` の devDependency 追加 (3-9) — ソースまたはガイドを修正
10. CORS 設定の統一 (1-4, 6-1, 4-23) — 全ガイドで実ソースに合わせる
11. Backend Dockerfile の修正 (3-13) — ガイドを実ソースに合わせる

### 通常（MINOR — 表記揺れ / typo）

12. ソースコード側の typo 修正 (7-1〜7-6)
13. 各画面のテキスト統一
14. 所要時間・エンドポイント数の修正

---

**以上**
