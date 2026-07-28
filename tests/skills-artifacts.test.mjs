import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createSkillsLock } from "../scripts/skills-artifacts.mjs";
import { createSkillsCompatibilityReport } from "../scripts/skills-compatibility-report.mjs";
import { buildSkillDigest, verifySkillsInstallation } from "../scripts/verify-skills-installation.mjs";

const manifest = JSON.parse(await readFile(new URL("../data/skills-audited-snapshot.json", import.meta.url), "utf8"));
const sourceManifest = JSON.parse(await readFile(new URL("../docs-sources.json", import.meta.url), "utf8"));

test("compatibility report is generated from the warning contract and blocks stable eligibility", () => {
  const report = createSkillsCompatibilityReport({ sourceManifest, auditedSnapshot: manifest });
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.framework.version, "5.1.3");
  assert.equal(report.skillsSnapshot.releaseStatus, "audited-snapshot");
  assert.equal(report.summary.openWarnings, sourceManifest.skillsContract.compatibilityWarnings.length);
  assert.equal(report.summary.openWarnings, 10);
  assert.equal(report.summary.stableEligible, false);
  assert.deepEqual(report.warnings.map((warning) => warning.id), manifest.compatibilityWarningIds);
  assert.equal(report.warnings.find((warning) => warning.id === "stale-asgard-release-baseline")?.guidance.zh.includes("5.1.3"), true);
  for (const warning of report.warnings) {
    assert.equal(warning.status, "open");
    assert.ok(warning.sourceFiles.length > 0);
    assert.ok(warning.sourceEvidence);
    assert.ok(warning.documentationEvidence);
    assert.ok(warning.guidance.zh && warning.guidance.en);
  }
});

test("removing a resolved warning requires manifest IDs to change in the same review", () => {
  const changedSource = structuredClone(sourceManifest);
  changedSource.skillsContract.compatibilityWarnings.pop();
  assert.throws(
    () => createSkillsCompatibilityReport({ sourceManifest: changedSource, auditedSnapshot: manifest }),
    /manifest and compatibility warning contracts differ/,
  );
});

test("audited Skills manifest fixes the reviewed snapshot without claiming stable status", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.source.ref, "7b26856ae6a3266f9d33be44c8880ee8863888d3");
  assert.equal(manifest.source.reviewedAt, "2026-07-28");
  assert.equal(manifest.source.releaseStatus, "audited-snapshot");
  assert.equal(manifest.dependencySemantics, "explicit-bundles-only");
  assert.equal(manifest.skills.length, 29);
  assert.equal(new Set(manifest.skills.map((skill) => skill.name)).size, 29);
  assert.ok(manifest.skills.some((skill) => skill.name === "heimdall-application-rbac"));
  assert.ok(manifest.skills.some((skill) => skill.name === "heimdall-mcp-management"));
  assert.deepEqual(sourceManifest.skillsContract.auditDelta.addedSkills, ["heimdall-application-rbac", "heimdall-mcp-management"]);
  assert.deepEqual(sourceManifest.skillsContract.auditDelta.removedSkills, []);
  assert.deepEqual(sourceManifest.skillsContract.auditDelta.renamedSkills, []);
  assert.deepEqual(sourceManifest.skillsContract.auditDelta.resolvedCompatibilityWarningIds, []);
  assert.deepEqual(sourceManifest.skillsContract.auditDelta.addedCompatibilityWarningIds, []);
  for (const skill of manifest.skills) {
    assert.equal(skill.path, `skills/${skill.name}`);
    assert.ok(skill.description);
    assert.match(skill.sha256, /^[0-9a-f]{64}$/);
    assert.ok(skill.files.some((file) => file.path === "SKILL.md"));
    for (const file of skill.files) assert.match(file.sha256, /^[0-9a-f]{64}$/);
  }
});

test("installation lock is derived from the audited manifest and explicit all-reviewed bundle", () => {
  const lock = createSkillsLock(manifest);
  assert.equal(lock.bundle, "all-reviewed");
  assert.equal(lock.source.releaseStatus, "audited-snapshot");
  assert.deepEqual(lock.skills, manifest.skills.map(({ name, path, sha256 }) => ({ name, path, sha256 })));
  const bundle = manifest.bundles.find((item) => item.id === lock.bundle);
  assert.deepEqual([...bundle.skills].sort(), lock.skills.map((skill) => skill.name).sort());
});

test("lock generation rejects a manifest that claims stable status", () => {
  assert.throws(
    () => createSkillsLock({ ...manifest, source: { ...manifest.source, releaseStatus: "stable" } }),
    /must not claim stable status/,
  );
});

async function withStaging(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "asgard-skills-stage-"));
  try {
    for (const name of ["alpha", "beta"]) {
      await mkdir(path.join(root, name, "references"), { recursive: true });
      await writeFile(path.join(root, name, "SKILL.md"), `---\nname: ${name}\ndescription: test\n---\n`, "utf8");
      await writeFile(path.join(root, name, "references", "contract.md"), `${name} contract\n`, "utf8");
    }
    const skills = [];
    for (const name of ["alpha", "beta"]) {
      const digest = await buildSkillDigest(path.join(root, name));
      skills.push({ name, path: `skills/${name}`, sha256: digest.sha256 });
    }
    const lock = {
      schemaVersion: 1,
      source: { ref: manifest.source.ref, releaseStatus: "audited-snapshot" },
      dependencySemantics: "explicit-bundles-only",
      bundle: "test",
      skills,
    };
    await run(root, lock);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("staging verifier accepts the exact audited installation", async () => {
  await withStaging(async (root, lock) => {
    const result = await verifySkillsInstallation({ installationRoot: root, lock });
    assert.equal(result.valid, true);
    assert.equal(result.verified.length, 2);
  });
});

test("staging verifier fails closed on modified content", async () => {
  await withStaging(async (root, lock) => {
    await writeFile(path.join(root, "alpha", "SKILL.md"), "modified\n", "utf8");
    await assert.rejects(
      verifySkillsInstallation({ installationRoot: root, lock }),
      /content differs from the audited lock/,
    );
  });
});

test("staging verifier fails closed on an extra Skill directory", async () => {
  await withStaging(async (root, lock) => {
    await mkdir(path.join(root, "unreviewed-skill"));
    await assert.rejects(
      verifySkillsInstallation({ installationRoot: root, lock }),
      /must contain exactly the locked Skill directories/,
    );
  });
});
