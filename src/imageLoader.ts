import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Image } from "@google/genai";

// ---------------------------------------------------------------------------
// ローカル画像ファイル → Gemini API の Image 形式
// ---------------------------------------------------------------------------

/** 拡張子 → MIME（Veo の画像入力で一般的に使われる形式） */
const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * ローカル画像ファイルを読み込み、generateVideos 用の Image オブジェクトに変換する。
 *
 * @param filePath - 画像ファイルのパス（相対可）
 * @returns base64 と mimeType を含む Image
 */
export async function loadImageFileAsGenAiImage(filePath: string): Promise<Image> {
  const resolved = path.resolve(filePath);
  const ext = path.extname(resolved).toLowerCase();
  const mimeType = EXT_TO_MIME[ext];
  if (!mimeType) {
    throw new Error(
      `サポートされていない画像形式です: "${ext}"\n` +
        "対応拡張子: .png, .jpg, .jpeg, .webp",
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(resolved);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`画像を読み込めませんでした (${resolved}): ${msg}`);
  }

  return {
    imageBytes: buffer.toString("base64"),
    mimeType,
  };
}
