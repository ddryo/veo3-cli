import { Command } from "commander";
import { resolveConfig } from "./config.js";
import { validateConfig } from "./validator.js";
import { generateVideo } from "./generator.js";
import { downloadVideo } from "./downloader.js";
import { formatErrorMessage } from "./errors.js";
import { DEFAULTS } from "./types.js";

// ---------------------------------------------------------------------------
// CLI 定義
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name("veo3")
  .description("Google Veo 3 API を利用したテキストプロンプトからの動画生成 CLI ツール")
  .version("1.0.0")
  .argument("<prompt>", "動画生成に使用するテキストプロンプト")
  .option("-m, --model <model>", `モデル (fast / standard) [デフォルト: ${DEFAULTS.model}]`)
  .option("-r, --resolution <resolution>", `解像度 (720p / 1080p / 4K) [デフォルト: ${DEFAULTS.resolution}]`)
  .option("-a, --aspect <aspect>", `アスペクト比 (16:9 / 9:16) [デフォルト: ${DEFAULTS.aspectRatio}]`)
  .option("-d, --duration <seconds>", `動画尺 (4 / 6 / 8) [デフォルト: ${DEFAULTS.duration}]`)
  .action(async (prompt: string, opts: { model?: string; resolution?: string; aspect?: string; duration?: string }) => {
    // CLI 引数を CliOptions に変換（未指定の場合は undefined のまま config.ts に委ねる）
    const cliOptions = {
      model: opts.model,
      resolution: opts.resolution,
      aspect: opts.aspect,
      duration: opts.duration !== undefined ? Number(opts.duration) : undefined,
    };

    // 1. 設定の解決（CLI 引数 > .env > デフォルト値）
    const config = resolveConfig(cliOptions);

    // 2. パラメータバリデーション
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.error(`\nエラー: ${validation.message}`);
      process.exit(1);
    }

    // 設定内容の表示
    console.log("\n--- 動画生成設定 ---");
    console.log(`プロンプト : ${prompt}`);
    console.log(`モデル     : ${config.modelAlias} (${config.model})`);
    console.log(`解像度     : ${config.resolution}`);
    console.log(`アスペクト比: ${config.aspectRatio}`);
    console.log(`動画尺     : ${config.duration}秒`);
    console.log("--------------------\n");

    // 3. 動画生成
    const result = await generateVideo(prompt, config);

    // 4. ダウンロード・保存
    const outputPath = await downloadVideo(prompt, result, config);

    console.log(`\n完了: ${outputPath}`);
  });

// ---------------------------------------------------------------------------
// エントリポイント
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    await program.parseAsync();
  } catch (error: unknown) {
    console.error(`\n${formatErrorMessage(error)}`);
    process.exit(1);
  }
}

main();
