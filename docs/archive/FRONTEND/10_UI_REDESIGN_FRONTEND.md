# フロントエンド UIリデザイン（プロフェッショナルテーマ）

## 概要

既存のUIをプロフェッショナル品質に全面刷新。Deloitteを連想させるカラーパレット（Black + Green #86BC25）を基調に、コーポレート感のあるクリーンなデザインシステムを構築した。

## 変更点サマリー

### 1. デザイントークン（variables.css）

- **カラー体系**: Bootstrap風の青/紫系 → Black + Deloitte Green (#86BC25) の2色体系
- **ニュートラルスケール**: gray-50 〜 gray-900 の10段階
- **セマンティックカラー**: success(#2e7d32), warning(#ef6c00), danger(#c62828), info(#1565c0)
- **タイポグラフィ**: Inter フォント、xs(0.75rem)〜3xl(2rem) のサイズスケール
- **スペーシング**: 4px基準のスケール（xs〜4xl）
- **角丸**: シャープ寄り（xs:2px 〜 xl:12px）
- **シャドウ**: 5段階（xs〜xl）の控えめな corporate shadow
- **レガシー互換**: 旧変数名（--primary-color 等）をエイリアスとして維持

### 2. グローバルスタイル（global.css）

- Google Fonts から Inter を @import
- body に新デザイントークンを適用
- h1〜h6 のデフォルトタイポグラフィ設定
- `:focus-visible` に Green アクセントアウトライン
- `::selection` に Green Light 背景
- Webkit スクロールバーのカスタマイズ

### 3. Vite scaffold 削除（index.css）

- `color-scheme: light dark` や暗背景（#242424）等のViteデフォルトを全削除
- global.css との競合を解消

### 4. コンポーネントスタイル（components.css）全面リデザイン

| コンポーネント | Before | After |
|---------------|--------|-------|
| Header | 白背景 | Black背景、白テキスト、Green accent ロゴ |
| Buttons | 青(#007bff) | Green(#86BC25)、uppercase、letter-spacing |
| Product Cards | 軽いシャドウ | 洗練されたボーダー + hover時 subtle lift + image scale |
| Role Select | 紫グラデーション | Black背景 + Green radial-gradient |
| Auth Pages | 紫グラデーション | gray-900背景 |
| Admin Auth | ピンクグラデーション | 純Black背景 |
| Filter Panel | box-shadow | ボーダー + Black下線見出し |
| Pagination | 青アクティブ | Blackアクティブ、Greenホバー |
| Search Bar | 白背景 | Dark入力欄（gray-800背景） |
| Error/Validation | 赤ボーダー囲み | 左ボーダーアクセント |

### 5. JSXコンポーネント改善

| 箇所 | Before | After |
|------|--------|-------|
| Header ロゴ | 🛍️ E-Commerce | E-Commerce |
| Header ユーザー名 | 👤 {user.name} | {user.name} |
| Dashboard 人気製品 | 🔥 人気製品 | 人気製品 |
| Dashboard 新着 | 🎁 新着製品 | 新着製品 |
| Dashboard 高評価 | ⭐️ 高評価製品 | 高評価製品 |
| Dashboard 閲覧数 | 👀 {count} 回閲覧 | {count} views |
| ProductDetail 評価 | ⭐ {rating} | {rating} |
| SelectRole タイトル | どちらで利用しますか？ | ご利用方法を選択してください |
| SelectRole ボタン | 両方 btn-primary | primary + outline 使い分け |

## デザイン原則

1. **クリーンな余白** — generous whitespace でコンテンツを呼吸させる
2. **シャープなコーナー** — コンサルティングファーム風の角丸（4-8px）
3. **控えめなシャドウ** — 微細な shadow で奥行きを表現
4. **タイポグラフィ階層** — Inter + bold headings + tight letter-spacing
5. **色の制約** — Black + Green の2色体系を厳守
6. **プログレッシブ・エンハンスメント** — hover/focus で丁寧な状態遷移

## 対象ファイル一覧

```
frontend/src/
├── index.css                  # Viteデフォルト削除
├── styles/
│   ├── variables.css          # デザイントークン全面刷新
│   ├── global.css             # ベーススタイル更新
│   └── components.css         # 全コンポーネント再設計
├── components/
│   └── Header.jsx             # 絵文字削除
└── pages/
    ├── Dashboard.jsx          # 絵文字削除
    ├── ProductDetail.jsx      # 絵文字削除
    └── SelectRole.jsx         # テキスト・ボタン改善
```
