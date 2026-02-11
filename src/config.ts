import dotenv from "dotenv";
import type { CliOptions, ModelAlias, ResolvedConfig } from "./types.js";
import { DEFAULTS, MODEL_MAP } from "./types.js";

// .env ファイルを読み込む
dotenv.config();

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
  const resolution = (cliOptions.resolution ?? envResolution ?? DEFAULTS.resolution) as ResolvedConfig["resolution"];
  const aspectRatio = (cliOptions.aspect ?? envAspect ?? DEFAULTS.aspectRatio) as ResolvedConfig["aspectRatio"];
  const duration = (cliOptions.duration ?? parseIntOrUndefined(envDuration) ?? DEFAULTS.duration) as ResolvedConfig["duration"];

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
