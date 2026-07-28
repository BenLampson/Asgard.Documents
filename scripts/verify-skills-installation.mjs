import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function listFiles(directory, prefix = "") {
  const current = path.join(directory, ...prefix.split("/").filter(Boolean));
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(directory, relativePath));
    else if (entry.isFile()) {
      const bytes = await readFile(path.join(directory, ...relativePath.split("/")));
      files.push({ path: relativePath, sha256: sha256(bytes) });
    } else {
      throw new Error(`Unsupported filesystem entry in Skill: ${path.join(directory, ...relativePath.split("/"))}`);
    }
  }
  return files;
}

export async function buildSkillDigest(skillDirectory) {
  const files = await listFiles(skillDirectory);
  assert.ok(files.some((file) => file.path === "SKILL.md"), `${skillDirectory} has no SKILL.md`);
  return {
    sha256: sha256(files.map((file) => `${file.path}\0${file.sha256}\n`).join("")),
    files,
  };
}

export async function verifySkillsInstallation({ installationRoot, lock }) {
  assert.equal(lock.schemaVersion, 1, "unsupported Asgard Skills lock schema");
  assert.equal(lock.source?.releaseStatus, "audited-snapshot", "lock must identify an audited snapshot");
  assert.equal(lock.dependencySemantics, "explicit-bundles-only", "lock is not a dependency resolver");
  assert.match(lock.source?.ref ?? "", /^[0-9a-f]{40}$/, "lock requires a full commit SHA");
  assert.ok(Array.isArray(lock.skills) && lock.skills.length > 0, "lock contains no Skills");

  const expectedNames = lock.skills.map((skill) => skill.name).sort();
  assert.equal(new Set(expectedNames).size, expectedNames.length, "lock contains duplicate Skills");
  const rootEntries = await readdir(installationRoot, { withFileTypes: true });
  for (const entry of rootEntries) assert.ok(entry.isDirectory(), `unexpected non-directory entry in staging root: ${entry.name}`);
  const actualNames = rootEntries.map((entry) => entry.name).sort();
  assert.deepEqual(actualNames, expectedNames, "staging directory must contain exactly the locked Skill directories");

  const verified = [];
  for (const skill of [...lock.skills].sort((left, right) => left.name.localeCompare(right.name))) {
    assert.equal(skill.path, `skills/${skill.name}`, `${skill.name} has an unexpected repository path`);
    assert.match(skill.sha256 ?? "", /^[0-9a-f]{64}$/, `${skill.name} has an invalid locked hash`);
    const digest = await buildSkillDigest(path.join(installationRoot, skill.name));
    assert.equal(digest.sha256, skill.sha256, `${skill.name} content differs from the audited lock`);
    verified.push({ name: skill.name, sha256: digest.sha256, files: digest.files.length });
  }
  return {
    valid: true,
    sourceRef: lock.source.ref,
    releaseStatus: lock.source.releaseStatus,
    bundle: lock.bundle,
    verified,
  };
}

async function runCli() {
  const args = process.argv.slice(2);
  const valueAfter = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const installationRoot = valueAfter("--root");
  const lockPath = valueAfter("--lock");
  if (!installationRoot || !lockPath || args.includes("--help")) {
    console.error("Usage: node verify-skills-installation.mjs --root <staging-directory> --lock <asgard-skills.lock.json>");
    process.exitCode = 2;
    return;
  }
  try {
    const lock = JSON.parse(await readFile(path.resolve(lockPath), "utf8"));
    const result = await verifySkillsInstallation({ installationRoot: path.resolve(installationRoot), lock });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Asgard Skills verification failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url || fileURLToPath(import.meta.url) === process.argv[1]) await runCli();
