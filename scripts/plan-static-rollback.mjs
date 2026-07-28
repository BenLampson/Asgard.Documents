import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { staticArtifactManifestPath, verifyStaticArtifact } from "./verify-static-artifact.mjs";

function classify(currentManifest, targetManifest) {
  const current = new Map(currentManifest.files.map((file) => [file.path, file]));
  const target = new Map(targetManifest.files.map((file) => [file.path, file]));
  const paths = [...new Set([...current.keys(), ...target.keys()])].sort();
  const changes = { addFromTarget: [], removeFromCurrent: [], replaceWithTarget: [], unchanged: [] };
  for (const artifactPath of paths) {
    const before = current.get(artifactPath);
    const after = target.get(artifactPath);
    if (!before) changes.addFromTarget.push({ path: artifactPath, targetSha256: after.sha256, targetBytes: after.bytes, targetMime: after.mime });
    else if (!after) changes.removeFromCurrent.push({ path: artifactPath, currentSha256: before.sha256, currentBytes: before.bytes, currentMime: before.mime });
    else if (before.sha256 !== after.sha256 || before.bytes !== after.bytes || before.mime !== after.mime) {
      changes.replaceWithTarget.push({ path: artifactPath, currentSha256: before.sha256, targetSha256: after.sha256, currentBytes: before.bytes, targetBytes: after.bytes, currentMime: before.mime, targetMime: after.mime });
    } else changes.unchanged.push(artifactPath);
  }
  return changes;
}

export async function createStaticRollbackPlan({ currentRoot, targetRoot, currentManifest, targetManifest }) {
  assert.notEqual(path.resolve(currentRoot), path.resolve(targetRoot), "current and target artifact directories must differ");
  const currentVerification = await verifyStaticArtifact({ root: currentRoot, manifest: currentManifest });
  const targetVerification = await verifyStaticArtifact({ root: targetRoot, manifest: targetManifest });
  assert.notEqual(currentVerification.aggregateSha256, targetVerification.aggregateSha256, "current and target aggregate hashes are identical; no rollback transition exists");
  const changes = classify(currentManifest, targetManifest);
  return {
    schemaVersion: 1,
    timestampPolicy: "No planning, upload, deployment, verification, or cutover timestamp is invented.",
    actionPolicy: "Read-only plan. This evidence does not copy, delete, upload, deploy, or switch traffic.",
    current: currentVerification,
    target: targetVerification,
    transition: {
      fromAggregateSha256: currentVerification.aggregateSha256,
      toAggregateSha256: targetVerification.aggregateSha256,
      addFromTargetCount: changes.addFromTarget.length,
      removeFromCurrentCount: changes.removeFromCurrent.length,
      replaceWithTargetCount: changes.replaceWithTarget.length,
      unchangedCount: changes.unchanged.length,
    },
    changes,
    requiredOperatorGates: [
      { id: "trusted-manifest-source", status: "not-attested" },
      { id: "target-environment-smoke", status: "not-performed" },
      { id: "traffic-switch", status: "not-performed" },
      { id: "post-switch-public-https", status: "not-performed" },
    ],
  };
}

async function runCli() {
  const args = process.argv.slice(2);
  const valueAfter = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const currentRoot = valueAfter("--current-root");
  const targetRoot = valueAfter("--target-root");
  const output = valueAfter("--output");
  if (!currentRoot || !targetRoot || args.includes("--help")) {
    console.error("Usage: node plan-static-rollback.mjs --current-root <current-static-dir> --target-root <previous-static-dir> [--output <plan.json>]");
    process.exitCode = 2;
    return;
  }
  try {
    const currentResolved = path.resolve(currentRoot);
    const targetResolved = path.resolve(targetRoot);
    if (output) {
      const outputResolved = path.resolve(output);
      const inside = (root) => outputResolved === root || outputResolved.startsWith(`${root}${path.sep}`);
      assert.ok(!inside(currentResolved) && !inside(targetResolved), "plan output must stay outside both verified artifact directories");
    }
    const [currentManifest, targetManifest] = await Promise.all([
      readFile(path.join(currentResolved, staticArtifactManifestPath), "utf8").then(JSON.parse),
      readFile(path.join(targetResolved, staticArtifactManifestPath), "utf8").then(JSON.parse),
    ]);
    const plan = await createStaticRollbackPlan({ currentRoot: currentResolved, targetRoot: targetResolved, currentManifest, targetManifest });
    const serialized = `${JSON.stringify(plan, null, 2)}\n`;
    if (output) await writeFile(path.resolve(output), serialized, "utf8");
    else process.stdout.write(serialized);
  } catch (error) {
    console.error(`Static rollback planning failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runCli();
