import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { buildSkillDigest } from "./verify-skills-installation.mjs";

function readFrontmatter(skill, skillName) {
  const block = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  assert.ok(block, `${skillName} must have YAML frontmatter`);
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = block.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  assert.equal(name, skillName, `${skillName} frontmatter name must match its directory`);
  assert.ok(description, `${skillName} must expose a frontmatter description`);
  return { name, description };
}

export async function createSkillsArtifacts({ sourceRoot, sourceSnapshot, contract }) {
  assert.match(contract.fullCommit, /^[0-9a-f]{40}$/, "Skills artifact requires a full commit SHA");
  assert.equal(contract.releaseStatus, "audited-snapshot", "Skills artifact must remain an audited snapshot");
  assert.equal(contract.reviewedAt, sourceSnapshot.reviewedAt ?? contract.reviewedAt, "Skills review dates differ");
  assert.ok(sourceSnapshot.commit === contract.fullCommit || contract.fullCommit.startsWith(sourceSnapshot.commit), "Skills commits differ");

  const expectedSkills = [...contract.expectedSkills].sort();
  const skillsRoot = path.join(sourceRoot, "skills");
  const actualSkills = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actualSkills, expectedSkills, "Skills source differs from the reviewed catalog");

  const skills = [];
  for (const skillName of expectedSkills) {
    const skillRoot = path.join(skillsRoot, skillName);
    const skillText = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
    const { description } = readFrontmatter(skillText, skillName);
    const digest = await buildSkillDigest(skillRoot);
    skills.push({
      name: skillName,
      path: `skills/${skillName}`,
      description,
      sha256: digest.sha256,
      files: digest.files,
    });
  }

  const skillNames = new Set(expectedSkills);
  const bundleIds = new Set();
  for (const bundle of contract.bundles) {
    assert.match(bundle.id, /^[a-z0-9-]+$/, `invalid Skills bundle id ${bundle.id}`);
    assert.ok(!bundleIds.has(bundle.id), `duplicate Skills bundle ${bundle.id}`);
    bundleIds.add(bundle.id);
    assert.ok(bundle.purposeZh && bundle.purposeEn, `${bundle.id} must have bilingual purpose text`);
    assert.equal(new Set(bundle.skills).size, bundle.skills.length, `${bundle.id} contains duplicate Skills`);
    for (const skillName of bundle.skills) assert.ok(skillNames.has(skillName), `${bundle.id} references unknown Skill ${skillName}`);
  }

  const source = {
    repository: contract.repository,
    ref: contract.fullCommit,
    reviewedAt: contract.reviewedAt,
    releaseStatus: contract.releaseStatus,
    tagAtReview: contract.tagAtReview,
  };
  const warningIds = (contract.compatibilityWarnings ?? []).map((warning) => warning.id);
  assert.equal(new Set(warningIds).size, warningIds.length, "Skills compatibility warning IDs must be unique");
  assert.ok(warningIds.every(Boolean), "Every Skills compatibility warning requires an ID");

  const manifest = {
    schemaVersion: 1,
    source,
    dependencySemantics: "explicit-bundles-only",
    skills,
    bundles: contract.bundles,
    compatibilityWarningIds: warningIds,
  };
  const lock = createSkillsLock(manifest);
  return { manifest, lock };
}

export function createSkillsLock(manifest) {
  assert.equal(manifest.schemaVersion, 1, "unsupported Skills manifest schema");
  assert.equal(manifest.source.releaseStatus, "audited-snapshot", "Skills lock must not claim stable status");
  return {
    schemaVersion: 1,
    source: manifest.source,
    dependencySemantics: "explicit-bundles-only",
    bundle: "all-reviewed",
    skills: manifest.skills.map(({ name, path: skillPath, sha256: digest }) => ({ name, path: skillPath, sha256: digest })),
    compatibilityWarningIds: manifest.compatibilityWarningIds,
  };
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
