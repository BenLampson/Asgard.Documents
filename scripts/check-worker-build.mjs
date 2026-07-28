import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { root } from "./documentation-routes.mjs";

const serverDirectory = path.join(root, "dist", "server");
const configPath = path.join(serverDirectory, "wrangler.json");
const packagePath = path.join(root, "package.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

assert.equal(config.main, "index.js", "Worker build must point Wrangler at dist/server/index.js");
await access(path.join(serverDirectory, config.main));

assert.equal(config.assets?.directory, "../client", "Worker assets must resolve to dist/client");
const clientDirectory = path.resolve(serverDirectory, config.assets.directory);
await access(clientDirectory);

const assetDirectory = path.join(clientDirectory, "assets");
const assets = await readdir(assetDirectory);
assert.ok(assets.some((name) => name.endsWith(".css")), "Worker client output has no CSS asset");
assert.ok(assets.some((name) => name.endsWith(".js")), "Worker client output has no JavaScript asset");

assert.match(
  packageJson.scripts?.start ?? "",
  /wrangler dev --config dist\/server\/wrangler\.json/,
  "npm start must preview the generated Worker with its ASSETS binding",
);

console.log(`Worker-build check OK: ${assets.length} client assets and Wrangler ASSETS binding are present.`);
