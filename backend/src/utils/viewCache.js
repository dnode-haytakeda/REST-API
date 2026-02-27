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

// ---設定---
const FLUSH_INTERVAL_MS = 5 * 1000; // 5秒ごとにDBへ書き込み
const MAX_BUFFER_SIZE = 1000; // バッファ最大件数（メモリ保護）

// --内部状態--
let buffer = []; // { productId, userId, ipAddress, viewedAt }
let flushTimer = null; // setIntervalの参照
let isFlushing = false; // flush中の重複実行防止フラグ

/**
 * 閲覧データをバッファに追加する（同期処理、DBアクセスなし）
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
 * 【バッファスワップ方式】
 * flush中に新しいデータが追加されても安全なように、
 * 最初にバッファを切り離してから処理する
 */
const flush = async () => {
  if (isFlushing) return; //重複実行防止
  if (buffer.length === 0) return;

  isFlushing = true;

  // バッファをスワップ（切り離し）
  const currentBuffer = buffer;
  buffer = []; // 新しい空配列を割り当て→flush中の新データは次回処理

  try {
    await productModel.batchRecordViews(currentBuffer);
    console.log(
      `[ViewCache] ${currentBuffer.length}件の閲覧履歴をDBに書き込みました`,
    );
  } catch (err) {
    console.error("[ViewCache] バッチINSERT失敗:", err.message);
    // 失敗データは破棄（バッファに戻すとメモリリーク・無限ループのリスク）
  } finally {
    isFlushing = false;
  }
};

/** 定期フラッシュタイマーを開始（サーバー起動時に1回だけ呼ぶ） */
const startFlushTimer = () => {
  if (flushTimer) {
    console.warn("[ViewCache] フラッシュタイマーは既に起動しています");
    return;
  }
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  // unref(): このタイマーだけが残った場合、Node.jsプロセスの終了を妨げない
  flushTimer.unref();
  console.log(
    `[ViewCache] フラッシュタイマー開始（${FLUSH_INTERVAL_MS / 1000}秒間隔）`,
  );
};

/** タイマーを停止し、残りのバッファをフラッシュ（シャットダウン時に呼ぶ） */
const stopFlushTimer = async () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
    console.log("[ViewCache] フラッシュタイマー停止");
  }
  if (buffer.length > 0) {
    console.log(
      `[ViewCache] シャットダウン: 残り${buffer.length}件をフラッシュ中...`,
    );
    await flush();
  }
};

/** 現在のバッファサイズを取得（モニタリング・テスト用） */
const getBufferSize = () => buffer.length;

module.exports = {
  recordView,
  flush,
  startFlushTimer,
  stopFlushTimer,
  getBufferSize,
};
