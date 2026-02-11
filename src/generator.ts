import { GoogleGenAI } from "@google/genai";
import type { GenerateVideosOperation, GeneratedVideo } from "@google/genai";
import type { ResolvedConfig } from "./types.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** ポーリング間隔（ミリ秒） */
const POLL_INTERVAL_MS = 10_000;

/** ポーリングタイムアウト（ミリ秒） - 最大 6 分 */
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

// ---------------------------------------------------------------------------
// 動画生成結果
// ---------------------------------------------------------------------------

/** generateVideo が返す結果 */
export interface GenerateVideoResult {
  /** 生成された動画の URI */
  videoUri: string;
  /** 生成された動画の MIME タイプ */
  mimeType: string;
  /** SDK の GeneratedVideo オブジェクト（ダウンロード用） */
  generatedVideo: GeneratedVideo;
}

// ---------------------------------------------------------------------------
// 動画生成関数
// ---------------------------------------------------------------------------

/**
 * Veo 3 API で動画を生成し、ポーリングで完了を待機する。
 *
 * @param prompt - テキストプロンプト
 * @param config - 解決済みの設定
 * @returns 生成された動画情報
 */
export async function generateVideo(
  prompt: string,
  config: ResolvedConfig,
): Promise<GenerateVideoResult> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  // 動画生成リクエストを送信
  console.log("動画生成を開始しています...");
  let operation = await ai.models.generateVideos({
    model: config.model,
    prompt,
    config: {
      aspectRatio: config.aspectRatio,
      resolution: config.resolution,
      durationSeconds: config.duration,
      numberOfVideos: 1,
    },
  });

  // ポーリングループ
  const startTime = Date.now();
  const deadline = startTime + POLL_TIMEOUT_MS;

  // 初回レスポンスの失敗チェック
  checkOperationError(operation);

  while (!operation.done) {
    const now = Date.now();
    const remaining = deadline - now;

    // タイムアウトチェック
    if (remaining <= 0) {
      throw new Error(
        `動画生成がタイムアウトしました（${POLL_TIMEOUT_MS / 1000}秒）。\n` +
          "時間をおいて再度お試しください。",
      );
    }

    // 経過時間を表示
    const elapsedSec = Math.floor((now - startTime) / 1000);
    process.stdout.write(`\r待機中... ${elapsedSec}秒経過`);

    // ポーリング間隔を待つ（残り時間を超えない）
    await sleep(Math.min(POLL_INTERVAL_MS, remaining));

    // タイムアウト再チェック
    if (Date.now() >= deadline) {
      throw new Error(
        `動画生成がタイムアウトしました（${POLL_TIMEOUT_MS / 1000}秒）。\n` +
          "時間をおいて再度お試しください。",
      );
    }

    // オペレーション状態を確認
    operation = await ai.operations.getVideosOperation({
      operation,
    });

    // 失敗・キャンセル検出
    checkOperationError(operation);
  }

  // 改行を入れて経過時間表示をクリア
  console.log("");

  // レスポンスの検証
  const generatedVideos = operation.response?.generatedVideos;
  if (!generatedVideos || generatedVideos.length === 0) {
    throw new Error("動画が生成されませんでした。プロンプトを変更して再度お試しください。");
  }

  const video = generatedVideos[0].video;
  if (!video?.uri) {
    throw new Error("生成された動画の URI が取得できませんでした。");
  }

  const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(`動画生成が完了しました（${totalElapsed}秒）`);

  return {
    videoUri: video.uri,
    mimeType: video.mimeType ?? "video/mp4",
    generatedVideo: generatedVideos[0],
  };
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/** オペレーションのエラー状態をチェックし、失敗時は例外を投げる */
function checkOperationError(operation: GenerateVideosOperation): void {
  if (operation.error) {
    const errorDetail = JSON.stringify(operation.error);
    throw new Error(`動画生成に失敗しました: ${errorDetail}`);
  }
}

/** 指定ミリ秒待機する */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
