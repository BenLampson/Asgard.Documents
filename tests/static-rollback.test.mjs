import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createStaticArtifactManifest } from "../scripts/verify-static-artifact.mjs";
import { createStaticRollbackPlan } from "../scripts/plan-static-rollback.mjs";

async function artifact(root, files) {
  for (const [name, value] of Object.entries(files)) {
    const destination = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, value);
  }
  const manifest = await createStaticArtifactManifest({ root, evidenceDate: "2026-07-18" });
  await writeFile(path.join(root, "artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

test("plans an exact verified rollback without claiming operator gates", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "asgard-rollback-"));
  try {
    const currentRoot = path.join(temp, "current");
    const targetRoot = path.join(temp, "target");
    await Promise.all([mkdir(currentRoot), mkdir(targetRoot)]);
    const currentManifest = await artifact(currentRoot, { "same.txt": "same", "changed.txt": "new", "new-only.txt": "remove" });
    const targetManifest = await artifact(targetRoot, { "same.txt": "same", "changed.txt": "old", "old-only.txt": "restore" });
    const plan = await createStaticRollbackPlan({ currentRoot, targetRoot, currentManifest, targetManifest });
    assert.equal(plan.transition.fromAggregateSha256, currentManifest.aggregateSha256);
    assert.equal(plan.transition.toAggregateSha256, targetManifest.aggregateSha256);
    assert.deepEqual(plan.changes.unchanged, ["same.txt"]);
    assert.deepEqual(plan.changes.addFromTarget.map((item) => item.path), ["old-only.txt"]);
    assert.deepEqual(plan.changes.removeFromCurrent.map((item) => item.path), ["new-only.txt"]);
    assert.deepEqual(plan.changes.replaceWithTarget.map((item) => item.path), ["changed.txt"]);
    assert.ok(plan.requiredOperatorGates.every((gate) => gate.status !== "passed"));
    assert.equal("generatedAt" in plan, false);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("fails closed when either rollback artifact is modified", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "asgard-rollback-"));
  try {
    const currentRoot = path.join(temp, "current");
    const targetRoot = path.join(temp, "target");
    await Promise.all([mkdir(currentRoot), mkdir(targetRoot)]);
    const currentManifest = await artifact(currentRoot, { "index.html": "current" });
    const targetManifest = await artifact(targetRoot, { "index.html": "target" });
    await writeFile(path.join(targetRoot, "index.html"), "tampered");
    await assert.rejects(createStaticRollbackPlan({ currentRoot, targetRoot, currentManifest, targetManifest }), /missing, extra, modified/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("rejects identical current and target releases", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "asgard-rollback-"));
  try {
    const currentRoot = path.join(temp, "current");
    const targetRoot = path.join(temp, "target");
    await Promise.all([mkdir(currentRoot), mkdir(targetRoot)]);
    const currentManifest = await artifact(currentRoot, { "index.html": "same" });
    const targetManifest = await artifact(targetRoot, { "index.html": "same" });
    await assert.rejects(createStaticRollbackPlan({ currentRoot, targetRoot, currentManifest, targetManifest }), /no rollback transition/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
