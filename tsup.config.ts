import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/cli-loop.ts"],
  format: ["esm"],
  target: "node20",
  outDir: ".build",
  clean: true,
  sourcemap: true,
  dts: false,
});
