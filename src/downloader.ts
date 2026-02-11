import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import type { GenerateVideoResult } from "./generator.js";
import type { ResolvedConfig, VideoMetadata } from "./types.js";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 動画の出力先ディレクトリ */
const OUTPUT_DIR = "dist";

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
 * - dist/ ディレクトリが存在しない場合は自動作成する
 * - ダウンロード中は .part 拡張子で一時保存し、完了後に .mp4 にリネームする
 * - ダウンロード失敗時は .part ファイルを削除する
 * - メタデータ JSON を動画と同名の .json ファイルとして保存する
 *
 * @param prompt - 使用したプロンプト
 * @param result - 動画生成結果
 * @param config - 解決済みの設定
 * @returns 出力された動画ファイルのパス
 */
export async function downloadVideo(
  prompt: string,
  result: GenerateVideoResult,
  config: ResolvedConfig,
): Promise<string> {
  // dist/ ディレクトリの存在確認・自動作成
  await mkdir(OUTPUT_DIR, { recursive: true });

  // ファイル名の生成
  const baseName = generateBaseName();
  const mp4Path = path.join(OUTPUT_DIR, `${baseName}.mp4`);
  const partPath = path.join(OUTPUT_DIR, `${baseName}.mp4.part`);
  const jsonPath = path.join(OUTPUT_DIR, `${baseName}.json`);

  // SDK クライアントを作成してダウンロード
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  console.log("動画をダウンロードしています...");

  try {
    // .part 拡張子で一時保存
    await ai.files.download({
      file: result.generatedVideo,
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
