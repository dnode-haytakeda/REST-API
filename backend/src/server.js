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
 * サーバーを停止する際に「優雅に」終了すること:
 * 1. 新しいリクエストの受付を停止
 * 2. 処理中のリクエストが完了するまで待機
 * 3. バッファに溜まったデータをDBに書き込む
 * 4. プロセスを終了
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} を受信。グレースフルシャットダウンを開始します...`);

  server.close(async () => {
    console.log("HTTPサーバーを停止しました");
    try {
      await viewCache.stopFlushTimer();
      console.log("閲覧履歴キャッシュのフラッシュが完了しました");
    } catch (err) {
      console.error("シャットダウン中のエラー:", err);
    }
    process.exit(0);
  });

  // タイムアウト（10秒以内に終了しなければ強制終了）
  setTimeout(() => {
    console.error("シャットダウンタイムアウト。強制終了します");
    process.exit(1);
  }, 10000);
};

// SIGTERM: docker stop, kill コマンドなど（正常終了要求）
// SIGINT:  Ctrl+C（ターミナルからの割り込み）
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
