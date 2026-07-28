import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const staticArtifactManifestPath = "artifact-manifest.json";
export const staticArtifactAggregateAlgorithm = "sha256(path + NUL + decimal-bytes + NUL + lowercase-file-sha256 + LF), entries sorted by POSIX path";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function inferStaticMime(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized === "_headers" || normalized === ".assetsignore") return "text/plain; charset=utf-8";
  const extension = path.posix.extname(normalized).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".woff2": "font/woff2",
  })[extension] ?? "application/octet-stream";
}

async function enumerate(root, prefix = "") {
  const current = path.join(root, ...prefix.split("/").filter(Boolean));
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await enumerate(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
    else throw new Error(`Unsupported symlink or special entry in static artifact: ${relativePath}`);
  }
  return files;
}

function aggregate(files) {
  return sha256(files.map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join(""));
}

export async function createStaticArtifactManifest({ root, evidenceDate, exclusions = [staticArtifactManifestPath] }) {
  assert.match(evidenceDate, /^\d{4}-\d{2}-\d{2}$/, "static artifact evidenceDate must be an exact reviewed date");
  assert.deepEqual(exclusions, [staticArtifactManifestPath], "artifact manifest itself must be the only exclusion");
  const exclusionSet = new Set(exclusions);
  const paths = (await enumerate(root)).filter((relativePath) => !exclusionSet.has(relativePath)).sort();
  const files = [];
  for (const relativePath of paths) {
    assert.equal(relativePath, relativePath.replaceAll("\\", "/"), `non-POSIX artifact path ${relativePath}`);
    const absolutePath = path.join(root, ...relativePath.split("/"));
    const info = await stat(absolutePath);
    const bytes = await readFile(absolutePath);
    assert.equal(info.size, bytes.length, `${relativePath} changed while hashing`);
    files.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes), mime: inferStaticMime(relativePath) });
  }
  return {
    schemaVersion: 1,
    evidenceDate,
    timestampPolicy: "No build, upload, or verification timestamp is invented.",
    exclusions,
    fileHashAlgorithm: "SHA-256 over exact file bytes",
    aggregateAlgorithm: staticArtifactAggregateAlgorithm,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    aggregateSha256: aggregate(files),
    files,
  };
}

export async function verifyStaticArtifact({ root, manifest }) {
  assert.equal(manifest.schemaVersion, 1, "unsupported static artifact manifest schema");
  assert.deepEqual(manifest.exclusions, [staticArtifactManifestPath], "manifest must be its only exclusion");
  assert.equal(manifest.aggregateAlgorithm, staticArtifactAggregateAlgorithm, "unsupported aggregate algorithm");
  const actual = await createStaticArtifactManifest({ root, evidenceDate: manifest.evidenceDate, exclusions: manifest.exclusions });
  assert.deepEqual(actual.files, manifest.files, "static artifact contains missing, extra, modified, or MIME-mismatched files");
  assert.equal(actual.fileCount, manifest.fileCount, "static artifact file count differs");
  assert.equal(actual.totalBytes, manifest.totalBytes, "static artifact byte count differs");
  assert.equal(actual.aggregateSha256, manifest.aggregateSha256, "static artifact aggregate hash differs");
  return { valid: true, fileCount: actual.fileCount, totalBytes: actual.totalBytes, aggregateSha256: actual.aggregateSha256, evidenceDate: actual.evidenceDate };
}

async function runCli() {
  const args = process.argv.slice(2);
  const valueAfter = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const root = valueAfter("--root");
  const manifestPath = valueAfter("--manifest") ?? (root ? path.join(root, staticArtifactManifestPath) : undefined);
  if (!root || !manifestPath || args.includes("--help")) {
    console.error("Usage: node verify-static-artifact.mjs --root <static-directory> [--manifest <artifact-manifest.json>]");
    process.exitCode = 2;
    return;
  }
  try {
    const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
    console.log(JSON.stringify(await verifyStaticArtifact({ root: path.resolve(root), manifest }), null, 2));
  } catch (error) {
    console.error(`Static artifact verification failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runCli();
