# 追加開発ガイド: 閲覧履歴キャッシュ（バックエンド編）

> **目的:** 製品閲覧のたびに実行されるDB INSERT を、インメモリバッファ＋定期バッチINSERTに置き換え、DB負荷を大幅に軽減する  
> **対象:** バックエンド（Node.js / Express）  
> **前提:** 現行の `productModel.recordView()` が毎回 `INSERT INTO product_views` を実行している構造を把握していること  
> **作成日:** 2026-02-27

---

## 目次

1. [この開発で学べること](#1-この開発で学べること)
2. [キャッシュとは何か？ — 基礎から理解する](#2-キャッシュとは何か--基礎から理解する)
3. [なぜ閲覧履歴にキャッシュが必要なのか](#3-なぜ閲覧履歴にキャッシュが必要なのか)
4. [キャッシュ戦略の比較と選定](#4-キャッシュ戦略の比較と選定)
5. [手順 1: ViewCache モジュールの作成](#5-手順-1-viewcache-モジュールの作成)
6. [手順 2: productModel にバッチ INSERT 関数を追加](#6-手順-2-productmodel-にバッチ-insert-関数を追加)
7. [手順 3: productService の修正](#7-手順-3-productservice-の修正)
8. [手順 4: アプリケーション起動・終了の管理](#8-手順-4-アプリケーション起動終了の管理)
9. [トランザクションとは何か？ — バッチINSERTとの関係](#9-トランザクションとは何か--バッチinsertとの関係)
10. [動作確認とテスト](#10-動作確認とテスト)
11. [パフォーマンス比較](#11-パフォーマンス比較)
12. [セルフチェック](#12-セルフチェック)

---

## 1. この開発で学べること

| テーマ | 学習内容 |
|---|---|
| **キャッシュの基礎** | キャッシュとは何か、なぜ必要か、どう使うか |
| **Write-Behind キャッシュ** | 書き込みをバッファリングして遅延実行するパターン |
| **バッチ INSERT** | 複数レコードを1回のSQL文で挿入する手法 |
| **DBトランザクション** | ACID特性、トランザクションの使いどころ |
| **グレースフルシャットダウン** | サーバー停止時にバッファデータを失わない方法 |
| **シングルトンパターン** | Node.js のモジュールキャッシュを利用した唯一インスタンス |
| **setInterval / clearInterval** | Node.js のタイマー制御 |

---

## 2. キャッシュとは何か？ — 基礎から理解する

### 2.1 キャッシュの基本概念

**キャッシュ (Cache)** とは、「頻繁にアクセスされるデータや、すぐに処理する必要のないデータを一時的に保存する仕組み」です。

日常の例で理解しましょう：

```
📚 図書館の例:
  - 本棚（DB）: 10万冊の蔵書がある。探すのに時間がかかる
  - 机の上（キャッシュ）: よく使う5冊を手元に置いておく。すぐ取れる

🛒 スーパーのレジの例:
  - 1個ずつ精算（毎回DB書き込み）: 客が来るたびに1個ずつレジを打つ
  - まとめて精算（バッチ書き込み）: カゴに10個溜めてから一括精算 → 効率的
```

### 2.2 キャッシュの種類

```
┌──────────────────────────────────────────────────┐
│                キャッシュの分類                      │
├──────────────────────────────────────────────────┤
│                                                    │
│  【読み取りキャッシュ (Read Cache)】               │
│  目的: DBからの読み取り回数を減らす                 │
│  例: 製品一覧を60秒キャッシュして、その間は         │
│      DBにアクセスしない                             │
│                                                    │
│  クライアント → キャッシュ → あれば返す             │
│                           → なければDB問い合わせ    │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  【書き込みキャッシュ (Write Cache)】 ← 今回はこれ │
│  目的: DBへの書き込み回数を減らす                   │
│  例: 閲覧履歴を一時的にメモリに溜めて、             │
│      一定時間ごとにまとめてDBに書き込む             │
│                                                    │
│  クライアント → メモリバッファ → 定期的にDB一括書込 │
│                                                    │
└──────────────────────────────────────────────────┘
```

### 2.3 Write-Behind キャッシュ パターン

今回採用するのは **Write-Behind (Write-Back) キャッシュ** パターンです：

```
【従来: Write-Through（現行コード）】
  リクエスト1 → INSERT INTO product_views ... → DB
  リクエスト2 → INSERT INTO product_views ... → DB
  リクエスト3 → INSERT INTO product_views ... → DB
  リクエスト4 → INSERT INTO product_views ... → DB
  → DBへの書き込み: 4回

【改善: Write-Behind（今回の実装）】
  リクエスト1 → メモリバッファに追加
  リクエスト2 → メモリバッファに追加
  リクエスト3 → メモリバッファに追加
  リクエスト4 → メモリバッファに追加
  (30秒経過)   → INSERT INTO product_views VALUES (...),(...),(...),(...) → DB
  → DBへの書き込み: 1回
```

### 2.4 Write-Behind キャッシュのメリットとリスク

| 項目 | メリット | リスク |
|---|---|---|
| **パフォーマンス** | DB書き込み回数が大幅に減る | — |
| **レスポンス** | APIレスポンスがDB書き込みを待たない | — |
| **コネクション** | DB接続プールの枯渇を防ぐ | — |
| **データ損失** | — | サーバークラッシュ時にバッファ内データが失われる |
| **即時性** | — | データがDBに反映されるまで最大30秒の遅延 |
| **メモリ使用量** | — | 大量アクセス時にメモリを消費する |

> **このアプリにおける判断:** 閲覧履歴は「統計的データ」であり、数件の欠損は許容できます。一方、注文データやユーザー認証データにこのパターンを適用するのは**絶対にNG**です。

---

## 3. なぜ閲覧履歴にキャッシュが必要なのか

### 3.1 現状の問題

現在の `productService.getProduct()` は、製品詳細を取得するたびに `INSERT INTO product_views` を実行しています：

```javascript
// backend/src/services/productService.js（現行コード）
const getProduct = async (id, userId = null, ipAddress = null) => {
  const product = await productModel.findById(id);    // SELECT（読み取り）
  if (!product) throw new Error("Product not found");

  try {
    await productModel.recordView(id, userId, ipAddress);  // ← 毎回INSERT
  } catch (err) {
    console.error("Failed to record view:", err);
  }

  return product;
};
```

### 3.2 数値で見る問題の大きさ

```
仮定: 1日に1,000回の製品詳細閲覧がある場合

【現行】
  INSERT実行回数: 1,000回/日
  DBコネクション確保: 1,000回/日
  ネットワークラウンドトリップ: 1,000回/日

【キャッシュ導入後（30秒間隔でフラッシュ）】
  INSERT実行回数: 最大 2,880回/日（= 24時間 × 60分 × 2回/分）
  ※ ただしバッファが空の場合はスキップするため、実際はさらに少ない
  DB接続あたりの挿入レコード数: 平均 1,000 ÷ 2,880 ≒ 0.35件/回

  実質的な挿入頻度（バッファが空でない回のみ）:
  アクセスが集中する8時間 × 60分 × 2回/分 = 960回
  → 1,000件 ÷ 960回 ≈ 1件/回（分散時）
  → ピーク時は5-10件/回のバッチINSERT
```

### 3.3 キャッシュが適切なデータの条件

閲覧履歴は以下のすべてを満たすため、キャッシュに最適です：

| 条件 | 閲覧履歴 | 注文データ |
|---|---|---|
| 数件の欠損が許容できる | ✅ | ❌ |
| リアルタイム反映が不要 | ✅（30秒遅延OK） | ❌ |
| 書き込み頻度が高い | ✅ | △ |
| データの一貫性要件が低い | ✅ | ❌ |

---

## 4. キャッシュ戦略の比較と選定

### 4.1 選択肢の比較

| 戦略 | 概要 | メリット | デメリット | 適用場面 |
|---|---|---|---|---|
| **A: インメモリ配列** | Node.js の配列にバッファ | 依存なし、シンプル | プロセス再起動で消失 | **今回採用** |
| **B: node-cache** | npmパッケージ使用 | TTL管理が楽 | 追加依存 | 読み取りキャッシュ向き |
| **C: Redis** | 外部キャッシュサーバー | 永続化、複数プロセス共有 | インフラ追加 | 大規模アプリ |

### 4.2 今回「A: インメモリ配列」を選ぶ理由

1. **外部依存ゼロ:** 追加の npm パッケージやインフラが不要
2. **学習に最適:** キャッシュの仕組みをゼロから理解できる
3. **閲覧履歴のユースケースに合致:** 数件の欠損が許容されるデータ
4. **コネクションプールとの相性:** mysql2/promise の接続プール（limit: 10）を圧迫しない

---

## 5. 手順 1: ViewCache モジュールの作成

> **注意:** 手順 1 と手順 2 は相互依存しています。`viewCache.js` 内で `productModel.batchRecordViews` を呼び出しますが、この関数は手順 2 で追加します。両方の手順を完了してから動作確認してください。

### ファイル: `backend/src/utils/viewCache.js`（新規作成）

```javascript
/**
 * 閲覧履歴キャッシュ（Write-Behind パターン）
 *
 * 【仕組み】
 * 1. recordView() でメモリバッファに閲覧データを追加
 * 2. 一定間隔（FLUSH_INTERVAL_MS）でバッファをDBに一括書き込み
 * 3. サーバー終了時にグレースフルシャットダウンで残データを書き込み
 *
 * 【なぜシングルトンか？】
 * Node.js の require() はモジュールをキャッシュするため、
 * どのファイルから require("./utils/viewCache") しても
 * 同じインスタンスが返されます。これにより「バッファが1つだけ
 * 存在する」ことが自然に保証されます。
 */

const productModel = require("../models/productModel");

// --- 設定 ---
const FLUSH_INTERVAL_MS = 30 * 1000; // 30秒ごとにDBへ書き込み
const MAX_BUFFER_SIZE = 1000; // バッファ最大件数（メモリ保護）

// --- 内部状態 ---
let buffer = []; // { productId, userId, ipAddress, viewedAt }
let flushTimer = null; // setInterval の参照
let isFlushing = false; // flush 中の重複実行防止フラグ

/**
 * 閲覧データをバッファに追加する
 *
 * @param {number} productId - 製品ID
 * @param {number|null} userId - ユーザーID
 * @param {string|null} ipAddress - IPアドレス
 *
 * 【ポイント】
 * - この関数は同期的（async不要）なので、呼び出し元のレスポンスを遅延させない
 * - バッファが最大件数に達した場合は即座にフラッシュを実行する
 */
const recordView = (productId, userId = null, ipAddress = null) => {
  buffer.push({
    productId,
    userId,
    ipAddress,
    viewedAt: new Date(),
  });

  // メモリ保護: バッファが上限に達したら即フラッシュ
  if (buffer.length >= MAX_BUFFER_SIZE) {
    console.log(
      `[ViewCache] バッファが上限(${MAX_BUFFER_SIZE}件)に達しました。即座にフラッシュします`,
    );
    flush();
  }
};

/**
 * バッファの内容をDBに一括書き込みする
 *
 * 【設計判断】
 * - flush中に新しいデータが追加されても安全なように、
 *   最初にバッファを切り離してから処理する（スワップ方式）
 * - エラー時はログ出力のみ。閲覧履歴は統計データのため、
 *   リトライは行わない（リトライするとメモリが際限なく増える可能性がある）
 */
const flush = async () => {
  // 重複実行防止
  if (isFlushing) return;
  // バッファが空なら何もしない
  if (buffer.length === 0) return;

  isFlushing = true;

  // バッファをスワップ（現在のバッファを取り出し、新しい空配列をセット）
  // こうすることで、flush中に来た新しいデータは次回のflushで処理される
  const currentBuffer = buffer;
  buffer = [];

  try {
    await productModel.batchRecordViews(currentBuffer);
    console.log(
      `[ViewCache] ${currentBuffer.length}件の閲覧履歴をDBに書き込みました`,
    );
  } catch (err) {
    console.error("[ViewCache] バッチINSERT失敗:", err.message);
    // 失敗したデータは破棄する（閲覧履歴は欠損許容）
    // ※ バッファに戻すとメモリリーク・無限ループのリスクがあるため
  } finally {
    isFlushing = false;
  }
};

/**
 * 定期フラッシュタイマーを開始する
 *
 * 【呼び出しタイミング】
 * - サーバー起動時（server.js）に1回だけ呼ぶ
 *
 * 【setInterval について】
 * - 指定ミリ秒ごとにコールバックを繰り返し実行するNode.jsのタイマー
 * - clearInterval() で停止するまで永続的に動く
 * - unref() を呼ぶことで、このタイマーだけが残ってもプロセスが終了できる
 */
const startFlushTimer = () => {
  if (flushTimer) {
    console.warn("[ViewCache] フラッシュタイマーは既に起動しています");
    return;
  }

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

  // unref(): このタイマーだけが残った場合、Node.jsプロセスの終了を妨げない
  // （グレースフルシャットダウン時に重要）
  flushTimer.unref();

  console.log(
    `[ViewCache] フラッシュタイマー開始（${FLUSH_INTERVAL_MS / 1000}秒間隔）`,
  );
};

/**
 * 定期フラッシュタイマーを停止し、残りのバッファをDBに書き込む
 *
 * 【呼び出しタイミング】
 * - サーバー終了時（SIGTERM / SIGINT）に呼ばれる
 * - グレースフルシャットダウン: 「正常に終了処理を完了してから停止する」こと
 */
const stopFlushTimer = async () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
    console.log("[ViewCache] フラッシュタイマー停止");
  }

  // 残りのバッファをフラッシュ
  if (buffer.length > 0) {
    console.log(
      `[ViewCache] シャットダウン: 残り${buffer.length}件をフラッシュ中...`,
    );
    await flush();
  }
};

/**
 * 現在のバッファサイズを取得（モニタリング・テスト用）
 */
const getBufferSize = () => buffer.length;

module.exports = {
  recordView,
  flush,
  startFlushTimer,
  stopFlushTimer,
  getBufferSize,
};
```

### コード解説: なぜこの設計なのか

#### バッファスワップ方式

```javascript
// ❌ 悪い例: バッファを直接操作
const flush = async () => {
  const data = buffer;   // 参照をコピー（同じ配列を指す）
  buffer.length = 0;     // 元配列をクリア → dataも空になる！
  await model.insert(data); // 空配列を挿入してしまう
};

// ✅ 良い例: バッファをスワップ
const flush = async () => {
  const currentBuffer = buffer; // 現在の配列の参照を保存
  buffer = [];                  // 新しい空配列を割り当て
  // currentBuffer は古い配列を指したまま → 安全にDB書き込みできる
  await model.insert(currentBuffer);
};
```

#### isFlushing フラグ

```
時刻 0.00秒: タイマーがflush()を呼ぶ → DB書き込み開始
時刻 0.02秒: バッファが上限到達 → flush()が呼ばれる
              → isFlushing = true なので即リターン（二重実行防止）
時刻 0.05秒: DB書き込み完了 → isFlushing = false
```

---

## 6. 手順 2: productModel にバッチ INSERT 関数を追加

### ファイル: `backend/src/models/productModel.js`（修正 — 関数追加）

既存の `recordView` はそのまま残し（互換性維持）、新しく `batchRecordViews` を追加します。

```javascript
/**
 * 閲覧履歴をバッチINSERTする
 *
 * @param {Array<{productId: number, userId: number|null, ipAddress: string|null, viewedAt: Date}>} views
 * @returns {Promise<number>} 挿入された行数
 *
 * 【なぜ viewed_at を明示指定するのか？】
 * 既存の recordView は INSERT 時刻 = 閲覧時刻だが、
 * バッチ INSERT では INSERT 時刻 ≠ 閲覧時刻になるため、
 * バッファに追加した時刻（= 実際の閲覧時刻）を viewedAt として明示的に保存する。
 *
 * 【バッチINSERTとは？】
 * 通常のINSERTは1行ずつ挿入します:
 *   INSERT INTO table VALUES (1, 'a');
 *   INSERT INTO table VALUES (2, 'b');
 *   INSERT INTO table VALUES (3, 'c');
 *   → 3回のSQL実行、3回のネットワーク往復
 *
 * バッチINSERTは1回のSQLで複数行を挿入します:
 *   INSERT INTO table VALUES (1, 'a'), (2, 'b'), (3, 'c');
 *   → 1回のSQL実行、1回のネットワーク往復
 */
const batchRecordViews = async (views) => {
  if (!views || views.length === 0) return 0;

  // プレースホルダーを動的に構築
  // views が3件の場合: "(?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)"
  const placeholders = views.map(() => "(?, ?, ?, ?)").join(", ");

  // パラメータ配列をフラットに展開
  // [{ productId: 1, userId: 2, ipAddress: "...", viewedAt: "..." }, ...]
  // → [1, 2, "...", "...", ...]
  const params = views.flatMap((v) => [
    v.productId,
    v.userId,
    v.ipAddress,
    v.viewedAt,
  ]);

  const query = `
    INSERT INTO product_views (product_id, user_id, ip_address, viewed_at)
    VALUES ${placeholders}
  `;

  const [result] = await pool.query(query, params);
  return result.affectedRows;
};
```

### module.exports に追加

```javascript
module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  deleteById,
  findPopular,
  recordView,        // ← 既存（互換性維持）
  batchRecordViews,  // ← 新規追加
};
```

### なぜプリペアドステートメント（`?`）を使うか

```javascript
// ❌ 危険: 文字列結合
const query = `INSERT INTO product_views VALUES (${productId}, '${ipAddress}')`;
// → ipAddress に "'; DROP TABLE product_views; --" が入ると全データ消失

// ✅ 安全: プレースホルダー
const query = `INSERT INTO product_views VALUES (?, ?)`;
const params = [productId, ipAddress];
// → mysql2 がパラメータを安全にエスケープ処理する
```

---

## 7. 手順 3: productService の修正

### ファイル: `backend/src/services/productService.js`（修正）

`getProduct()` で `productModel.recordView()` の代わりに `viewCache.recordView()` を使用します。

```javascript
// ファイル先頭の require に追加
const viewCache = require("../utils/viewCache");

// getProduct 関数を修正
const getProduct = async (id, userId = null, ipAddress = null) => {
  const product = await productModel.findById(id);
  if (!product) throw new Error("Product not found");

  // ↓↓↓ 修正前: 毎回 await で DB に直接 INSERT していた
  // try {
  //   await productModel.recordView(id, userId, ipAddress);
  // } catch (err) {
  //   console.error("Failed to record view:", err);
  // }

  // ↓↓↓ 修正後: メモリバッファに追加（同期処理、DBアクセスなし）
  viewCache.recordView(id, userId, ipAddress);

  return product;
};
```

**変更点の本質:**

```
【修正前】
  getProduct() → await productModel.recordView()
               → DBコネクション取得 → INSERT → コネクション返却
               → レスポンスにDB書き込み時間が加算される

【修正後】
  getProduct() → viewCache.recordView()  ← 同期処理（配列にpush）
               → 即座にreturn（DB書き込め時間ゼロ）
               → 30秒後にバックグラウンドでまとめてDB書き込み
```

---

## 8. 手順 4: アプリケーション起動・終了の管理

### ファイル: `backend/src/server.js`（修正）

サーバー起動時にフラッシュタイマーを開始し、終了時にグレースフルシャットダウンを実行します。

```javascript
require("dotenv").config();
const app = require("./app");
const viewCache = require("./utils/viewCache");

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`API server listening on port ${port}`);

  // 閲覧履歴キャッシュのフラッシュタイマーを開始
  viewCache.startFlushTimer();
});

/**
 * グレースフルシャットダウン
 *
 * 【グレースフルシャットダウンとは？】
 * サーバーを停止する際に、以下の手順で「優雅に」終了すること:
 * 1. 新しいリクエストの受付を停止
 * 2. 処理中のリクエストが完了するまで待機
 * 3. バッファに溜まったデータをDBに書き込む
 * 4. DBコネクションを閉じる
 * 5. プロセスを終了
 *
 * 【なぜ必要か？】
 * プロセスを即座に kill すると:
 * - 処理中のリクエストが途中で切断される
 * - バッファ内の閲覧履歴データが失われる
 * - DBコネクションが「片付けられない」状態で放置される
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} を受信。グレースフルシャットダウンを開始します...`);

  // 1. 新しいリクエストの受付を停止
  server.close(async () => {
    console.log("HTTPサーバーを停止しました");

    try {
      // 2. 閲覧履歴バッファをフラッシュ
      await viewCache.stopFlushTimer();
      console.log("閲覧履歴キャッシュのフラッシュが完了しました");
    } catch (err) {
      console.error("シャットダウン中のエラー:", err);
    }

    // 3. プロセス終了
    process.exit(0);
  });

  // タイムアウト（10秒以内に終了しなければ強制終了）
  setTimeout(() => {
    console.error("シャットダウンタイムアウト。強制終了します");
    process.exit(1);
  }, 10000);
};

// シグナルハンドラー登録
// SIGTERM: docker stop, kill コマンドなど（正常終了要求）
// SIGINT:  Ctrl+C（ターミナルからの割り込み）
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

### アプリケーションのライフサイクル全体像

```
【起動】
  node src/server.js
    → dotenv.config()                    環境変数読み込み
    → app.listen(port)                   HTTPサーバー起動
    → viewCache.startFlushTimer()        30秒タイマー開始
    → "API server listening on port 3000"

【稼働中】
  GET /api/products/1
    → getProductDetail()
    → getProduct(1, userId, ip)
    → productModel.findById(1)          ← DB読み取り
    → viewCache.recordView(1, userId, ip) ← メモリに追加（0ms）
    → res.json(product)

  ... 30秒経過 ...

  [setInterval発火]
    → viewCache.flush()
    → productModel.batchRecordViews(buffer) ← DB一括書き込み
    → "[ViewCache] 15件の閲覧履歴をDBに書き込みました"

【停止】
  Ctrl+C (SIGINT)
    → gracefulShutdown("SIGINT")
    → server.close()                     新規リクエスト停止
    → viewCache.stopFlushTimer()         タイマー停止
    → viewCache.flush()                  残りバッファをDB書き込み
    → process.exit(0)                    正常終了
```

---

## 9. トランザクションとは何か？ — バッチINSERTとの関係

### 9.1 トランザクションの基本

**トランザクション (Transaction)** とは、「複数のDB操作をひとまとまりとして扱い、すべて成功するか、すべて失敗するか（ゼロか100か）を保証する仕組み」です。

```
🏦 銀行の送金の例:
  Aさんの口座から10万円引く → Bさんの口座に10万円足す

  「Aさんから引いたけど、Bさんに足す前にエラー」→ 10万円が消失！
  → トランザクションで囲めば、エラー時に「Aさんから引いた」も取り消される
```

### 9.2 ACID 特性

トランザクションが保証する4つの特性：

| 特性 | 英語 | 意味 | 例 |
|---|---|---|---|
| **A** | Atomicity (原子性) | 全部成功 or 全部失敗 | 送金の引き落としと入金が両方成功するか、両方取り消し |
| **C** | Consistency (一貫性) | 整合性が保たれる | 送金前後で総額が変わらない |
| **I** | Isolation (分離性) | 同時実行が干渉しない | 2人が同時に送金しても正しい結果 |
| **D** | Durability (永続性) | 確定したら消えない | コミット後にサーバー自体が落ちてもデータ保持 |

### 9.3 今回のバッチINSERTにトランザクションは必要か？

```
【結論: 今回は不要】

理由:
1. 操作が「1つのINSERT文」だけ
   → 単一SQL文はMySQL内部で自動的にトランザクション処理される
   → 明示的な BEGIN/COMMIT は不要

2. 閲覧履歴は部分的な成功/失敗が許容される
   → 100件中5件が失敗しても、95件が記録されればOK
   → 「全部成功 or 全部失敗」を強制する必要がない

3. 他のテーブルとの整合性が不要
   → 送金のように「2つのテーブルを同時に更新」する必要がない
```

### 9.4 トランザクションが必要な場面（参考）

```javascript
// 例: 注文処理（トランザクションが必須）
const createOrder = async (userId, items) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();   // トランザクション開始

    // 1. 注文レコード作成
    const [orderResult] = await connection.query(
      "INSERT INTO orders (user_id, total) VALUES (?, ?)",
      [userId, total]
    );

    // 2. 注文明細作成（複数行）
    for (const item of items) {
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)",
        [orderResult.insertId, item.productId, item.quantity]
      );
    }

    // 3. 在庫を減らす
    for (const item of items) {
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.productId]
      );
    }

    await connection.commit();            // 全部成功 → 確定
  } catch (err) {
    await connection.rollback();          // 1つでも失敗 → 全部取り消し
    throw err;
  } finally {
    connection.release();                 // コネクションをプールに返却
  }
};
```

上記では「注文作成 → 明細作成 → 在庫減少」の3操作が1つのトランザクションです。在庫減少でエラーが発生した場合、注文と明細の作成も自動的に取り消されます。

---

## 10. 動作確認とテスト

### テストケース

| テスト | 操作 | 期待結果 |
|---|---|---|
| **基本動作** | 製品詳細を5回閲覧 → 30秒待機 | コンソールに `5件の閲覧履歴をDBに書き込みました` |
| **バッファ空** | 30秒間閲覧なし | フラッシュがスキップされる（ログ出力なし） |
| **即座フラッシュ** | MAX_BUFFER_SIZE を5に変更 → 6回閲覧 | 5回目で即フラッシュ、6回目はバッファに残る |
| **グレースフル終了** | 製品を閲覧 → Ctrl+C | `シャットダウン: 残りN件をフラッシュ中...` |
| **DB確認** | テスト後 | `SELECT COUNT(*) FROM product_views` が期待件数 |

### requests.http での確認

```http
### 製品詳細を閲覧（閲覧を記録）
GET http://localhost:3000/api/products/1
Authorization: Bearer {{token}}

### 少し待ってから人気製品を確認（閲覧数が反映されているか）
GET http://localhost:3000/api/products/popular?limit=5
```

### コンソールログの確認例

```
API server listening on port 3000
[ViewCache] フラッシュタイマー開始（30秒間隔）

# 製品詳細を何度か閲覧...

[ViewCache] 3件の閲覧履歴をDBに書き込みました

# Ctrl+C を押す
^C
SIGINT を受信。グレースフルシャットダウンを開始します...
HTTPサーバーを停止しました
[ViewCache] フラッシュタイマー停止
[ViewCache] シャットダウン: 残り1件をフラッシュ中...
[ViewCache] 1件の閲覧履歴をDBに書き込みました
閲覧履歴キャッシュのフラッシュが完了しました
```

---

## 11. パフォーマンス比較

### 変更前と変更後の処理フロー

```
【変更前: productService.getProduct()】
  1. productModel.findById(id)        →  1回のSELECT（~5ms）
  2. productModel.recordView(...)     →  1回のINSERT（~3ms）
  3. return product
  合計レスポンス時間: ~8ms
  DB操作: 2回/リクエスト

【変更後: productService.getProduct()】
  1. productModel.findById(id)        →  1回のSELECT（~5ms）
  2. viewCache.recordView(...)        →  配列にpush（~0.01ms）
  3. return product
  合計レスポンス時間: ~5ms（37.5%高速化）
  DB操作: 1回/リクエスト + 1回/30秒（バッチ）
```

### DB接続プールへの影響

```
コネクションプール: 最大10接続

【変更前】
  同時に30リクエスト → 30個のINSERTがコネクション待ち
  → プール枯渇 → リクエストがタイムアウト

【変更後】
  同時に30リクエスト → 0個のINSERT（バッファに追加するだけ）
  → 30秒後に1回のバッチINSERT（コネクション1つだけ使用）
  → プールに余裕
```

---

## 12. セルフチェック

### 実装チェックリスト

- [ ] `backend/src/utils/viewCache.js` が作成されている
- [ ] `backend/src/models/productModel.js` に `batchRecordViews` が追加されている
- [ ] `backend/src/models/productModel.js` の `module.exports` に `batchRecordViews` が含まれている
- [ ] `backend/src/services/productService.js` で `viewCache.recordView()` を使用している
- [ ] `backend/src/server.js` で `viewCache.startFlushTimer()` を呼んでいる
- [ ] `backend/src/server.js` にグレースフルシャットダウン処理がある
- [ ] 既存の `recordView` 関数は削除せず残してある（互換性維持）

### 理解度チェック

- [ ] Write-Behind キャッシュパターンを自分の言葉で説明できる
- [ ] バッファスワップ方式がなぜ必要かを説明できる
- [ ] setInterval / clearInterval / unref() の役割を理解している
- [ ] グレースフルシャットダウンの全ステップを説明できる
- [ ] トランザクションが今回不要である理由を説明できる
- [ ] バッチINSERTが個別INSERTより効率的な理由を説明できる

---

**前提:** このガイドの実装コードは、本プロジェクトの既存コード（MSCアーキテクチャ、CommonJS、mysql2/promise）と完全に一貫しています。  
**次のステップ:** 統括ガイド（`docs/guides/` 内の総合ガイド）に本機能を追記統合します。
