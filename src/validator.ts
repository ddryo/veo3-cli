import type { ResolvedConfig, Resolution, Duration } from "./types.js";

// ---------------------------------------------------------------------------
// パラメータ制約定義
// ---------------------------------------------------------------------------

/** 解像度ごとに利用可能な動画尺 */
const ALLOWED_DURATIONS_BY_RESOLUTION: Record<Resolution, readonly Duration[]> = {
  "720p": [4, 6, 8],
  "1080p": [8],
  "4K": [8],
};

// ---------------------------------------------------------------------------
// バリデーション結果
// ---------------------------------------------------------------------------

/** バリデーション成功 */
interface ValidationSuccess {
  valid: true;
}

/** バリデーション失敗 */
interface ValidationFailure {
  valid: false;
  message: string;
}

/** バリデーション結果の共用型 */
export type ValidationResult = ValidationSuccess | ValidationFailure;

// ---------------------------------------------------------------------------
// バリデーション関数
// ---------------------------------------------------------------------------

/**
 * ResolvedConfig のパラメータ組み合わせを検証する。
 *
 * config.ts で個々の値の許容値チェックは済んでいる前提で、
 * ここでは解像度と尺の組み合わせ制約を検証する。
 */
export function validateConfig(config: ResolvedConfig): ValidationResult {
  const { resolution, duration } = config;

  const allowedDurations = ALLOWED_DURATIONS_BY_RESOLUTION[resolution];

  if (!allowedDurations.includes(duration)) {
    return {
      valid: false,
      message:
        `解像度 "${resolution}" では動画尺 ${duration} 秒は指定できません。\n` +
        `"${resolution}" で指定可能な動画尺: ${allowedDurations.join(", ")} 秒`,
    };
  }

  return { valid: true };
}
