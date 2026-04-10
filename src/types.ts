// ---------------------------------------------------------------------------
// プロジェクト全体で使用する型定義
// ---------------------------------------------------------------------------

/** CLI で指定可能なモデル名 */
export type ModelAlias = "fast" | "standard";

/** CLI で指定可能な解像度 */
export type Resolution = "720p" | "1080p" | "4K";

/** CLI で指定可能なアスペクト比 */
export type AspectRatio = "16:9" | "9:16";

/** CLI で指定可能な動画尺（秒） */
export type Duration = 4 | 6 | 8;

// ---------------------------------------------------------------------------
// CLI オプション
// ---------------------------------------------------------------------------

/** CLI 引数として渡される部分的な設定 */
export interface CliOptions {
  model?: string;
  resolution?: string;
  aspect?: string;
  duration?: number;
}

// ---------------------------------------------------------------------------
// 解決済み設定
// ---------------------------------------------------------------------------

/** 解決済みの最終設定オブジェクト */
export interface ResolvedConfig {
  apiKey: string;
  model: string;
  modelAlias: ModelAlias;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  duration: Duration;
}

// ---------------------------------------------------------------------------
// メタデータ
// ---------------------------------------------------------------------------

/** 動画生成時に保存するメタデータ */
export interface VideoMetadata {
  /** 生成モード（省略時は従来のテキストのみ生成とみなす） */
  mode?: "text" | "first-last-loop";
  /** 先頭フレームに使った画像パス（first-last-loop 時） */
  firstFrame?: string;
  /** 末尾フレームに使った画像パス（first-last-loop 時） */
  lastFrame?: string;
  /** 使用したプロンプト */
  prompt: string;
  /** 使用したモデル（API モデル名） */
  model: string;
  /** 解像度 */
  resolution: Resolution;
  /** アスペクト比 */
  aspectRatio: AspectRatio;
  /** 動画尺（秒） */
  duration: Duration;
  /** 生成日時（ISO 8601） */
  createdAt: string;
  /** 出力ファイルパス */
  outputFile: string;
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** モデルエイリアスから API モデル名へのマッピング */
export const MODEL_MAP: Record<ModelAlias, string> = {
  fast: "veo-3.1-fast-generate-preview",
  standard: "veo-3.1-generate-preview",
} as const;

/** デフォルト値 */
export const DEFAULTS = {
  model: "standard" as ModelAlias,
  resolution: "720p" as Resolution,
  aspectRatio: "16:9" as AspectRatio,
  duration: 8 as Duration,
} as const;
