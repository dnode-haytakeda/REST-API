# React フロントエンド設計ガイド - 完全版

> **このドキュメントの目的:** コードを見なくても、どこに何があって、どう動くかが完全に理解できる

## 📋 目次
1. [状態の所有権マップ](#状態の所有権マップ) ← **最重要**
2. [関数の定義場所マップ](#関数の定義場所マップ) ← **最重要**
3. [ファイル構造とコードの位置](#ファイル構造とコードの位置)
4. [状態変更フロー](#状態変更フロー)
5. [データフロー図](#データフロー図)
6. [実装パターン早見表](#実装パターン早見表)

---

## 状態の所有権マップ

### 🎯 一目でわかる状態の所在

| 状態名 | 型 | 定義場所（ファイル:行） | 実際の所有者 | スコープ | 用途 |
|--------|-----|----------------------|-----------|---------|------|
| **products** | `Array<Product>` | `useProducts.js:5` | ProductList | 画面全体 | 表示する製品リスト |
| **loading** | `boolean` | `useProducts.js:6` | ProductList | 画面全体 | ローディング表示制御 |
| **error** | `string\|null` | `useProducts.js:7` | ProductList | 画面全体 | エラーメッセージ表示 |
| **pagination** | `Object` | `useProducts.js:8` | ProductList | 画面全体 | ページネーション情報 |
| **filters** | `Object` | `useProducts.js:14` | ProductList | 画面全体 | 現在適用中のフィルター |
| **categories** | `Array<Category>` | `FilterPanel.jsx:5` | FilterPanel | FilterPanelのみ | カテゴリー選択肢 |
| **filters** | `Object` | `FilterPanel.jsx:6` | FilterPanel | FilterPanelのみ | フィルター入力値（UI用） |

### 重要ポイント：2つの「filters」の違い

```mermaid
graph LR
    subgraph "FilterPanel.jsx - UI制御用"
        FP_FILTERS[filters<br/>カテゴリー選択<br/>価格入力<br/>の現在値]
        style FP_FILTERS fill:#ff9800,color:#fff
    end
    
    subgraph "useProducts.js - データ取得用"
        UP_FILTERS[filters<br/>API呼び出しに<br/>使用した条件]
        style UP_FILTERS fill:#4caf50,color:#fff
    end
    
    FP_FILTERS -->|onFilter経由で通知| UP_FILTERS
    
    NOTE1[FilterPanel: ユーザーが今入力してる値]
    NOTE2[useProducts: 実際にAPIに送った値]
```

---

## 関数の定義場所マップ

### 🔧 状態を変更する関数の完全マップ

| 関数名 | 定義場所 | 引数 | 役割 | 変更する状態 | 呼び出し元 |
|--------|---------|------|------|------------|-----------|
| **fetchProducts** | `useProducts.js:17` | `newFilters: Object` | APIから製品取得 | products, loading, pagination, filters | useEffect, handleFilter, handlePageChange |
| **handleFilter** | `ProductList.jsx:16` | `filters: Object` | フィルター変更時の処理 | なし（fetchProductsを呼ぶ） | FilterPanel (onFilter経由) |
| **handlePageChange** | `ProductList.jsx:20` | `page: number` | ページ変更時の処理 | なし（fetchProductsを呼ぶ） | Pagination (onPageChange経由) |
| **handleFilterChange** | `FilterPanel.jsx:21` | `key: string, value: any` | フィルター入力時の処理 | filters (FilterPanel内) | select/input の onChange |

### 関数の呼び出しチェーン

```mermaid
graph TD
    USER[👤 ユーザー操作]
    
    subgraph "FilterPanel.jsx"
        ONCHANGE[onChange イベント]
        HFC[handleFilterChange<br/>21行目]
        ONFILTER[onFilter プロパティ]
    end
    
    subgraph "ProductList.jsx"
        HF[handleFilter<br/>16行目]
    end
    
    subgraph "useProducts.js"
        FP[fetchProducts<br/>17行目]
        SETPROD[setProducts<br/>30行目]
        SETLOAD[setLoading<br/>19, 38行目]
    end
    
    subgraph "React内部"
        RERENDER[再レンダリング]
    end
    
    USER --> ONCHANGE
    ONCHANGE --> HFC
    HFC --> ONFILTER
    ONFILTER --> HF
    HF --> FP
    FP --> SETPROD
    FP --> SETLOAD
    SETPROD --> RERENDER
    SETLOAD --> RERENDER
    RERENDER --> ProductList.jsx
    
    style HFC fill:#ff9800
    style HF fill:#2196f3
    style FP fill:#4caf50
    style SETPROD fill:#f44336,color:#fff
    style RERENDER fill:#9c27b0,color:#fff
```

---

## ファイル構造とコードの位置

### 📁 プロジェクト構造と状態・関数の配置

```
frontend/src/
│
├── pages/
│   └── ProductList.jsx ................... 画面全体（親コンポーネント）
│       ├─ 11行目: const [searchParams] ... URLパラメータ
│       ├─ 12行目: const { products, ... } useProductsから受け取る
│       ├─ 16行目: const handleFilter ...... フィルター変更ハンドラ（子→親通信の受け口）
│       ├─ 20行目: const handlePageChange .. ページ変更ハンドラ
│       └─ 29行目: return ( ............... JSX（表示部分）
│           ├─ 35行目: <FilterPanel onFilter={handleFilter} />
│           └─ 47行目: {products.map(...)} 製品一覧表示
│
├── hooks/
│   └── useProducts.js .................... 製品データ管理ロジック
│       ├─ 5行目:  const [products, setProducts] = useState([])
│       ├─ 6行目:  const [loading, setLoading] = useState(true)
│       ├─ 7行目:  const [error, setError] = useState(null)
│       ├─ 8行目:  const [pagination, setPagination] = useState({...})
│       ├─ 14行目: const [filters, setFilters] = useState(initialFilters)
│       ├─ 17行目: const fetchProducts = async (newFilters) => { ... }
│       │   ├─ 19行目: setLoading(true)
│       │   ├─ 28行目: const response = await productsAPI.getList(...)
│       │   ├─ 30行目: setProducts(response.data)
│       │   └─ 38行目: setLoading(false)
│       ├─ 42行目: useEffect(() => { fetchProducts() }, [])
│       └─ 48行目: return { products, loading, error, pagination, filters, fetchProducts }
│
├── components/
│   ├── FilterPanel.jsx ................... フィルターUI
│   │   ├─ 5行目:  const [categories, setCategories] = useState([])
│   │   ├─ 6行目:  const [filters, setFilters] = useState({ ... })
│   │   ├─ 21行目: const handleFilterChange = (key, value) => {
│   │   │   ├─ 22行目: const newFilters = { ...filters, [key]: value }
│   │   │   ├─ 23行目: setFilters(newFilters) ... 自分の状態更新
│   │   │   └─ 24行目: onFilter(newFilters) .... 親に通知
│   │   ├─ 14行目: useEffect(() => { カテゴリー取得 }, [])
│   │   └─ 27行目: return ( <aside>...</aside> )
│   │
│   ├── ProductCard.jsx ................... 製品カード（状態なし）
│   │   └── propsで受け取った製品データを表示するだけ
│   │
│   └── Pagination.jsx .................... ページネーション（状態なし）
│       └── propsで受け取ったページ情報を表示するだけ
│
└── services/
    └── productsAPI.js .................... API通信（状態なし）
        └── httpClientを使ってバックエンドと通信
```

### コンポーネント階層と状態の流れ

```mermaid
graph TB
    subgraph "ProductList.jsx - 画面全体"
        PL_TITLE["ProductList コンポーネント<br/>────────────"]
        PL_STATE["📦 状態（useProducts経由）<br/>• products: Array<br/>• loading: boolean<br/>• error: string|null<br/>• pagination: Object<br/>• filters: Object"]
        PL_FUNC["⚙️ 関数<br/>• handleFilter(filters)<br/>• handlePageChange(page)"]
        PL_JSX["🎨 JSX<br/>└─ FilterPanel<br/>└─ ProductCard (複数)<br/>└─ Pagination"]
    end
    
    subgraph "FilterPanel.jsx - フィルター部品"
        FP_TITLE["FilterPanel コンポーネント<br/>────────────"]
        FP_STATE["📦 自分だけの状態<br/>• categories: Array<br/>• filters: Object (UI用)"]
        FP_FUNC["⚙️ 関数<br/>• handleFilterChange(key, value)<br/>  ├─ setFilters() 自分更新<br/>  └─ onFilter() 親に通知"]
        FP_PROPS["📥 親から受け取る<br/>• onFilter: Function<br/>  (実体はhandleFilter)"]
    end
    
    subgraph "useProducts.js - ロジック"
        UP_TITLE["useProducts カスタムフック<br/>────────────"]
        UP_STATE["📦 状態を定義<br/>• useState() × 5個<br/>  (ProductListに属する)"]
        UP_FUNC["⚙️ 関数<br/>• fetchProducts(newFilters)<br/>  ├─ API呼び出し<br/>  ├─ setProducts()<br/>  └─ setPagination()"]
        UP_RETURN["📤 返す<br/>• products, loading, error<br/>• pagination, filters<br/>• fetchProducts"]
    end
    
    PL_TITLE --> PL_STATE
    PL_TITLE --> PL_FUNC
    PL_TITLE --> PL_JSX
    PL_STATE -.所有.- UP_STATE
    PL_FUNC --> UP_FUNC
    
    FP_TITLE --> FP_STATE
    FP_TITLE --> FP_FUNC
    FP_TITLE --> FP_PROPS
    FP_PROPS -.参照.- PL_FUNC
    
    UP_TITLE --> UP_STATE
    UP_TITLE --> UP_FUNC
    UP_TITLE --> UP_RETURN
    UP_RETURN --> PL_STATE
    
    style PL_STATE fill:#e3f2fd
    style FP_STATE fill:#fff3e0
    style UP_STATE fill:#e8f5e9
    style PL_FUNC fill:#bbdefb
    style FP_FUNC fill:#ffe0b2
    style UP_FUNC fill:#c8e6c9
```

---

## 状態変更フロー

### パターン1: FilterPanelの状態 → ProductListの状態

**目的:** フィルター入力値を元に製品リストを更新したい

#### ステップバイステップ

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant FP as FilterPanel.jsx
    participant PL as ProductList.jsx
    participant UP as useProducts.js
    participant API as productsAPI.js
    
    Note over FP: FilterPanel が持つ状態:<br/>filters = {category_id: null}
    
    U->>FP: カテゴリーを選択（例: "エレクトロニクス" = id:1）
    
    rect rgb(255, 152, 0, 0.1)
        Note right of FP: FilterPanel内の処理
        FP->>FP: onChange イベント発火
        FP->>FP: handleFilterChange("category_id", "1")<br/>📍 21行目
        FP->>FP: newFilters = {...filters, category_id: "1"}
        FP->>FP: setFilters(newFilters)<br/>📍 23行目<br/>FilterPanel自身の状態更新
    end
    
    rect rgb(33, 150, 243, 0.1)
        Note right of FP: 親への通知
        FP->>PL: onFilter(newFilters)<br/>📍 24行目<br/>= handleFilter(newFilters) 実行
    end
    
    rect rgb(33, 150, 243, 0.1)
        Note right of PL: ProductList内の処理
        PL->>UP: fetchProducts({category_id: "1", page: 1})<br/>📍 17行目
    end
    
    rect rgb(76, 175, 80, 0.1)
        Note right of UP: useProducts内の処理
        UP->>UP: setLoading(true)<br/>📍 19行目<br/>useProducts の loading 状態変更
        UP->>API: getList({category_id: "1", page: 1})<br/>📍 28行目
        API->>UP: response = {data: [...], pagination: {...}}
        UP->>UP: setProducts(response.data)<br/>📍 30行目<br/>useProducts の products 状態変更
        UP->>UP: setPagination(...)<br/>📍 31行目
        UP->>UP: setFilters({category_id: "1", page: 1})<br/>📍 32行目
        UP->>UP: setLoading(false)<br/>📍 38行目
    end
    
    rect rgb(156, 39, 176, 0.1)
        Note right of UP: React の再レンダリング
        UP->>PL: Reactが検知: 状態変更あり → ProductList再実行
        PL->>UP: useProducts() 再呼び出し<br/>useEffect は実行されない（[]）
        UP->>PL: return { products: [フィルター済み], loading: false, ... }
        PL->>PL: JSX再描画<br/>products.map で新しいリスト表示
    end
    
    PL->>U: フィルター済み製品を表示
```

#### コード対応表

| ステップ | ファイル | 行番号 | コード | 説明 |
|---------|---------|-------|--------|------|
| 1 | FilterPanel.jsx | 36 | `<select onChange={(e) => handleFilterChange(...)}` | ユーザー操作 |
| 2 | FilterPanel.jsx | 21 | `const handleFilterChange = (key, value) => {` | イベントハンドラ実行 |
| 3 | FilterPanel.jsx | 23 | `setFilters(newFilters)` | FilterPanel自身の状態更新 |
| 4 | FilterPanel.jsx | 24 | `onFilter(newFilters)` | 親への通知（ProductListのhandleFilter実行） |
| 5 | ProductList.jsx | 16 | `const handleFilter = async (filters) => {` | 受け取った関数実行 |
| 6 | ProductList.jsx | 17 | `await fetchProducts({ ...filters, page: 1 })` | useProducts の関数呼び出し |
| 7 | useProducts.js | 19 | `setLoading(true)` | loading状態変更（ProductListの状態） |
| 8 | useProducts.js | 28 | `const response = await productsAPI.getList(...)` | API呼び出し |
| 9 | useProducts.js | 30 | `setProducts(response.data)` | products状態変更（ProductListの状態） |
| 10 | - | - | React内部 | ProductList再レンダリングトリガー |
| 11 | ProductList.jsx | 12 | `const { products, ... } = useProducts(...)` | useProducts再実行 |
| 12 | useProducts.js | 42 | `useEffect(() => {...}, [])` | 実行されない（[]なので） |
| 13 | useProducts.js | 48 | `return { products, loading, ... }` | 最新の状態を返す |
| 14 | ProductList.jsx | 47 | `{products.map((product) => ...)}` | 新しいproductsで再描画 |

### パターン2: 初回表示（自動実行）

**目的:** ページを開いた瞬間に全製品を表示したい

#### ステップバイステップ

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant PL as ProductList.jsx
    participant UP as useProducts.js
    participant API as productsAPI.js
    
    U->>PL: /products にアクセス
    
    rect rgb(33, 150, 243, 0.1)
        Note right of PL: ProductList 初回実行
        PL->>PL: const ProductList = () => { ... }<br/>コンポーネント関数実行
        PL->>UP: useProducts({search: undefined})<br/>📍 12行目
    end
    
    rect rgb(76, 175, 80, 0.1)
        Note right of UP: useProducts 初回実行
        UP->>UP: const [products, setProducts] = useState([])<br/>📍 5行目<br/>初期値: []
        UP->>UP: const [loading, setLoading] = useState(true)<br/>📍 6行目<br/>初期値: true
        UP->>UP: useEffect(() => { fetchProducts() }, [])<br/>📍 42行目<br/>初回のみ実行される
        UP->>UP: fetchProducts() 呼び出し<br/>📍 17行目
        UP->>UP: setLoading(true)<br/>📍 19行目
        UP->>API: getList({ page: 1 })<br/>📍 28行目
    end
    
    rect rgb(33, 150, 243, 0.1)
        Note right of PL: 初回レンダリング
        UP->>PL: return { products: [], loading: true, ... }<br/>📍 48行目
        PL->>PL: JSX実行: loading が true なので<br/>📍 40行目
        PL->>U: <LoadingSpinner /> 表示
    end
    
    rect rgb(76, 175, 80, 0.1)
        Note right of UP: API取得完了
        API->>UP: response = {data: [...6個], pagination: {...}}
        UP->>UP: setProducts(response.data)<br/>📍 30行目<br/>products を [] → [...6個] に変更
        UP->>UP: setLoading(false)<br/>📍 38行目<br/>loading を true → false に変更
    end
    
    rect rgb(156, 39, 176, 0.1)
        Note right of UP: React の再レンダリング
        UP->>PL: 状態変更検知 → ProductList再実行
        PL->>UP: useProducts({search: undefined}) 再呼び出し
        UP->>UP: useEffect は実行されない（[]なので）
        UP->>PL: return { products: [...6個], loading: false, ... }
        PL->>PL: JSX実行: loading が false & products.length > 0<br/>📍 42-47行目
        PL->>U: {products.map(...)} で6個の製品表示
    end
```

---

## データフロー図

### 状態の依存関係

```mermaid
graph TD
    subgraph "ユーザー入力"
        INPUT1[カテゴリー選択]
        INPUT2[価格入力]
        INPUT3[並び順選択]
    end
    
    subgraph "FilterPanel の状態"
        FP_FILTERS[filters<br/>{category_id, min_price, max_price, sort}]
    end
    
    subgraph "ProductList の状態 (useProducts経由)"
        UP_FILTERS[filters<br/>API送信済みの条件]
        UP_PRODUCTS[products<br/>表示する製品リスト]
        UP_LOADING[loading<br/>読み込み中フラグ]
        UP_PAGINATION[pagination<br/>ページ情報]
    end
    
    subgraph "表示"
        DISPLAY1[フィルターUI]
        DISPLAY2[製品カード × N]
        DISPLAY3[ページネーション]
    end
    
    INPUT1 --> FP_FILTERS
    INPUT2 --> FP_FILTERS
    INPUT3 --> FP_FILTERS
    
    FP_FILTERS -.onFilter経由.-> UP_FILTERS
    UP_FILTERS --> UP_PRODUCTS
    UP_PRODUCTS --> DISPLAY2
    UP_LOADING --> DISPLAY2
    UP_PAGINATION --> DISPLAY3
    FP_FILTERS --> DISPLAY1
    
    style FP_FILTERS fill:#ff9800,color:#fff
    style UP_FILTERS fill:#4caf50,color:#fff
    style UP_PRODUCTS fill:#2196f3,color:#fff
    style UP_LOADING fill:#9c27b0,color:#fff
    style DISPLAY2 fill:#f44336,color:#fff
```

---

## 実装パターン早見表

### よくあるケース別の実装方法

#### ケース1: コンポーネントAの状態をコンポーネントBに反映したい

**方法:** 状態を親に持たせて、両方の子にpropsで渡す

```javascript
// ❌ 悪い例: 兄弟コンポーネント間で直接通信できない
<ComponentA />  ❌→  <ComponentB />

// ✅ 良い例: 親を経由する
const Parent = () => {
  const [state, setState] = useState();
  
  return (
    <>
      <ComponentA onChange={setState} />  // 親に通知
      <ComponentB value={state} />        // 親から受け取る
    </>
  );
};
```

**本プロジェクトでの実装:**
- ComponentA = FilterPanel（フィルター入力）
- ComponentB = ProductCard（製品表示）
- Parent = ProductList（両方を管理）

#### ケース2: 複雑なロジックを持つ状態管理

**方法:** カスタムフックに切り出す

```javascript
// ❌ 悪い例: ProductList に全部書く（200行超える）
const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  
  const fetchProducts = async () => { /* 複雑な処理 */ };
  useEffect(() => { /* ... */ }, []);
  
  return ( /* 表示 */ );
};

// ✅ 良い例: カスタムフックで分離
const useProducts = () => {
  // 複雑なロジック
  return { products, loading, fetchProducts };
};

const ProductList = () => {
  const { products, loading, fetchProducts } = useProducts();
  return ( /* 表示だけに集中 */ );
};
```

#### ケース3: 初回のみ実行したい処理

**方法:** useEffect の依存配列を空にする

```javascript
// ✅ 初回のみ実行
useEffect(() => {
  fetchProducts();  // 1回だけ
}, []);

// ❌ 毎回実行（無限ループの危険）
useEffect(() => {
  fetchProducts();  // 再レンダリングのたびに実行 → setProducts → 再レンダリング → ...
});

// ✅ filters が変わったときだけ実行
useEffect(() => {
  fetchProducts();
}, [filters]);
```

#### ケース4: 子から親に通知したい

**方法:** コールバック関数を props で渡す

```javascript
// 親コンポーネント
const Parent = () => {
  const handleChange = (value) => {
    console.log('子から通知:', value);
  };
  
  return <Child onChange={handleChange} />;
};

// 子コンポーネント
const Child = ({ onChange }) => {
  return (
    <button onClick={() => onChange('新しい値')}>
      クリック
    </button>
  );
};
```

**本プロジェクトでの実装:**
```javascript
// ProductList.jsx
<FilterPanel onFilter={handleFilter} />  // onFilter という名前で渡す

// FilterPanel.jsx
const FilterPanel = ({ onFilter }) => {
  onFilter(newFilters);  // 親の handleFilter が実行される
};
```

---

## クイックリファレンス

### 「〇〇したい」→「どうすればいいか」

| やりたいこと | 確認する場所 | キーワード |
|------------|------------|-----------|
| フィルター条件を変えて製品を再取得したい | ProductList.jsx 16行目 | handleFilter |
| ページ番号を変えて製品を再取得したい | ProductList.jsx 20行目 | handlePageChange |
| 製品データがどこにあるか知りたい | useProducts.js 5行目 | const [products] |
| ローディング中かどうか知りたい | useProducts.js 6行目 | const [loading] |
| フィルターのUIの値を変えたい | FilterPanel.jsx 6行目 | const [filters] (FilterPanel内) |
| フィルターを親に通知したい | FilterPanel.jsx 24行目 | onFilter(newFilters) |
| 初回に自動で製品を取得したい | useProducts.js 42行目 | useEffect(() => {...}, []) |
| APIを呼び出したい | useProducts.js 17-40行目 | fetchProducts |

---

## トラブルシューティング

### よくある問題と解決方法

#### Q1: フィルターを変更しても製品が更新されない

**チェックリスト:**
1. FilterPanel で onFilter を呼んでいるか？（FilterPanel.jsx 24行目）
2. ProductList で onFilter={handleFilter} を渡しているか？（ProductList.jsx 35行目）
3. handleFilter で fetchProducts を呼んでいるか？（ProductList.jsx 17行目）
4. fetchProducts で setProducts を呼んでいるか？（useProducts.js 30行目）

#### Q2: ページを開くたびに製品が取得されない

**チェックリスト:**
1. useEffect の依存配列が [] になっているか？（useProducts.js 42行目）
2. useEffect の中で fetchProducts() を呼んでいるか？（useProducts.js 43行目）

#### Q3: 状態が更新されても画面が変わらない

**チェックリスト:**
1. setProducts など setState 関数を使っているか？（直接 products = ... はNG）
2. useProducts の return に products が含まれているか？（useProducts.js 48行目）
3. ProductList で useProducts() を呼んでいるか？（ProductList.jsx 12行目）

---

**作成日:** 2026年2月18日  
**対象:** React製品一覧ページのアーキテクチャ  
**バージョン:** 2.0 (完全版)

```mermaid
graph TB
    subgraph "表示層（UI）"
        PL[ProductList<br/>製品一覧ページ<br/>📄 状態：表示ロジックのみ]
        FP[FilterPanel<br/>フィルター部品<br/>🎛️ 状態：フィルター条件]
        PC[ProductCard<br/>製品カード部品<br/>🎴 状態：なし]
    end
    
    subgraph "ロジック層"
        UP[useProducts<br/>カスタムフック<br/>🧠 状態：製品データ管理]
    end
    
    subgraph "データ層"
        API[productsAPI<br/>API通信<br/>🌐 状態：なし]
        BE[Backend API<br/>バックエンド<br/>💾 データベース]
    end
    
    PL --> UP
    PL --> FP
    PL --> PC
    UP --> API
    API --> BE
    FP -.onFilter.-> PL
    
    style PL fill:#e1f5ff
    style FP fill:#fff4e1
    style UP fill:#e8f5e9
    style API fill:#f3e5f5
```

---

## コンポーネント間の状態管理

### 状態の所有権

```mermaid
graph LR
    subgraph "ProductList が持つ状態"
        PS[製品リスト<br/>products: []]
        LS[読み込み状態<br/>loading: true/false]
        ES[エラー状態<br/>error: null/string]
        PGS[ページ情報<br/>pagination: {}]
    end
    
    subgraph "FilterPanel が持つ状態"
        FS[フィルター条件<br/>filters: {<br/>category_id,<br/>min_price,<br/>max_price<br/>}]
    end
    
    subgraph "useProducts が実際に保持"
        UP[useState で定義<br/>↓<br/>ProductList に属する]
    end
    
    PS --> UP
    LS --> UP
    ES --> UP
    PGS --> UP
    
    style PS fill:#4caf50,color:#fff
    style LS fill:#4caf50,color:#fff
    style ES fill:#4caf50,color:#fff
    style PGS fill:#4caf50,color:#fff
    style FS fill:#ff9800,color:#fff
    style UP fill:#2196f3,color:#fff
```

### なぜこうするのか？

| 状態 | 所有者 | 理由 |
|------|--------|------|
| **製品リスト** | ProductList（useProducts経由） | 画面全体で表示する必要があるため |
| **フィルター条件** | FilterPanel | フィルターUIの表示制御のため |
| **読み込み状態** | ProductList（useProducts経由） | ローディング表示は画面全体に影響するため |

---

## データフロー

### 初回読み込みフロー

```mermaid
sequenceDiagram
    participant User as 👤 ユーザー
    participant PL as ProductList
    participant UP as useProducts
    participant API as productsAPI
    participant BE as Backend
    
    User->>PL: ページを開く
    activate PL
    PL->>UP: useProducts() 呼び出し
    activate UP
    UP->>UP: useState で初期化<br/>products=[], loading=true
    UP->>UP: useEffect 実行<br/>fetchProducts()
    UP->>API: getList() 呼び出し
    activate API
    API->>BE: GET /api/products
    activate BE
    BE-->>API: {data: [...], pagination: {...}}
    deactivate BE
    API-->>UP: レスポンス返却
    deactivate API
    UP->>UP: setProducts([...])<br/>setLoading(false)
    UP-->>PL: {products: [...], loading: false}
    deactivate UP
    PL->>PL: JSX再描画
    PL-->>User: 製品一覧表示
    deactivate PL
```

### フィルター変更フロー

```mermaid
sequenceDiagram
    participant User as 👤 ユーザー
    participant FP as FilterPanel
    participant PL as ProductList
    participant UP as useProducts
    participant API as productsAPI
    participant BE as Backend
    
    User->>FP: カテゴリー選択
    activate FP
    FP->>FP: handleFilterChange<br/>setFilters({category_id: 1})
    FP->>FP: onFilter({category_id: 1})
    FP->>PL: handleFilter 呼び出し
    deactivate FP
    activate PL
    PL->>UP: fetchProducts({category_id: 1})
    deactivate PL
    activate UP
    UP->>UP: setLoading(true)
    UP->>API: getList({category_id: 1})
    activate API
    API->>BE: GET /api/products?category_id=1
    activate BE
    BE-->>API: フィルター済みデータ
    deactivate BE
    API-->>UP: レスポンス
    deactivate API
    UP->>UP: setProducts([フィルター済み])<br/>setLoading(false)
    Note over UP: 状態変更を検知
    UP->>PL: Reactが再レンダリング
    activate PL
    PL->>UP: useProducts() 再実行
    Note over UP: useEffect は実行されない（[]なので）
    UP-->>PL: {products: [フィルター済み], ...}
    deactivate UP
    PL->>PL: JSX再描画
    PL-->>User: フィルター済み製品表示
    deactivate PL
```

---

## なぜこの設計なのか？

### 問題：フィルター状態と製品状態は別の場所にある

```mermaid
graph TB
    subgraph "問題点"
        A[FilterPanel が<br/>フィルター条件を持つ]
        B[ProductList が<br/>製品データを持つ]
        C[どうやって連携する？🤔]
    end
    
    A --> C
    B --> C
    
    style C fill:#ff5252,color:#fff
```

### 解決策1：状態を上に上げる（❌ 複雑）

```mermaid
graph TB
    PL[ProductList]
    subgraph "ProductList内に全部書く"
        FS[フィルター状態]
        PS[製品状態]
        FF[フィルター変更関数]
        FP2[製品取得関数]
        API[API呼び出し]
    end
    
    PL --> FS
    PL --> PS
    PL --> FF
    PL --> FP2
    PL --> API
    
    Note1[❌ ProductListが<br/>200行超える]
    Note2[❌ ロジックと<br/>表示が混在]
    Note3[❌ 再利用不可]
    
    style Note1 fill:#ff5252,color:#fff
    style Note2 fill:#ff5252,color:#fff
    style Note3 fill:#ff5252,color:#fff
```

### 解決策2：カスタムフック（✅ シンプル）

```mermaid
graph TB
    subgraph "ProductList（シンプル）"
        PL[表示ロジックのみ<br/>50行]
    end
    
    subgraph "useProducts（再利用可能）"
        UP[製品データ管理<br/>60行]
    end
    
    subgraph "FilterPanel（独立）"
        FP[フィルターUI<br/>40行]
    end
    
    PL --> UP
    PL --> FP
    FP -.onFilter関数.-> PL
    
    Note1[✅ 関心の分離]
    Note2[✅ テスト容易]
    Note3[✅ 再利用可能]
    
    style Note1 fill:#4caf50,color:#fff
    style Note2 fill:#4caf50,color:#fff
    style Note3 fill:#4caf50,color:#fff
    style PL fill:#e1f5ff
    style UP fill:#e8f5e9
    style FP fill:#fff4e1
```

---

## 実行フロー詳細

### ProductList コンポーネントの実行

```mermaid
graph TD
    Start[ProductList 実行開始]
    
    Start --> A[useProducts を呼び出し]
    A --> B{初回レンダリング？}
    
    B -->|Yes| C[useProducts 初回実行]
    B -->|No| D[useProducts 再実行]
    
    C --> C1[useState 初期化<br/>products=[], loading=true]
    C --> C2[fetchProducts 関数定義]
    C --> C3[useEffect 実行<br/>fetchProducts 呼び出し]
    C --> C4[return 初期値]
    
    D --> D1[useState から最新値取得<br/>products=[...], loading=false]
    D --> D2[fetchProducts 関数再定義]
    D --> D3[useEffect 実行しない<br/>[] なので]
    D --> D4[return 最新値]
    
    C4 --> E[handleFilter 関数定義]
    D4 --> E
    
    E --> F[JSX 描画]
    F --> End[画面表示]
    
    style C3 fill:#4caf50,color:#fff
    style D3 fill:#ff9800,color:#fff
```

### 状態変更時の再レンダリング

```mermaid
stateDiagram-v2
    [*] --> 初回レンダリング
    
    初回レンダリング --> useEffect実行: []なので初回のみ
    useEffect実行 --> API取得中: fetchProducts()
    API取得中 --> setProducts実行: データ取得完了
    
    setProducts実行 --> 再レンダリング1: Reactが検知
    
    再レンダリング1 --> useEffect実行しない: []なので2回目以降は無視
    useEffect実行しない --> JSX再描画1: 最新のproductsで表示
    
    JSX再描画1 --> ユーザー待機: 表示完了
    
    ユーザー待機 --> フィルター変更: ユーザーが操作
    フィルター変更 --> handleFilter実行: FilterPanelから通知
    handleFilter実行 --> fetchProducts手動実行: 引数付きで呼び出し
    fetchProducts手動実行 --> API取得中2: フィルター条件で取得
    API取得中2 --> setProducts実行2: データ取得完了
    
    setProducts実行2 --> 再レンダリング2: Reactが検知
    再レンダリング2 --> useEffect実行しない2: []なので無視
    useEffect実行しない2 --> JSX再描画2: フィルター済みproductsで表示
    
    JSX再描画2 --> ユーザー待機
```

---

## コードレベルの対応表

### ProductList.jsx

```javascript
const ProductList = () => {
  // 🔵 useProducts から状態を受け取る
  const { products, loading, error, pagination, fetchProducts } = useProducts({
    search: searchParams.get("search") || undefined,
  });

  // 🟢 フィルター変更ハンドラ（FilterPanel に渡す関数）
  const handleFilter = async (filters) => {
    await fetchProducts({ ...filters, page: 1 });
  };

  return (
    <div>
      {/* 🟡 FilterPanel にハンドラを渡す */}
      <FilterPanel onFilter={handleFilter} />
      
      {/* 🔴 製品一覧を表示 */}
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

### useProducts.js（カスタムフック）

```javascript
const useProducts = (initialFilters = {}) => {
  // 🔵 状態を定義（ProductListに属する）
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🟢 製品取得関数を定義
  const fetchProducts = async (newFilters = {}) => {
    setLoading(true);
    const response = await productsAPI.getList(mergedFilters);
    setProducts(response.data);  // ← 状態変更 = 再レンダリングトリガー
    setLoading(false);
  };

  // 🟡 初回のみ実行（[] = 依存なし）
  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔴 状態と関数を返す（ProductListで使える）
  return { products, loading, fetchProducts };
};
```

### FilterPanel.jsx

```javascript
const FilterPanel = ({ onFilter }) => {
  // 🔵 フィルター条件の状態（自分だけが使う）
  const [filters, setFilters] = useState({
    category_id: null,
    min_price: null,
  });

  // 🟢 フィルター変更時
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);  // 自分の状態を更新
    onFilter(newFilters);    // 親（ProductList）に通知
  };

  return (
    <select onChange={(e) => handleFilterChange("category_id", e.target.value)}>
      <option value="">すべて</option>
    </select>
  );
};
```

---

## まとめ：設計の原則

```mermaid
mindmap
  root((React設計))
    コンポーネント分割
      UI部品は小さく
      再利用可能に
      単一責任の原則
    状態管理
      状態は適切な場所に
      上位で管理
      下位で使用
    カスタムフック
      ロジックを分離
      テストしやすく
      再利用可能に
    親子通信
      Props で下に渡す
      コールバックで上に通知
      一方向データフロー
```

### 3つの重要ルール

| ルール | 説明 | 例 |
|--------|------|-----|
| **1. 単一責任** | 1つのコンポーネントは1つの仕事 | FilterPanel はフィルターUIのみ |
| **2. 関心の分離** | 表示とロジックを分ける | useProducts でロジック分離 |
| **3. データは下る、イベントは上る** | Props で下、callback で上 | onFilter で親に通知 |

---

## よくある質問

### Q1: なぜ useState は useProducts 内にあるのに ProductList の状態なの？

**A:** useProducts は ProductList **の中で** 呼ばれているから。Reactはフックが「どのコンポーネントから呼ばれたか」を記録している。

```javascript
// ProductList の実行コンテキスト内
const ProductList = () => {
  const { products } = useProducts();  // ← ProductListの状態として登録
};
```

### Q2: useEffect の [] はなぜ必要？

**A:** []（空の依存配列）がないと、毎回 fetchProducts が実行されて無限ループになる。

```javascript
useEffect(() => {
  fetchProducts();  // setProducts を呼ぶ
  // → 再レンダリング
  // → useEffect 再実行
  // → fetchProducts 再度実行
  // → 無限ループ！
});

// 解決策：
useEffect(() => {
  fetchProducts();
}, []);  // ← 初回のみ実行
```

### Q3: onFilter は戻り値がないのになぜ必要？

**A:** 目的は「戻り値」ではなく「親への通知」。onFilter を呼ぶことで親の handleFilter が実行される。

```javascript
// FilterPanel
onFilter(newFilters);  // 親に「変更があった」と通知

// ProductList
<FilterPanel onFilter={handleFilter} />
// onFilter が呼ばれる = handleFilter が実行される
```

---

## 最終チェックリスト

この設計により以下が実現できる：

- ✅ フィルター変更時に製品リストが更新される
- ✅ コンポーネントがシンプルで理解しやすい
- ✅ useProducts を他のページでも再利用できる
- ✅ 各コンポーネントのテストが容易
- ✅ 状態の流れが追いやすい

---

**作成日:** 2026年2月18日  
**対象:** React製品一覧ページのアーキテクチャ
