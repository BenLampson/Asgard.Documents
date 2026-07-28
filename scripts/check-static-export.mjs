import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { getDocumentationRoutes, root } from "./documentation-routes.mjs";
import { getSiteOrigin } from "./site-origin.mjs";
import { createSkillsLock } from "./skills-artifacts.mjs";
import { createSkillsCompatibilityReport } from "./skills-compatibility-report.mjs";
import { createReleaseReadinessReport, releaseArtifactContract } from "./release-readiness.mjs";
import { inferStaticMime, verifyStaticArtifact } from "./verify-static-artifact.mjs";
import { createReleaseDocumentationPlan } from "./release-documentation-plan.mjs";
import { createAgentWorkflowCoverage, parseSkillReferenceSource } from "./agent-workflow-coverage.mjs";

const outputDirectory = path.join(root, "dist", "static");
const siteOrigin = getSiteOrigin();
const { manifest, routes } = await getDocumentationRoutes();
const routeByPath = new Map(manifest.map((entry) => [entry.path, entry]));
const routeSet = new Set(routes);
const markdownPathSet = new Set(
  manifest.filter((entry) => entry.kind === "doc").map((entry) => `${entry.canonicalPath}/index.html.md`),
);
const staticRootPathSet = new Set(["/llms.txt", "/llms-full.txt", "/search-index.json", "/skills-manifest.json", "/asgard-skills.lock.json", "/verify-skills-installation.mjs", "/agent-workflow-coverage.json", "/verify-agent-workflow-coverage.mjs", "/skills-compatibility-report.json", "/changelog-review-report.json", "/release-documentation-plan.json", "/verify-release-documentation-plan.mjs", "/release-readiness-report.json", "/artifact-manifest.json", "/verify-static-artifact.mjs", "/plan-static-rollback.mjs", "/sitemap.xml", "/robots.txt"]);
const htmlByPath = new Map();
let checkedAssets = 0;

