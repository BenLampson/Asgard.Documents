import fs from "node:fs";
import { spawn } from "node:child_process";
import { generateAssets } from "./generate-assets.mjs";
generateAssets();
let timer;
const watcher = fs.watch("content", { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      generateAssets();
    } catch (error) {
      console.error("Content generation failed:", error);
    }
  }, 150);
});
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0"],
  { stdio: "inherit" },
);
const stop = () => {
  watcher.close();
  clearTimeout(timer);
  child.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => {
  watcher.close();
  clearTimeout(timer);
  process.exit(code ?? 0);
});
