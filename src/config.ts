import dotenv from "dotenv";
import type {
  AspectRatio,
  CliOptions,
  Duration,
  ModelAlias,
  Resolution,
  ResolvedConfig,
} from "./types.js";
import { DEFAULTS, MODEL_MAP } from "./types.js";

// .env ファイルを読み込む
dotenv.config();

const VALID_MODELS: readonly string[] = ["fast", "standard"];
const VALID_RESOLUTIONS: readonly string[] = ["720p", "1080p", "4K"];
const VALID_ASPECTS: readonly string[] = ["16:9", "9:16"];
const VALID_DURATIONS: readonly number[] = [4, 6, 8];

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

  // CLI 引数 > .env > デフォルト値 の優先順位で解決・バリデーション
  const modelAlias = validateOption(
    "model",
    cliOptions.model ?? envModel ?? DEFAULTS.model,
    VALID_MODELS,
  ) as ModelAlias;

  const resolution = validateOption(
    "resolution",
    cliOptions.resolution ?? envResolution ?? DEFAULTS.resolution,
    VALID_RESOLUTIONS,
  ) as Resolution;

  const aspectRatio = validateOption(
    "aspect",
    cliOptions.aspect ?? envAspect ?? DEFAULTS.aspectRatio,
    VALID_ASPECTS,
  ) as AspectRatio;

  const rawDuration = cliOptions.duration ?? parseDuration(envDuration) ?? DEFAULTS.duration;
  if (!VALID_DURATIONS.includes(rawDuration)) {
    throw new Error(
      `不正な動画尺です: "${rawDuration}"\n` +
        `指定可能な値: ${VALID_DURATIONS.join(", ")}`,
    );
  }
  const duration = rawDuration as Duration;

  // モデル名のマッピング
  const model = MODEL_MAP[modelAlias];

  return {
    apiKey,
    model,
    modelAlias,
    resolution,
    aspectRatio,
    duration,
  };
}

/** 許容値リストに含まれるか検証する */
function validateOption(
  name: string,
  value: string,
  allowed: readonly string[],
): string {
  if (!allowed.includes(value)) {
    throw new Error(
      `不正な${name}です: "${value}"\n` +
        `指定可能な値: ${allowed.join(", ")}`,
    );
  }
  return value;
}

/** 文字列を厳密にDuration整数にパースする。パース不可の場合は undefined を返す */
function parseDuration(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) return undefined;
  return Number(value);
}