function normalizedPath(value) {
  const pathname = decodeURIComponent(new URL(value, `${siteOrigin}/`).pathname);
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

function readLink(html, relation, extraAttribute = "") {
  const pattern = new RegExp(
    `<link\\b(?=[^>]*\\brel=["']${relation}["'])(?=[^>]*${extraAttribute})[^>]*\\bhref=["']([^"']+)["'][^>]*>`,
    "gi",
  );
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

for (const entry of manifest) {
  const routeDirectory = entry.path === "/"
    ? outputDirectory
    : path.join(outputDirectory, ...entry.path.slice(1).split("/"));
  const html = await readFile(path.join(routeDirectory, "index.html"), "utf8");
  htmlByPath.set(entry.path, html);
  assert.match(html, /<html\b/i, `${entry.path} has no html element`);
  assert.doesNotMatch(html, /url\([A-Za-z]:[\\/]/, `${entry.path} contains a build-machine file URL`);
  assert.match(html, new RegExp(`<html\\b[^>]*\\blang=["']${entry.lang}["']`, "i"), `${entry.path} has the wrong document language`);

  const canonicals = readLink(html, "canonical");
  assert.equal(canonicals.length, 1, `${entry.path} must have exactly one canonical link`);
  assert.equal(normalizedPath(canonicals[0]), entry.canonicalPath, `${entry.path} has the wrong canonical route`);

  for (const [hreflang, expectedPath] of Object.entries(entry.alternates)) {
    const links = readLink(html, "alternate", `\\bhreflang=["']${hreflang}["']`);
    assert.equal(links.length, 1, `${entry.path} must have exactly one ${hreflang} alternate`);
    assert.equal(normalizedPath(links[0]), expectedPath, `${entry.path} has the wrong ${hreflang} alternate`);
  }
  const markdownAlternates = readLink(html, "alternate", `\\btype=["']text/markdown["']`);
  if (entry.kind === "doc") {
    assert.deepEqual(markdownAlternates.map(normalizedPath), [`${entry.canonicalPath}/index.html.md`], `${entry.path} has the wrong Markdown alternate`);
  } else {
    assert.equal(markdownAlternates.length, 0, `${entry.path} must not advertise a document Markdown alternate`);
  }

  for (const match of html.matchAll(/(?:href|src)=["'](\/[^"'?#]+)[^"']*["']/g)) {
    const pathname = normalizedPath(match[1]);
    if (pathname.startsWith("/assets/") || pathname === "/logo.png" || pathname === "/og.png") {
      await access(path.join(outputDirectory, ...pathname.slice(1).split("/")));
      checkedAssets += 1;
      continue;
    }
    if (markdownPathSet.has(pathname)) {
      await access(path.join(outputDirectory, ...pathname.slice(1).split("/")));
      continue;
    }
    if (staticRootPathSet.has(pathname)) {
      await access(path.join(outputDirectory, pathname.slice(1)));
      continue;
    }
    assert.ok(routeSet.has(pathname), `${entry.path} links to missing static route ${pathname}`);
  }
}

const sitemap = await readFile(path.join(outputDirectory, "sitemap.xml"), "utf8");
assert.match(sitemap, /<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
assert.doesNotMatch(sitemap, /<lastmod>|<changefreq>|<priority>/, "sitemap must not invent freshness metadata");
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => normalizedPath(match[1])).sort();
const expectedSitemapPaths = manifest.filter((entry) => entry.indexable).map((entry) => entry.canonicalPath).sort();
assert.deepEqual(sitemapPaths, expectedSitemapPaths, "sitemap routes differ from the indexable route manifest");
assert.equal(new Set(sitemapPaths).size, sitemapPaths.length, "sitemap contains duplicate routes");
for (const entry of manifest.filter((item) => item.kind === "legacy")) {
  assert.ok(!sitemapPaths.includes(entry.path), `legacy route ${entry.path} must not be in sitemap`);
}

const robots = await readFile(path.join(outputDirectory, "robots.txt"), "utf8");
assert.match(robots, /^User-agent: \*\r?\nAllow: \/\r?\n/m);
assert.match(robots, new RegExp(`^Sitemap: ${siteOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\/sitemap\\.xml$`, "m"));

const searchIndex = JSON.parse(await readFile(path.join(outputDirectory, "search-index.json"), "utf8"));
const sourceManifest = JSON.parse(await readFile(path.join(root, "docs-sources.json"), "utf8"));
assert.equal(searchIndex.schemaVersion, 1, "unsupported search-index schema");
assert.ok(Array.isArray(searchIndex.entries), "search index entries must be an array");
assert.equal(searchIndex.baseline?.framework?.version, sourceManifest.asgard.version, "AI baseline differs from Asgard source manifest");
assert.equal(searchIndex.baseline?.heimdall?.version, sourceManifest.heimdall.version, "AI baseline differs from Heimdall source manifest");
assert.equal(searchIndex.baseline?.reviewedAt, sourceManifest.reviewedAt, "AI baseline review date differs from source manifest");
const expectedDocEntries = manifest.filter((entry) => entry.kind === "doc");
assert.equal(searchIndex.entries.length, expectedDocEntries.length, "search index must contain every canonical localized guide exactly once");
assert.equal(new Set(searchIndex.entries.map((entry) => entry.id)).size, searchIndex.entries.length, "search index IDs must be unique");
assert.equal(new Set(searchIndex.entries.map((entry) => entry.path)).size, searchIndex.entries.length, "search index paths must be unique");

for (const item of searchIndex.entries) {
  const route = routeByPath.get(item.path);
  assert.equal(route?.kind, "doc", `search index contains non-document route ${item.path}`);
  assert.equal(item.locale, route.locale, `${item.path} locale mismatch`);
  assert.equal(item.lang, route.lang, `${item.path} language mismatch`);
  assert.equal(item.product, route.product, `${item.path} product mismatch`);
  assert.equal(item.slug, route.slug, `${item.path} slug mismatch`);
  assert.equal(item.reviewedAt, searchIndex.baseline.reviewedAt, `${item.path} review date mismatch`);
  assert.equal(item.alternatePath, route.alternates[item.locale === "zh" ? "en" : "zh-CN"], `${item.path} alternate mismatch`);
  assert.ok(item.title && item.description && item.content, `${item.path} has incomplete searchable content`);
  for (const searchableValue of [item.title, item.description, item.group, ...item.headings.map((heading) => heading.title)]) {
    assert.ok(item.content.includes(searchableValue), `${item.path} search content omits ${searchableValue}`);
  }
  assert.doesNotMatch(item.content, /(?:^|[\s"'(])[A-Za-z]:[\\/]/, `${item.path} search content leaks a build-machine path`);
  assert.ok(!item.path.includes("/docs/") || !/^\/(zh|en)\/docs\//.test(item.path), `${item.path} uses a legacy search route`);

  const html = htmlByPath.get(item.path);
  for (const heading of item.headings) {
    assert.ok(heading.id && heading.title, `${item.path} has an incomplete heading record`);
    assert.match(html, new RegExp(`\\bid=["']${heading.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`), `${item.path} is missing heading #${heading.id}`);
  }

  const reverse = searchIndex.entries.find((candidate) => candidate.path === item.alternatePath);
  assert.equal(reverse?.alternatePath, item.path, `${item.path} alternate is not reciprocal`);

  assert.match(item.markdown ?? "", /^#\s+\S/m, `${item.path} has no Markdown representation`);
  assert.ok(item.markdown.includes(item.title), `${item.path} Markdown is missing its title`);
  const markdownPath = path.join(outputDirectory, ...item.path.slice(1).split("/"), "index.html.md");
  const markdown = await readFile(markdownPath, "utf8");
  assert.equal(markdown, item.markdown, `${item.path} Markdown artifact differs from the search contract`);
  for (const heading of item.headings) {
    assert.ok(markdown.includes(`## ${heading.title}`), `${item.path} Markdown is missing ${heading.title}`);
  }
  if (item.skills.length > 0) {
    assert.match(markdown, /^## (?:Agent 工作流|Agent workflow)$/m, `${item.path} Markdown is missing its Agent workflow`);
    for (const skill of item.skills) assert.ok(markdown.includes(`\`$${skill}\``), `${item.path} Markdown is missing $${skill}`);
  }
  for (const related of item.relatedDocs) {
    assert.equal(routeByPath.get(related.path)?.kind, "doc", `${item.path} has missing related document ${related.path}`);
    assert.ok(markdown.includes(`](${related.path})`), `${item.path} Markdown is missing related document ${related.path}`);
  }
}

for (const locale of ["zh", "en"]) {
  const quickStart = searchIndex.entries.find((entry) => entry.locale === locale && entry.slug === "quick-start");
  const hostFields = searchIndex.entries.find((entry) => entry.locale === locale && entry.slug === "host-configuration-fields");
  assert.match(quickStart?.content ?? "", /FirstAppPlugin/, `${locale} quick-start code is not searchable`);
  assert.match(hostFields?.content ?? "", /plugin\.loadTimeoutSeconds/, `${locale} host field identifiers are not searchable`);
}

const llms = await readFile(path.join(outputDirectory, "llms.txt"), "utf8");
assert.match(llms, /^# Asgard Documentation\r?\n\r?\n> /, "llms.txt must start with the project H1 and summary blockquote");
assert.ok(llms.includes(`framework ${searchIndex.baseline.framework.version}`), "llms.txt is missing the shared framework baseline");
assert.ok(llms.includes(`Source review: ${searchIndex.baseline.reviewedAt}`), "llms.txt is missing the shared review date");
const llmsSections = llms.split(/^## /m).slice(1).map((section) => {
  const newline = section.search(/\r?\n/);
  assert.ok(newline > 0, "llms.txt contains a malformed H2 section");
  return [section.slice(0, newline).trim(), section.slice(newline).trim()];
});
const expectedSectionNames = [
  "Start here",
  "Asgard · 中文",
  "Heimdall · 中文",
  "Asgard Skills · 中文",
  "Asgard · English",
  "Heimdall · English",
  "Asgard Skills · English",
  "Optional",
];
assert.deepEqual(llmsSections.map(([name]) => name), expectedSectionNames, "llms.txt sections or ordering changed");
const sectionUrls = new Map();
for (const [name, body] of llmsSections) {
  const nonblankLines = body.split(/\r?\n/).filter((line) => line.trim());
  const urls = nonblankLines.map((line) => {
    const match = line.match(/^- \[(?:\\.|[^\]])+\]\((https:\/\/[^)]+)\) : \S.*$/);
    assert.ok(match, `llms.txt ${name} contains a malformed file-list entry: ${line}`);
    const url = new URL(match[1]);
    assert.equal(url.origin, siteOrigin, `llms.txt ${name} links outside the configured origin`);
    return url.href;
  });
  sectionUrls.set(name, urls);
}
const markdownUrl = (entry) => new URL(`${entry.path}/index.html.md`, `${siteOrigin}/`).href;
const startEntries = [["zh", "overview"], ["en", "overview"], ["zh", "heimdall"], ["en", "heimdall"], ["zh", "ai-ready"], ["en", "ai-ready"]]
  .map(([locale, slug]) => searchIndex.entries.find((entry) => entry.locale === locale && entry.slug === slug));
assert.ok(startEntries.every(Boolean), "llms.txt curated start entries are incomplete");
assert.deepEqual(sectionUrls.get("Start here"), startEntries.map(markdownUrl), "llms.txt Start here differs from the curated manifest");
for (const [sectionName, locale, product] of [
  ["Asgard · 中文", "zh", "asgard"], ["Heimdall · 中文", "zh", "heimdall"], ["Asgard Skills · 中文", "zh", "skills"],
  ["Asgard · English", "en", "asgard"], ["Heimdall · English", "en", "heimdall"], ["Asgard Skills · English", "en", "skills"],
]) {
  const expected = searchIndex.entries.filter((entry) => entry.locale === locale && entry.product === product).map(markdownUrl);
  assert.deepEqual(sectionUrls.get(sectionName), expected, `llms.txt ${sectionName} differs from the document manifest`);
}
assert.deepEqual(sectionUrls.get("Optional"), [
  new URL("/search-index.json", `${siteOrigin}/`).href,
  new URL("/skills-manifest.json", `${siteOrigin}/`).href,
  new URL("/asgard-skills.lock.json", `${siteOrigin}/`).href,
  new URL("/verify-skills-installation.mjs", `${siteOrigin}/`).href,
  new URL("/agent-workflow-coverage.json", `${siteOrigin}/`).href,
  new URL("/verify-agent-workflow-coverage.mjs", `${siteOrigin}/`).href,
  new URL("/skills-compatibility-report.json", `${siteOrigin}/`).href,
  new URL("/changelog-review-report.json", `${siteOrigin}/`).href,
  new URL("/release-documentation-plan.json", `${siteOrigin}/`).href,
  new URL("/verify-release-documentation-plan.mjs", `${siteOrigin}/`).href,
  new URL("/release-readiness-report.json", `${siteOrigin}/`).href,
  new URL("/artifact-manifest.json", `${siteOrigin}/`).href,
  new URL("/verify-static-artifact.mjs", `${siteOrigin}/`).href,
  new URL("/plan-static-rollback.mjs", `${siteOrigin}/`).href,
  new URL("/llms-full.txt", `${siteOrigin}/`).href,
  new URL("/zh", `${siteOrigin}/`).href,
  new URL("/en", `${siteOrigin}/`).href,
], "llms.txt Optional resources changed");
for (const href of [...sectionUrls.values()].flat()) {
  const pathname = normalizedPath(href);
  if (markdownPathSet.has(pathname)) await access(path.join(outputDirectory, ...pathname.slice(1).split("/")));
  else if (routeSet.has(pathname)) await access(path.join(outputDirectory, ...pathname.slice(1).split("/"), "index.html"));
  else await access(path.join(outputDirectory, ...pathname.slice(1).split("/")));
}
assert.doesNotMatch(llms, /https:\/\/[^\s)]+\/(?:zh|en)\/docs\//, "llms.txt must not expose legacy document routes");

const skillsManifest = JSON.parse(await readFile(path.join(outputDirectory, "skills-manifest.json"), "utf8"));
const committedSkillsManifest = JSON.parse(await readFile(path.join(root, "data", "skills-audited-snapshot.json"), "utf8"));
assert.deepEqual(skillsManifest, committedSkillsManifest, "published Skills manifest differs from the audited snapshot");
assert.equal(skillsManifest.schemaVersion, 1, "unsupported Skills manifest schema");
assert.equal(skillsManifest.source.ref, "7b26856ae6a3266f9d33be44c8880ee8863888d3", "Skills manifest ref changed without review");
assert.equal(skillsManifest.source.reviewedAt, "2026-07-28", "Skills manifest review date changed without review");
assert.equal(skillsManifest.source.releaseStatus, "audited-snapshot", "Skills manifest must not claim stable status");
assert.equal(skillsManifest.dependencySemantics, "explicit-bundles-only", "Skills manifest must not infer transitive dependencies");
assert.equal(skillsManifest.skills.length, 29, "Skills manifest must cover all reviewed Skills");
assert.equal(new Set(skillsManifest.skills.map((skill) => skill.name)).size, 29, "Skills manifest contains duplicate Skills");
for (const skill of skillsManifest.skills) {
  assert.equal(skill.path, `skills/${skill.name}`, `${skill.name} has the wrong install path`);
  assert.ok(skill.description, `${skill.name} has no description`);
  assert.match(skill.sha256, /^[0-9a-f]{64}$/, `${skill.name} has an invalid aggregate hash`);
  assert.ok(skill.files.some((file) => file.path === "SKILL.md"), `${skill.name} omits SKILL.md`);
  assert.equal(new Set(skill.files.map((file) => file.path)).size, skill.files.length, `${skill.name} has duplicate files`);
  for (const file of skill.files) assert.match(file.sha256, /^[0-9a-f]{64}$/, `${skill.name}/${file.path} has an invalid hash`);
}
const reviewedNames = new Set(skillsManifest.skills.map((skill) => skill.name));
for (const bundle of skillsManifest.bundles) {
  assert.equal(new Set(bundle.skills).size, bundle.skills.length, `${bundle.id} contains duplicate Skills`);
  for (const skillName of bundle.skills) assert.ok(reviewedNames.has(skillName), `${bundle.id} references unknown Skill ${skillName}`);
}
const skillsLock = JSON.parse(await readFile(path.join(outputDirectory, "asgard-skills.lock.json"), "utf8"));
assert.deepEqual(skillsLock, createSkillsLock(skillsManifest), "published Skills lock differs from the manifest-derived lock");
const headers = await readFile(path.join(outputDirectory, "_headers"), "utf8");
for (const artifact of ["skills-manifest.json", "asgard-skills.lock.json"]) {
  assert.match(headers, new RegExp(`/${artifact.replace(".", "\\.")}\\r?\\n  Content-Type: application/json; charset=utf-8`), `${artifact} has no JSON CDN metadata`);
}
const publishedVerifier = await readFile(path.join(outputDirectory, "verify-skills-installation.mjs"), "utf8");
const sourceVerifier = await readFile(path.join(root, "scripts", "verify-skills-installation.mjs"), "utf8");
assert.equal(publishedVerifier, sourceVerifier, "published Skills verifier differs from source");
assert.match(headers, /\/verify-skills-installation\.mjs\r?\n  Content-Type: text\/javascript; charset=utf-8/, "Skills verifier has no JavaScript CDN metadata");
const workflowCoverage = JSON.parse(await readFile(path.join(outputDirectory, "agent-workflow-coverage.json"), "utf8"));
const skillReferenceSource = await readFile(path.join(root, "app", "skill-references.ts"), "utf8");
assert.deepEqual(workflowCoverage, createAgentWorkflowCoverage({ searchData: searchIndex, skillsManifest, declaredMappings: parseSkillReferenceSource(skillReferenceSource) }), "Agent workflow coverage differs from canonical search and mapping contracts");
assert.equal(workflowCoverage.status, "coverage-contract-passed", "Agent workflow coverage did not pass");
assert.equal(workflowCoverage.policy.projectFileCoverageOutOfScope, true, "Agent workflow coverage overlaps source-project coverage");
const publishedWorkflowVerifier = await readFile(path.join(outputDirectory, "verify-agent-workflow-coverage.mjs"), "utf8");
const sourceWorkflowVerifier = await readFile(path.join(root, "scripts", "agent-workflow-coverage.mjs"), "utf8");
assert.equal(publishedWorkflowVerifier, sourceWorkflowVerifier, "published Agent workflow verifier differs from source");
assert.match(headers, /\/agent-workflow-coverage\.json\r?\n  Content-Type: application\/json; charset=utf-8/, "Agent workflow coverage has no JSON CDN metadata");
assert.match(headers, /\/verify-agent-workflow-coverage\.mjs\r?\n  Content-Type: text\/javascript; charset=utf-8/, "Agent workflow verifier has no JavaScript CDN metadata");
const compatibilityReport = JSON.parse(await readFile(path.join(outputDirectory, "skills-compatibility-report.json"), "utf8"));
assert.deepEqual(
  compatibilityReport,
  createSkillsCompatibilityReport({ sourceManifest, auditedSnapshot: skillsManifest }),
  "published Skills compatibility report differs from its source contracts",
);
assert.equal(compatibilityReport.skillsSnapshot.releaseStatus, "audited-snapshot", "compatibility report must not claim stable status");
assert.equal(compatibilityReport.summary.stableEligible, false, "a snapshot with open warnings cannot be stable eligible");
assert.equal(compatibilityReport.summary.openWarnings, sourceManifest.skillsContract.compatibilityWarnings.length, "compatibility warning count differs");
assert.deepEqual(compatibilityReport.warnings.map((warning) => warning.id), skillsManifest.compatibilityWarningIds, "report and manifest warning IDs differ");
assert.match(headers, /\/skills-compatibility-report\.json\r?\n  Content-Type: application\/json; charset=utf-8/, "Skills compatibility report has no JSON CDN metadata");
const changelogReport = JSON.parse(await readFile(path.join(outputDirectory, "changelog-review-report.json"), "utf8"));
const committedChangelogReport = JSON.parse(await readFile(path.join(root, "data", "changelog-review-report.json"), "utf8"));
assert.deepEqual(changelogReport, committedChangelogReport, "published changelog review report differs from the committed inbox");
assert.equal(changelogReport.schemaVersion, 1, "unsupported changelog review schema");
assert.equal(changelogReport.policy.commitSubjectsAreEvidenceOnly, true, "commit subjects must remain evidence only");
assert.equal(changelogReport.policy.automaticReleaseClaims, false, "changelog ingestion must not make release claims");
assert.deepEqual(changelogReport.sources.map((source) => source.id), ["asgard", "heimdall", "skills"], "changelog source set changed");
for (const source of changelogReport.sources) {
  assert.match(source.recordedResolvedCommit, /^[0-9a-f]{40}$/, `${source.id} recorded commit is not resolved`);
  assert.match(source.currentCommit, /^[0-9a-f]{40}$/, `${source.id} current commit is invalid`);
  if (source.dirtyWorktree.dirty) assert.match(source.dirtyWorktree.fingerprint ?? "", /^sha256:[0-9a-f]{64}$/, `${source.id} dirty fingerprint is invalid`);
  else assert.equal(source.dirtyWorktree.fingerprint, null, `${source.id} clean source has a fingerprint`);
  for (const commit of source.commits) assert.equal(commit.evidenceOnly, true, `${source.id} commit subject was promoted beyond evidence`);
}
assert.match(headers, /\/changelog-review-report\.json\r?\n  Content-Type: application\/json; charset=utf-8/, "changelog report has no JSON CDN metadata");
const releaseDocumentationDecisions = JSON.parse(await readFile(path.join(root, "data", "release-documentation-decisions.json"), "utf8"));
const releaseDocumentationPlan = JSON.parse(await readFile(path.join(outputDirectory, "release-documentation-plan.json"), "utf8"));
assert.deepEqual(releaseDocumentationPlan, createReleaseDocumentationPlan({ changelogReport, decisions: releaseDocumentationDecisions }), "release documentation plan differs from reviewed evidence decisions");
assert.equal(releaseDocumentationPlan.policy.commitSubjectsAreEvidenceOnly, true, "release documentation plan promoted commit subjects");
assert.equal(releaseDocumentationPlan.policy.unresolvedEvidenceFailsClosed, true, "release documentation plan is not fail closed");
assert.match(headers, /\/release-documentation-plan\.json\r?\n  Content-Type: application\/json; charset=utf-8/, "release documentation plan has no JSON CDN metadata");
const publishedDocumentationPlanVerifier = await readFile(path.join(outputDirectory, "verify-release-documentation-plan.mjs"), "utf8");
const sourceDocumentationPlanVerifier = await readFile(path.join(root, "scripts", "release-documentation-plan.mjs"), "utf8");
assert.equal(publishedDocumentationPlanVerifier, sourceDocumentationPlanVerifier, "published release documentation verifier differs from source");
assert.match(headers, /\/verify-release-documentation-plan\.mjs\r?\n  Content-Type: text\/javascript; charset=utf-8/, "release documentation verifier has no JavaScript CDN metadata");
const releaseReadinessReport = JSON.parse(await readFile(path.join(outputDirectory, "release-readiness-report.json"), "utf8"));
assert.deepEqual(
  releaseReadinessReport,
  createReleaseReadinessReport({ sourceManifest, routeManifest: manifest, searchData: searchIndex, changelogReport, skillsManifest, compatibilityReport }),
  "release readiness report differs from final static-export evidence",
);
assert.equal(releaseReadinessReport.handoffStatus, "operator-gates-required", "release handoff must retain operator gates");
assert.equal(releaseReadinessReport.productionReadyClaimed, false, "static export cannot claim production readiness");
assert.equal(releaseReadinessReport.requiredOperatorGates.find((gate) => gate.id === "full-release-gate")?.status, "required-not-attested", "npm run verify must not be falsely attested");
assert.ok(releaseReadinessReport.postUploadChecks.every((check) => check.status === "not-performed"), "post-upload checks must not be fabricated");
assert.equal(releaseReadinessReport.skillsEvidence.releaseStatus, "audited-snapshot", "handoff must not promote Skills to stable");
assert.equal(releaseReadinessReport.skillsEvidence.stableEligible, false, "handoff ignored open Skills warnings");
assert.doesNotMatch(JSON.stringify(releaseReadinessReport), /"(?:generatedAt|lastmod|uploadedAt|checkedAt)"/, "release handoff invents a timestamp");
assert.deepEqual(releaseReadinessReport.artifactInventory.map((artifact) => artifact.path), releaseArtifactContract.map((artifact) => artifact.path), "release artifact inventory changed");
for (const artifact of releaseReadinessReport.artifactInventory) await access(path.join(outputDirectory, ...artifact.path.slice(1).split("/")));
assert.match(headers, /\/release-readiness-report\.json\r?\n  Content-Type: application\/json; charset=utf-8/, "release readiness report has no JSON CDN metadata");
const artifactManifest = JSON.parse(await readFile(path.join(outputDirectory, "artifact-manifest.json"), "utf8"));
const artifactVerification = await verifyStaticArtifact({ root: outputDirectory, manifest: artifactManifest });
assert.equal(artifactVerification.valid, true, "static artifact verifier did not accept the export");
assert.deepEqual(artifactManifest.exclusions, ["artifact-manifest.json"], "artifact manifest must exclude only itself");
assert.equal(artifactManifest.files.length, artifactManifest.fileCount, "artifact manifest file count differs");
assert.equal(new Set(artifactManifest.files.map((file) => file.path)).size, artifactManifest.fileCount, "artifact manifest contains duplicate paths");
assert.ok(artifactManifest.files.some((file) => file.path === "_headers"), "artifact manifest omits _headers");
assert.ok(artifactManifest.files.some((file) => file.path.endsWith("/index.html")), "artifact manifest omits HTML routes");
assert.ok(artifactManifest.files.some((file) => file.path.endsWith("/index.html.md")), "artifact manifest omits Markdown companions");
assert.ok(artifactManifest.files.some((file) => file.path.startsWith("assets/")), "artifact manifest omits assets");
for (const requiredPath of ["search-index.json", "llms.txt", "skills-manifest.json", "agent-workflow-coverage.json", "verify-agent-workflow-coverage.mjs", "skills-compatibility-report.json", "changelog-review-report.json", "release-documentation-plan.json", "verify-release-documentation-plan.mjs", "release-readiness-report.json", "verify-static-artifact.mjs", "plan-static-rollback.mjs"]) {
  assert.ok(artifactManifest.files.some((file) => file.path === requiredPath), `artifact manifest omits ${requiredPath}`);
}
for (const file of artifactManifest.files) {
  assert.doesNotMatch(file.path, /\\|^\/|\.\./, `artifact path is not relative POSIX: ${file.path}`);
  assert.match(file.sha256, /^[0-9a-f]{64}$/, `${file.path} has invalid SHA-256`);
  assert.equal(file.mime, inferStaticMime(file.path), `${file.path} MIME differs from the shared inference contract`);
}
assert.match(artifactManifest.aggregateSha256, /^[0-9a-f]{64}$/, "artifact aggregate SHA-256 is invalid");
assert.doesNotMatch(JSON.stringify(artifactManifest), /"(?:generatedAt|buildTime|uploadedAt|verifiedAt|lastmod)"/, "artifact manifest invents a timestamp");
const publishedArtifactVerifier = await readFile(path.join(outputDirectory, "verify-static-artifact.mjs"), "utf8");
const sourceArtifactVerifier = await readFile(path.join(root, "scripts", "verify-static-artifact.mjs"), "utf8");
assert.equal(publishedArtifactVerifier, sourceArtifactVerifier, "published artifact verifier differs from source");
assert.match(headers, /\/artifact-manifest\.json\r?\n  Content-Type: application\/json; charset=utf-8/, "artifact manifest has no JSON CDN metadata");
assert.match(headers, /\/verify-static-artifact\.mjs\r?\n  Content-Type: text\/javascript; charset=utf-8/, "artifact verifier has no JavaScript CDN metadata");
const publishedRollbackPlanner = await readFile(path.join(outputDirectory, "plan-static-rollback.mjs"), "utf8");
const sourceRollbackPlanner = await readFile(path.join(root, "scripts", "plan-static-rollback.mjs"), "utf8");
assert.equal(publishedRollbackPlanner, sourceRollbackPlanner, "published rollback planner differs from source");
assert.match(headers, /\/plan-static-rollback\.mjs\r?\n  Content-Type: text\/javascript; charset=utf-8/, "rollback planner has no JavaScript CDN metadata");

const llmsFull = await readFile(path.join(outputDirectory, "llms-full.txt"), "utf8");
assert.match(llmsFull, /^# Asgard Documentation — Full Context\r?\n/);
const fullCanonicalUrls = [...llmsFull.matchAll(/^Canonical: (https:\/\/\S+)$/gm)].map((match) => match[1]);
const fullMarkdownUrls = [...llmsFull.matchAll(/^Markdown: (https:\/\/\S+)$/gm)].map((match) => match[1]);
assert.deepEqual(fullCanonicalUrls, searchIndex.entries.map((item) => new URL(item.path, `${siteOrigin}/`).href), "llms-full canonical manifest changed");
assert.deepEqual(fullMarkdownUrls, searchIndex.entries.map(markdownUrl), "llms-full Markdown manifest changed");
for (const item of searchIndex.entries) {
  assert.ok(llmsFull.includes(item.markdown.trim()), `llms-full.txt is missing Markdown for ${item.path}`);
}

console.log(
  `Static-export check OK: ${routes.length} HTML routes, ${sitemapPaths.length} sitemap routes, ${searchIndex.entries.length} search/Markdown entries, and ${checkedAssets} asset references.`,
);
