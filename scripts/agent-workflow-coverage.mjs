import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const criticalWorkflowRules = [
  ["asgard", "quick-start", ["asgard-host-project", "asgard-plugin-development", "asgard-dotnet-10-csharp-14"]],
  ["asgard", "api-development", ["asgard-api-development", "asgard-dotnet-10-csharp-14", "asgard-backend-guard"]],
  ["asgard", "configuration", ["asgard-configuration", "asgard-host-features"]],
  ["asgard", "database-operations", ["asgard-database", "asgard-backend-guard"]],
  ["asgard", "security-operations", ["asgard-security", "asgard-configuration"]],
  ["heimdall", "heimdall-integration", ["identity-integration", "asgard-host-features", "asgard-auth-authorization"]],
  ["heimdall", "heimdall-quick-start", ["identity-integration", "asgard-configuration", "asgard-host-features", "asgard-security"]],
  ["heimdall", "heimdall-deployment", ["identity-integration", "asgard-configuration", "asgard-security"]],
  ["heimdall", "heimdall-resource-server-revocation", ["identity-integration", "asgard-auth-authorization", "heimdall-service-integration"]],
  ["heimdall", "heimdall-management-api", ["heimdall-application-rbac", "asgard-api-development", "asgard-auth-authorization"]],
  ["heimdall", "heimdall-application-rbac", ["heimdall-application-rbac", "asgard-identity-userinfo", "identity-integration", "asgard-auth-authorization"]],
  ["heimdall", "heimdall-mcp", ["heimdall-mcp-management", "identity-integration", "asgard-auth-authorization", "asgard-backend-guard"]],
].map(([product, slug, requiredSkills]) => ({ product, slug, requiredSkills }));

export function parseSkillReferenceSource(source) {
  const block = source.match(/skillReferencesBySlug:[^{]+\{([\s\S]*?)\n\};/)?.[1];
  assert.ok(block, "cannot parse app/skill-references.ts mapping contract");
  const mappings = {};
  for (const match of block.matchAll(/^\s*(?:"([a-z0-9-]+)"|([a-z0-9-]+)):\s*\[([^\]]*)\],?$/gm)) {
    const slug = match[1] ?? match[2];
    const skills = [...match[3].matchAll(/"([a-z0-9-]+)"/g)].map((item) => item[1]);
    assert.ok(skills.length > 0, `${slug} has an empty declared Agent workflow`);
    assert.equal(new Set(skills).size, skills.length, `${slug} repeats an Agent workflow Skill`);
    assert.equal(mappings[slug], undefined, `${slug} has duplicate mapping declarations`);
    mappings[slug] = skills;
  }
  assert.ok(Object.keys(mappings).length > 0, "no Agent workflow mappings parsed");
  return mappings;
}

export function createAgentWorkflowCoverage({ searchData, skillsManifest, declaredMappings }) {
  assert.equal(searchData.schemaVersion, 1, "unsupported search-index schema");
  assert.equal(skillsManifest.schemaVersion, 1, "unsupported Skills manifest schema");
  const knownSkills = new Set(skillsManifest.skills.map((skill) => skill.name));
  const bySlug = new Map();
  for (const entry of searchData.entries.filter((item) => item.kind === "doc")) {
    assert.ok(["zh", "en"].includes(entry.locale), `${entry.id} has unsupported locale`);
    const pair = bySlug.get(entry.slug) ?? {};
    assert.equal(pair[entry.locale], undefined, `${entry.slug} duplicates locale ${entry.locale}`);
    pair[entry.locale] = entry;
    bySlug.set(entry.slug, pair);
  }
  const guides = [];
  for (const [slug, pair] of [...bySlug].sort(([a], [b]) => a.localeCompare(b))) {
    assert.ok(pair.zh && pair.en, `${slug} is missing a bilingual canonical guide`);
    assert.equal(pair.zh.product, pair.en.product, `${slug} changes product across locales`);
    assert.deepEqual(pair.zh.skills, pair.en.skills, `${slug} has locale-drifted Agent workflow Skills`);
    assert.deepEqual(pair.zh.skills, declaredMappings[slug] ?? [], `${slug} search workflow differs from app/skill-references.ts`);
    for (const skill of pair.zh.skills) assert.ok(knownSkills.has(skill), `${slug} references unknown Skill ${skill}`);
    guides.push({ product: pair.zh.product, slug, mapped: pair.zh.skills.length > 0, skills: pair.zh.skills, paths: { zh: pair.zh.path, en: pair.en.path } });
  }
  const canonicalSlugs = new Set(guides.map((guide) => guide.slug));
  for (const slug of Object.keys(declaredMappings)) assert.ok(canonicalSlugs.has(slug), `orphan Agent workflow mapping ${slug}`);
  for (const rule of criticalWorkflowRules) {
    const guide = guides.find((item) => item.product === rule.product && item.slug === rule.slug);
    assert.ok(guide, `critical Agent workflow guide missing: ${rule.product}:${rule.slug}`);
    for (const skill of rule.requiredSkills) assert.ok(guide.skills.includes(skill), `${rule.product}:${rule.slug} lacks required Skill ${skill}`);
  }
  const mapped = guides.filter((guide) => guide.mapped);
  const referencedSkills = [...new Set(mapped.flatMap((guide) => guide.skills))].sort();
  return {
    schemaVersion: 1, evidenceDate: searchData.baseline.reviewedAt, status: "coverage-contract-passed",
    policy: { canonicalGuidesOnly: true, bilingualMappingParityRequired: true, unknownSkillsFailClosed: true, orphanMappingsFailClosed: true, criticalRulesFailClosed: true, projectFileCoverageOutOfScope: true },
    skillsSnapshot: { ref: skillsManifest.source.ref, releaseStatus: skillsManifest.source.releaseStatus, catalogSkillCount: knownSkills.size },
    summary: { canonicalGuideCount: guides.length, mappedGuideCount: mapped.length, unmappedGuideCount: guides.length - mapped.length, referencedSkillCount: referencedSkills.length, criticalRuleCount: criticalWorkflowRules.length },
    criticalRules: criticalWorkflowRules, referencedSkills,
    unmappedGuides: guides.filter((guide) => !guide.mapped).map(({ product, slug, paths }) => ({ product, slug, paths })), guides,
  };
}

async function runCli() {
  const args = process.argv.slice(2); const after = (flag) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  const searchIndex = after("--search-index"), skillsManifestPath = after("--skills-manifest"), mappingsPath = after("--mappings");
  if (!searchIndex || !skillsManifestPath || !mappingsPath || args.includes("--help")) { console.error("Usage: node agent-workflow-coverage.mjs --search-index <search-index.json> --skills-manifest <skills-manifest.json> --mappings <app/skill-references.ts>"); process.exitCode = 2; return; }
  try {
    const [searchData, skillsManifest, source] = await Promise.all([readFile(path.resolve(searchIndex), "utf8").then(JSON.parse), readFile(path.resolve(skillsManifestPath), "utf8").then(JSON.parse), readFile(path.resolve(mappingsPath), "utf8")]);
    process.stdout.write(`${JSON.stringify(createAgentWorkflowCoverage({ searchData, skillsManifest, declaredMappings: parseSkillReferenceSource(source) }), null, 2)}\n`);
  } catch (error) { console.error(`Agent workflow coverage failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runCli();
