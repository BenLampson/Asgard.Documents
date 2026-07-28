import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createSkillsArtifacts } from "./skills-artifacts.mjs";
import { createSkillsCompatibilityReport } from "./skills-compatibility-report.mjs";
import { createChangelogReviewReport } from "./changelog-review.mjs";
import { getSourceSnapshot } from "./source-fingerprint.mjs";
import { documentationContentFiles, generatedBilingualDocumentationSlugs } from "./documentation-content-files.mjs";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "docs-sources.json"), "utf8"));
const contentFiles = documentationContentFiles.map((file) => path.join(root, file));

const content = (await Promise.all(contentFiles.map((file) => readFile(file, "utf8")))).join("\n");
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function verifyRepositorySnapshot(label, record, configuredPath) {
  try {
    const snapshot = await getSourceSnapshot(configuredPath);
    assert.ok(snapshot.commit.startsWith(record.commit), `${label} commit is ${snapshot.commit.slice(0, 7)}, docs record ${record.commit}`);
    assert.equal(snapshot.worktreeDirty, record.worktreeDirty, `${label} dirty state changed`);
    if (snapshot.worktreeDirty) {
      assert.equal(snapshot.worktreeFingerprint, record.worktreeFingerprint, `${label} dirty worktree changed; review docs and refresh its fingerprint`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (process.argv.includes("--strict-source")) throw error;
    console.warn(`${label} repository unavailable at ${configuredPath}; skipped snapshot comparison.`);
  }
}
const slugCounts = new Map();
for (const match of content.matchAll(/\bslug:\s*"([a-z0-9-]+)"/g)) {
  slugCounts.set(match[1], (slugCounts.get(match[1]) ?? 0) + 1);
}

for (const [slug, count] of slugCounts) {
  const expected = generatedBilingualDocumentationSlugs.includes(slug) ? 1 : 2;
  assert.equal(count, expected, `documentation slug "${slug}" has the wrong source declaration count`);
}
for (const slug of generatedBilingualDocumentationSlugs) {
  assert.equal(slugCounts.get(slug), 1, `generated bilingual documentation slug "${slug}" is missing or duplicated`);
}
assert.ok(slugCounts.size > 0, "no documentation slugs found");

if (manifest.nuget) {
  assert.match(content, new RegExp(manifest.nuget.asgardRelease.replaceAll(".", "\\.")), `content does not advertise NuGet ${manifest.nuget.asgardRelease}`);
  assert.equal(manifest.nuget.packages.length, new Set(manifest.nuget.packages).size, "NuGet package manifest contains duplicates");
  if (process.argv.includes("--check-nuget")) {
    const feed = manifest.nuget.feed.replace(/\/$/, "");
    for (const packageId of manifest.nuget.packages) {
      const response = await fetch(`${feed}/${packageId.toLowerCase()}/index.json`);
      assert.equal(response.ok, true, `NuGet package ${packageId} is unavailable (${response.status})`);
      const { versions } = await response.json();
      assert.equal(versions.at(-1), manifest.nuget.asgardRelease, `${packageId} latest is ${versions.at(-1)}, docs record ${manifest.nuget.asgardRelease}`);
    }
    for (const packageRecord of manifest.nuget.additionalPackages ?? []) {
      const response = await fetch(`${feed}/${packageRecord.id.toLowerCase()}/index.json`);
      assert.equal(response.ok, true, `NuGet package ${packageRecord.id} is unavailable (${response.status})`);
      const { versions } = await response.json();
      assert.equal(versions.at(-1), packageRecord.version, `${packageRecord.id} latest is ${versions.at(-1)}, docs record ${packageRecord.version}`);
      assert.match(content, new RegExp(escapePattern(packageRecord.version)), `content does not advertise ${packageRecord.id} ${packageRecord.version}`);
    }
  }
}

const advertisedFiles = [
  path.join(root, "README.md"),
  path.join(root, "app", "content.ts"),
  path.join(root, "app", "layout.tsx"),
  path.join(root, "app", "site-baseline.ts"),
];
for (const file of advertisedFiles) {
  const value = await readFile(file, "utf8");
  assert.match(value, new RegExp(manifest.asgard.version.replaceAll(".", "\\.")), `${path.basename(file)} does not advertise Asgard ${manifest.asgard.version}`);
}
const siteBaselineSource = await readFile(path.join(root, "app", "site-baseline.ts"), "utf8");
assert.match(siteBaselineSource, new RegExp(escapePattern(manifest.reviewedAt)), "site baseline review date differs from docs-sources.json");
assert.match(siteBaselineSource, new RegExp(escapePattern(manifest.skills.commit)), "site baseline Skills commit differs from docs-sources.json");
assert.match(siteBaselineSource, new RegExp(escapePattern(manifest.skillsContract.tagAtReview)), "site baseline Skills tag differs from docs-sources.json");
assert.match(siteBaselineSource, new RegExp(escapePattern(manifest.skillsContract.releaseStatus)), "site baseline Skills release status differs from docs-sources.json");
assert.match(siteBaselineSource, new RegExp(escapePattern(manifest.skillsContract.reviewedAt)), "site baseline Skills review date differs from docs-sources.json");

const configuredSource = process.env.ASGARD_SOURCE_ROOT || manifest.asgard.path;
await verifyRepositorySnapshot("Asgard", manifest.asgard, configuredSource);
const propsPath = path.join(configuredSource, "Directory.Build.props");
try {
  await access(propsPath);
  const props = await readFile(propsPath, "utf8");
  const readVersionPart = (name) => props.match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1]?.trim();
  const sourceVersion = ["MajorVersion", "MinorVersion", "PatchVersion"].map(readVersionPart).join(".");
  assert.equal(manifest.asgard.version, sourceVersion, `Asgard source is ${sourceVersion}, but docs-sources.json records ${manifest.asgard.version}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  if (process.argv.includes("--strict-source")) throw new Error(`Asgard source is unavailable at ${configuredSource}`);
  console.warn(`Asgard source not found at ${configuredSource}; skipped source-version comparison.`);
}

if (manifest.configurationContract) {
  try {
    const sourceContract = (await Promise.all(manifest.configurationContract.sourceFiles.map((file) => readFile(path.join(configuredSource, file), "utf8")))).join("\n");
    for (const anchor of manifest.configurationContract.anchors) {
      assert.match(sourceContract, new RegExp(escapePattern(anchor)), `configuration source no longer exposes ${anchor}`);
      assert.match(content, new RegExp(escapePattern(anchor)), `documentation does not cover configuration key ${anchor}`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (process.argv.includes("--strict-source")) throw error;
    console.warn(`Configuration source unavailable under ${configuredSource}; skipped configuration-contract comparison.`);
  }
}

for (const contract of manifest.moduleContracts ?? []) {
  try {
    const sourceContract = (await Promise.all(contract.sourceFiles.map((file) => readFile(path.join(configuredSource, file), "utf8")))).join("\n");
    for (const anchor of contract.anchors) {
      assert.match(sourceContract, new RegExp(escapePattern(anchor.source)), `${contract.name} source no longer exposes ${anchor.source}`);
      assert.match(content, new RegExp(escapePattern(anchor.content)), `documentation no longer covers ${contract.name} contract ${anchor.content}`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (process.argv.includes("--strict-source")) throw error;
    console.warn(`${contract.name} source unavailable under ${configuredSource}; skipped module-contract comparison.`);
  }
}

const configuredHeimdallSource = process.env.HEIMDALL_SOURCE_ROOT || manifest.heimdall.path;
if (manifest.heimdall.version) {
  assert.match(content, new RegExp(`Heimdall ${manifest.heimdall.version.replaceAll(".", "\\.")}`), `content does not advertise Heimdall ${manifest.heimdall.version}`);

  await verifyRepositorySnapshot("Heimdall", manifest.heimdall, configuredHeimdallSource);
  const heimdallPropsPath = path.join(configuredHeimdallSource, "be", "Directory.Build.props");
  try {
    await access(heimdallPropsPath);
    const props = await readFile(heimdallPropsPath, "utf8");
    const readVersionPart = (name) => props.match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1]?.trim();
    const sourceVersion = ["MajorVersion", "MinorVersion", "PatchVersion"].map(readVersionPart).join(".");
    assert.equal(manifest.heimdall.version, sourceVersion, `Heimdall source is ${sourceVersion}, but docs-sources.json records ${manifest.heimdall.version}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (process.argv.includes("--strict-source")) throw new Error(`Heimdall source is unavailable at ${configuredHeimdallSource}`);
    console.warn(`Heimdall source not found at ${configuredHeimdallSource}; skipped source-version comparison.`);
  }

  for (const contract of manifest.heimdallContracts ?? []) {
    try {
      const sourceContract = (await Promise.all(contract.sourceFiles.map((file) => readFile(path.join(configuredHeimdallSource, file), "utf8")))).join("\n");
      for (const anchor of contract.anchors) {
        assert.match(sourceContract, new RegExp(escapePattern(anchor.source)), `${contract.name} source no longer exposes ${anchor.source}`);
        assert.match(content, new RegExp(escapePattern(anchor.content)), `documentation no longer covers ${contract.name} contract ${anchor.content}`);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      if (process.argv.includes("--strict-source")) throw error;
      console.warn(`${contract.name} source unavailable under ${configuredHeimdallSource}; skipped Heimdall contract comparison.`);
    }
  }
}

const configuredSkillsSource = process.env.ASGARD_SKILLS_ROOT || manifest.skills.path;
await verifyRepositorySnapshot("Asgard Skills", manifest.skills, configuredSkillsSource);
if (manifest.skillsContract) {
  try {
    const skillsRoot = path.join(configuredSkillsSource, "skills");
    const directories = (await readdir(skillsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const expected = [...manifest.skillsContract.expectedSkills].sort();
    assert.deepEqual(directories, expected, "Asgard Skills catalog changed; update bilingual catalog and contract");
    assert.equal(expected.length, 29, "Asgard Skills contract count changed; review the advertised catalog count");
    const artifacts = await createSkillsArtifacts({
      sourceRoot: configuredSkillsSource,
      sourceSnapshot: manifest.skills,
      contract: manifest.skillsContract,
    });
    assert.equal(artifacts.manifest.skills.length, expected.length, "Skills manifest coverage changed");
    assert.equal(artifacts.lock.skills.length, expected.length, "Skills installation lock coverage changed");
    const auditedSnapshot = JSON.parse(await readFile(path.join(root, "data", "skills-audited-snapshot.json"), "utf8"));
    assert.deepEqual(auditedSnapshot, artifacts.manifest, "committed Skills audited snapshot is stale; run node scripts/update-skills-audit.mjs after review");
    const compatibilityReport = createSkillsCompatibilityReport({ sourceManifest: manifest, auditedSnapshot });
    assert.equal(compatibilityReport.summary.openWarnings, manifest.skillsContract.compatibilityWarnings.length, "Skills compatibility report warning count changed");
    assert.equal(compatibilityReport.summary.stableEligible, false, "audited snapshot with open warnings must not become stable eligible");

    for (const skillName of expected) {
      const skill = await readFile(path.join(skillsRoot, skillName, "SKILL.md"), "utf8");
      const frontmatterName = skill.match(/^name:\s*(.+)$/m)?.[1]?.trim();
      const description = skill.match(/^description:\s*(.+)$/m)?.[1]?.trim();
      assert.equal(frontmatterName, skillName, `${skillName} frontmatter name must match its directory`);
      assert.ok(description, `${skillName} must expose a frontmatter description`);
      assert.match(content, new RegExp(escapePattern(skillName)), `bilingual documentation does not cover ${skillName}`);
    }

    const skillReferenceSource = await readFile(path.join(root, "app", "skill-references.ts"), "utf8");
    const referencedSkills = new Set(
      [...skillReferenceSource.matchAll(/"((?:asgard|dotnet)-[a-z0-9-]+|identity-integration)"/g)]
        .map((match) => match[1]),
    );
    assert.ok(referencedSkills.size > 0, "no per-guide Agent workflow Skills found");
    for (const skillName of referencedSkills) {
      assert.ok(expected.includes(skillName), `guide references unknown Skill ${skillName}`);
    }

    for (const warning of manifest.skillsContract.compatibilityWarnings ?? []) {
      const warningSource = (await Promise.all(
        warning.sourceFiles.map((file) => readFile(path.join(configuredSkillsSource, file), "utf8")),
      )).join("\n");
      assert.match(warningSource, new RegExp(escapePattern(warning.source)), `${warning.name} source warning changed; re-audit compatibility`);
      assert.ok(warning.guidanceZh && warning.guidanceEn, `${warning.name} requires bilingual compatibility guidance`);
    }
    const aiReadySource = await readFile(path.join(root, "app", "ai-ready-content.ts"), "utf8");
    assert.match(aiReadySource, /compatibilityWarnings\.map\(\(warning\) => `\[\$\{warning\.id\}\] \$\{warning\.guidanceZh\}`\)/, "Chinese compatibility guidance is no longer contract-generated");
    assert.match(aiReadySource, /compatibilityWarnings\.map\(\(warning\) => `\[\$\{warning\.id\}\] \$\{warning\.guidanceEn\}`\)/, "English compatibility guidance is no longer contract-generated");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (process.argv.includes("--strict-source")) throw error;
    console.warn(`Skills source unavailable under ${configuredSkillsSource}; skipped skill-catalog contract comparison.`);
  }
}

const heimdallLabel = manifest.heimdall.version ? `, Heimdall ${manifest.heimdall.version}` : "";
try {
  const currentChangelogReport = await createChangelogReviewReport({
    sourceManifest: manifest,
    roots: { asgard: configuredSource, heimdall: configuredHeimdallSource, skills: configuredSkillsSource },
  });
  const recordedChangelogReport = JSON.parse(await readFile(path.join(root, "data", "changelog-review-report.json"), "utf8"));
  assert.deepEqual(recordedChangelogReport, currentChangelogReport, "changelog review inbox is stale; run node scripts/update-changelog-review.mjs and review its evidence");
} catch (error) {
  if (process.argv.includes("--strict-source")) throw error;
  if (error?.code !== "ENOENT") throw error;
  console.warn("One or more changelog source repositories are unavailable; skipped changelog inbox comparison.");
}
console.log(`Documentation freshness OK: ${slugCounts.size} bilingual topics, Asgard ${manifest.asgard.version}${heimdallLabel}, reviewed ${manifest.reviewedAt}.`);
