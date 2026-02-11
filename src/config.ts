import dotenv from "dotenv";

// .env ファイルを読み込む
dotenv.config();

/** CLI で指定可能なモデル名 */
export type ModelAlias = "fast" | "standard";

/** CLI で指定可能な解像度 */
export type Resolution = "720p" | "1080p" | "4K";

/** CLI で指定可能なアスペクト比 */
export type AspectRatio = "16:9" | "9:16";

/** CLI で指定可能な動画尺（秒） */
export type Duration = 4 | 6 | 8;

/** CLI 引数として渡される部分的な設定 */
export interface CliOptions {
  model?: string;
  resolution?: string;
  aspect?: string;
  duration?: number;
}

/** 解決済みの最終設定オブジェクト */
export interface ResolvedConfig {
  apiKey: string;
  model: string;
  modelAlias: ModelAlias;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  duration: Duration;
}

/** モデルエイリアスから API モデル名へのマッピング */
const MODEL_MAP: Record<ModelAlias, string> = {
  fast: "veo-3.1-fast-generate-preview",
  standard: "veo-3.1-generate-preview",
};

/** デフォルト値 */
const DEFAULTS = {
  model: "fast" as ModelAlias,
  resolution: "720p" as Resolution,
  aspectRatio: "16:9" as AspectRatio,
  duration: 8 as Duration,
} as const;

/**
 * CLI 引数 > .env > デフォルト値 の優先順位で設定を解決する。
 * GOOGLE_API_KEY が未設定の場合はエラーを投げる。
 */
export function resolveConfig(cliOptions: CliOptions = {}): ResolvedConfig {
  // API キーの取得と存在チェック
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY が設定されていません。\n" +
        ".env ファイルに GOOGLE_API_KEY=<your-api-key> を追加するか、\n" +
        "環境変数として GOOGLE_API_KEY を設定してください。",
    );
  }

  // .env から各設定値を取得
  const envModel = process.env.VEO_MODEL;
  const envResolution = process.env.VEO_RESOLUTION;
  const envAspect = process.env.VEO_ASPECT;
  const envDuration = process.env.VEO_DURATION;

  // CLI 引数 > .env > デフォルト値 の優先順位で解決
  const modelAlias = (cliOptions.model ?? envModel ?? DEFAULTS.model) as ModelAlias;
  const resolution = (cliOptions.resolution ?? envResolution ?? DEFAULTS.resolution) as Resolution;
  const aspectRatio = (cliOptions.aspect ?? envAspect ?? DEFAULTS.aspectRatio) as AspectRatio;
  const duration = (cliOptions.duration ?? parseIntOrUndefined(envDuration) ?? DEFAULTS.duration) as Duration;

  // モデル名のマッピング
  const model = MODEL_MAP[modelAlias];
  if (!model) {
    throw new Error(
      `不正なモデル名です: "${modelAlias}"\n` +
        `指定可能な値: fast, standard`,
    );
  }

  return {
    apiKey,
    model,
    modelAlias,
    resolution,
    aspectRatio,
    duration,
  };
}

/** 文字列を整数にパースする。パース不可の場合は undefined を返す */
function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}
