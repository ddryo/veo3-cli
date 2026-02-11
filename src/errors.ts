// ---------------------------------------------------------------------------
// エラーハンドリング
// ---------------------------------------------------------------------------

/**
 * API レスポンスのステータスコード別エラー情報
 */
interface ApiErrorInfo {
  /** ユーザー向けメッセージ */
  message: string;
  /** 対処方法の案内 */
  advice: string;
}

/** HTTP ステータスコードごとのエラー分類 */
const API_ERROR_MAP: Record<number, ApiErrorInfo> = {
  400: {
    message: "リクエストが不正です",
    advice:
      "パラメータの組み合わせを確認してください。\n" +
      "  --model (fast / standard), --resolution (720p / 1080p / 4K),\n" +
      "  --aspect (16:9 / 9:16), --duration (4 / 6 / 8)",
  },
  403: {
    message: "リクエストがポリシーに違反しています",
    advice:
      "プロンプトの内容を見直してください。\n" +
      "  暴力的・性的・差別的な表現が含まれていないか確認してください。",
  },
  429: {
    message: "レート制限に達しました",
    advice: "しばらく待ってから再度お試しください（数分程度お待ちください）。",
  },
  500: {
    message: "サーバー内部エラーが発生しました",
    advice: "時間をおいて再度お試しください。問題が続く場合は API のステータスページを確認してください。",
  },
  503: {
    message: "サービスが一時的に利用できません",
    advice: "時間をおいて再度お試しください。",
  },
};

// ---------------------------------------------------------------------------
// エラー分類関数
// ---------------------------------------------------------------------------

/**
 * エラーオブジェクトから HTTP ステータスコードを抽出する。
 * Google GenAI SDK のエラー構造や一般的な HTTP エラー構造に対応する。
 */
function extractStatusCode(error: unknown): number | undefined {
  if (error == null || typeof error !== "object") return undefined;

  const err = error as Record<string, unknown>;

  // @google/genai SDK のエラーは status プロパティを持つ場合がある
  if (typeof err.status === "number") return err.status;

  // httpStatusCode や statusCode パターン
  if (typeof err.httpStatusCode === "number") return err.httpStatusCode;
  if (typeof err.statusCode === "number") return err.statusCode;

  // message からステータスコードを抽出する（"[400 Bad Request]" 等）
  if (typeof err.message === "string") {
    const match = err.message.match(/\[(\d{3})\s/);
    if (match) return Number(match[1]);

    // "got status: 429" パターン
    const statusMatch = err.message.match(/status:\s*(\d{3})/);
    if (statusMatch) return Number(statusMatch[1]);
  }

  return undefined;
}

/**
 * ネットワーク関連のエラーかどうかを判定する。
 */
function isNetworkError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;

  const err = error as Record<string, unknown>;
  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : "";

  const networkCodes = [
    "ENOTFOUND",
    "ECONNREFUSED",
    "ECONNRESET",
    "ECONNABORTED",
    "ETIMEDOUT",
    "ENETUNREACH",
    "EPIPE",
    "EAI_AGAIN",
  ];

  if (networkCodes.includes(code)) return true;

  // fetch API の TypeError: Failed to fetch パターン
  if (error instanceof TypeError && /fetch|network/i.test(message)) return true;

  return false;
}

/**
 * タイムアウトエラーかどうかを判定する。
 */
function isTimeoutError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;

  const err = error as Record<string, unknown>;
  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : "";
  const name = typeof err.name === "string" ? err.name : "";

  if (code === "ETIMEDOUT" || code === "ECONNABORTED") return true;
  if (name === "AbortError" || name === "TimeoutError") return true;
  if (/timeout|timed?\s*out/i.test(message)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// ユーザー向けエラーメッセージの生成
// ---------------------------------------------------------------------------

/**
 * エラーを分類し、ユーザー向けのメッセージを生成する。
 *
 * @param error - 捕捉したエラー
 * @returns フォーマットされたエラーメッセージ
 */
export function formatErrorMessage(error: unknown): string {
  // 既に適切なメッセージを持つ Error（resolveConfig や validateConfig 由来）
  if (error instanceof Error) {
    // タイムアウトエラーの判定
    if (isTimeoutError(error)) {
      return (
        "エラー: 接続がタイムアウトしました\n\n" +
        "対処方法:\n" +
        "  ネットワーク接続を確認し、再度お試しください。\n" +
        "  問題が続く場合はプロキシやファイアウォールの設定を確認してください。"
      );
    }

    // ネットワークエラーの判定
    if (isNetworkError(error)) {
      return (
        "エラー: ネットワークに接続できません\n\n" +
        "対処方法:\n" +
        "  インターネット接続を確認してください。\n" +
        "  DNS 解決に失敗している場合はネットワーク設定を確認してください。"
      );
    }

    // API エラー（ステータスコード付き）
    const statusCode = extractStatusCode(error);
    if (statusCode !== undefined) {
      const info = API_ERROR_MAP[statusCode];
      if (info) {
        return (
          `エラー: ${info.message}（HTTP ${statusCode}）\n\n` +
          `対処方法:\n  ${info.advice}`
        );
      }
      // 未知のステータスコード
      return (
        `エラー: API エラーが発生しました（HTTP ${statusCode}）\n\n` +
        `詳細: ${error.message}\n\n` +
        "対処方法:\n  時間をおいて再度お試しください。"
      );
    }

    // config.ts や generator.ts 由来の既知エラーメッセージはそのまま表示
    return `エラー: ${error.message}`;
  }

  // 未知のエラー（Error インスタンスでない場合）
  return `エラー: 予期しないエラーが発生しました\n\n詳細: ${String(error)}`;
}
