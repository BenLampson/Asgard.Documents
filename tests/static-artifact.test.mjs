import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createStaticArtifactManifest, inferStaticMime, verifyStaticArtifact } from "../scripts/verify-static-artifact.mjs";

async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "asgard-static-artifact-"));
  try {
    await mkdir(path.join(root, "en", "docs"), { recursive: true });
    await mkdir(path.join(root, "assets"), { recursive: true });
    await writeFile(path.join(root, "en", "docs", "index.html"), "<!doctype html>\n", "utf8");
    await writeFile(path.join(root, "en", "docs", "index.html.md"), "# Guide\n", "utf8");
    await writeFile(path.join(root, "assets", "app.js"), "export {};\n", "utf8");
    await writeFile(path.join(root, "_headers"), "/assets/*\n  Cache-Control: immutable\n", "utf8");
    const manifest = await createStaticArtifactManifest({ root, evidenceDate: "2026-07-18" });
    await writeFile(path.join(root, "artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await run(root, manifest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("static artifact manifest uses POSIX paths, exact bytes, MIME, and an aggregate hash", async () => {
  await fixture(async (root, manifest) => {
    assert.deepEqual(manifest.exclusions, ["artifact-manifest.json"]);
    assert.equal(manifest.fileCount, 4);
    assert.match(manifest.aggregateSha256, /^[0-9a-f]{64}$/);
    assert.ok(manifest.files.every((file) => !file.path.includes("\\")));
    assert.equal(manifest.files.find((file) => file.path.endsWith("index.html.md"))?.mime, "text/markdown; charset=utf-8");
    assert.equal(inferStaticMime("_headers"), "text/plain; charset=utf-8");
    assert.equal((await verifyStaticArtifact({ root, manifest })).valid, true);
    assert.ok(await readFile(path.join(root, "artifact-manifest.json"), "utf8"));
  });
});

test("static artifact verifier fails closed on modified, missing, and extra files", async () => {
  await fixture(async (root, manifest) => {
    const target = path.join(root, "assets", "app.js");
    await writeFile(target, "modified\n", "utf8");
    await assert.rejects(verifyStaticArtifact({ root, manifest }), /missing, extra, modified/);
    await unlink(target);
    await assert.rejects(verifyStaticArtifact({ root, manifest }), /missing, extra, modified/);
    await writeFile(target, "export {};\n", "utf8");
    await writeFile(path.join(root, "extra.txt"), "extra\n", "utf8");
    await assert.rejects(verifyStaticArtifact({ root, manifest }), /missing, extra, modified/);
  });
});

test("artifact manifest cannot exclude arbitrary extra paths", async () => {
  await fixture(async (root) => {
    await assert.rejects(
      createStaticArtifactManifest({ root, evidenceDate: "2026-07-18", exclusions: ["artifact-manifest.json", "extra.txt"] }),
      /only exclusion/,
    );
  });
});
