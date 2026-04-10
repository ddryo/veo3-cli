import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import type { GenerateVideoResult } from "./generator.js";
import type { ResolvedConfig, VideoMetadata } from "./types.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 通常のテキスト生成の出力先 */
const OUTPUT_DIR = "dist";

/** loop コマンドの出力先（dist 直下のサブフォルダ） */
export const LOOP_OUTPUT_DIR = path.join("dist", "loop");

// ---------------------------------------------------------------------------
// ファイル名生成
// ---------------------------------------------------------------------------

/**
 * {YYYYMMDDHHmmss}_{6文字ランダム} 形式のベースネームを生成する。
 */
function generateBaseName(): string {
  const now = new Date();

  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const random = crypto.randomBytes(3).toString("hex"); // 6文字

  return `${timestamp}_${random}`;
}

// ---------------------------------------------------------------------------
// ダウンロード関数
// ---------------------------------------------------------------------------

/**
 * 生成された動画をダウンロードし、メタデータ JSON を保存する。
 *
 * - 出力ディレクトリが存在しない場合は自動作成する（デフォルトは dist/）
 * - ダウンロード中は .part 拡張子で一時保存し、完了後に .mp4 にリネームする
 * - ダウンロード失敗時は .part ファイルを削除する
 * - メタデータ JSON を動画と同名の .json ファイルとして保存する
 *
 * @param prompt - 使用したプロンプト
 * @param result - 動画生成結果
 * @param config - 解決済みの設定
 * @returns 出力された動画ファイルのパス
 */
/** メタデータに追加で載せる項目・出力先の上書き */
export interface DownloadVideoOptions {
  /** 出力ディレクトリ（省略時は dist） */
  outputDir?: string;
  mode?: VideoMetadata["mode"];
  firstFramePath?: string;
  lastFramePath?: string;
}

export async function downloadVideo(
  prompt: string,
  result: GenerateVideoResult,
  config: ResolvedConfig,
  options?: DownloadVideoOptions,
): Promise<string> {
  const outDir = options?.outputDir ?? OUTPUT_DIR;

  // 出力ディレクトリの存在確認・自動作成
  await mkdir(outDir, { recursive: true });

  // ファイル名の生成
  const baseName = generateBaseName();
  const mp4Path = path.join(outDir, `${baseName}.mp4`);
  const partPath = path.join(outDir, `${baseName}.mp4.part`);
  const jsonPath = path.join(outDir, `${baseName}.json`);

  // SDK クライアントを作成してダウンロード
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  console.log("動画をダウンロードしています...");

  try {
    // .part 拡張子で一時保存
    await ai.files.download({
      file: result.generatedVideo.video,
      downloadPath: partPath,
    });

    // ダウンロード完了後に .mp4 にリネーム
    await rename(partPath, mp4Path);
  } catch (error) {
    // ダウンロード失敗時は .part ファイルを削除
    await unlink(partPath).catch(() => {
      // .part ファイルが存在しない場合は無視
    });
    throw new Error(
      `動画のダウンロードに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log(`動画を保存しました: ${mp4Path}`);

  // メタデータ JSON の生成・保存
  const metadata: VideoMetadata = {
    ...(options?.mode !== undefined ? { mode: options.mode } : {}),
    ...(options?.firstFramePath !== undefined ? { firstFrame: options.firstFramePath } : {}),
    ...(options?.lastFramePath !== undefined ? { lastFrame: options.lastFramePath } : {}),
    prompt,
    model: config.model,
    resolution: config.resolution,
    aspectRatio: config.aspectRatio,
    duration: config.duration,
    createdAt: new Date().toISOString(),
    outputFile: mp4Path,
  };

  await writeFile(jsonPath, JSON.stringify(metadata, null, 2) + "\n", "utf-8");
  console.log(`メタデータを保存しました: ${jsonPath}`);

  return mp4Path;
}
