import { Command } from "commander";
import { resolveConfig } from "./config.js";
import { validateConfig } from "./validator.js";
import { generateVideoWithFirstLastFrames } from "./generator.js";
import { downloadVideo, LOOP_OUTPUT_DIR } from "./downloader.js";
import { formatErrorMessage } from "./errors.js";
import { loadImageFileAsGenAiImage } from "./imageLoader.js";
import { DEFAULTS } from "./types.js";
import path from "node:path";

// ---------------------------------------------------------------------------
// CLI: 先頭・末尾フレーム指定でループ向き素材を生成
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name("veo3-loop")
  .description(
    "ループ素材の画像1枚とプロンプトで動画を生成する（API には同一画像を先頭・末尾フレームとして渡す）",
  )
  .version("1.0.0")
  .showHelpAfterError()
  .argument("<image>", "ループ素材の画像（.png / .jpg / .jpeg / .webp）。先頭・末尾に同じファイルを使う")
  .argument("<prompt>", "動きや雰囲気を説明するテキストプロンプト")
  .option("-m, --model <model>", `モデル (fast / standard) [デフォルト: ${DEFAULTS.model}]`)
  .option("-r, --resolution <resolution>", `解像度 (720p / 1080p / 4K) [デフォルト: ${DEFAULTS.resolution}]`)
  .option("-a, --aspect <aspect>", `アスペクト比 (16:9 / 9:16) [デフォルト: ${DEFAULTS.aspectRatio}]`)
  .option("-d, --duration <seconds>", `動画尺 (4 / 6 / 8) [デフォルト: ${DEFAULTS.duration}]`)
  .action(
    async (
      imagePath: string,
      prompt: string,
      opts: {
        model?: string;
        resolution?: string;
        aspect?: string;
        duration?: string;
      },
    ) => {
      const cliOptions = {
        model: opts.model,
        resolution: opts.resolution,
        aspect: opts.aspect,
        duration: opts.duration !== undefined ? Number(opts.duration) : undefined,
      };

      const config = resolveConfig(cliOptions);

      const validation = validateConfig(config);
      if (!validation.valid) {
        console.error(`\nエラー: ${validation.message}`);
        process.exit(1);
      }

      const imageResolved = path.resolve(imagePath);

      console.log("\n--- 動画生成設定（ループ素材・先頭=末尾） ---");
      console.log(`ループ素材   : ${imageResolved}`);
      console.log(`プロンプト   : ${prompt}`);
      console.log(`モデル       : ${config.modelAlias} (${config.model})`);
      console.log(`解像度       : ${config.resolution}`);
      console.log(`アスペクト比 : ${config.aspectRatio}`);
      console.log(`動画尺       : ${config.duration}秒`);
      console.log("------------------------------------------\n");

      // 同一画像を先頭・末尾に渡す（ファイルは1回だけ読み込む）
      const frameImage = await loadImageFileAsGenAiImage(imagePath);

      const result = await generateVideoWithFirstLastFrames(prompt, frameImage, frameImage, config);

      const outputPath = await downloadVideo(prompt, result, config, {
        outputDir: LOOP_OUTPUT_DIR,
        mode: "first-last-loop",
        firstFramePath: imageResolved,
        lastFramePath: imageResolved,
      });

      console.log(`\n完了: ${outputPath}`);
    },
  );

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
