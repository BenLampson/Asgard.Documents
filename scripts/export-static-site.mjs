import assert from "node:assert/strict";
import { cp, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocumentationRoutes, root } from "./documentation-routes.mjs";
import { getSiteOrigin } from "./site-origin.mjs";
import { createSkillsLock, stableJson } from "./skills-artifacts.mjs";
import { createSkillsCompatibilityReport } from "./skills-compatibility-report.mjs";
import { createReleaseReadinessReport } from "./release-readiness.mjs";
import { createReleaseDocumentationPlan } from "./release-documentation-plan.mjs";
import { createAgentWorkflowCoverage, parseSkillReferenceSource } from "./agent-workflow-coverage.mjs";
import { createStaticArtifactManifest } from "./verify-static-artifact.mjs";

const clientDirectory = path.join(root, "dist", "client");
const outputDirectory = path.join(root, "dist", "static");
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("static-export", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };

const siteOrigin = getSiteOrigin();
const { manifest, routes } = await getDocumentationRoutes();
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(clientDirectory, outputDirectory, { recursive: true });

function makeCdnSafe(html) {
  return html.replace(
    /url\((?:[A-Za-z]:[\\/][^)]*?[\\/]\.vinext[\\/]fonts[\\/])/g,
    "url(/assets/_vinext_fonts/",
  );
}

function addLocaleMetadata(html, entry) {
  const links = [
    `<link rel="canonical" href="${entry.canonicalPath}"/>`,
    ...Object.entries(entry.alternates).map(
      ([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
    ),
    ...(entry.kind === "doc"
      ? [`<link rel="alternate" type="text/markdown" title="Markdown" href="${entry.canonicalPath}/index.html.md"/>`]
      : []),
  ].join("");

  return html
    .replace(/<html\b([^>]*?)\blang="[^"]*"([^>]*)>/i, `<html$1lang="${entry.lang}"$2>`)
    .replace("</head>", `${links}</head>`);
}

function absoluteSiteUrl(routePath) {
  return new URL(routePath, `${siteOrigin}/`).href;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createSitemap(entries) {
  const indexableEntries = entries.filter((entry) => entry.indexable);
  const entriesByCanonicalPath = new Map(
    indexableEntries.map((entry) => [entry.canonicalPath, entry]),
  );
  assert.equal(
    entriesByCanonicalPath.size,
    indexableEntries.length,
    "indexable routes must have unique canonical paths",
  );

  for (const entry of indexableEntries) {
    for (const alternatePath of Object.values(entry.alternates)) {
      const alternateEntry = entriesByCanonicalPath.get(alternatePath);
      assert.ok(alternateEntry, `${entry.path} has a missing indexable alternate ${alternatePath}`);
      assert.deepEqual(
        alternateEntry.alternates,
        entry.alternates,
        `${entry.path} and ${alternatePath} must expose reciprocal alternates`,
      );
    }
  }

  const urls = indexableEntries
    .map((entry) => {
      const alternates = Object.entries(entry.alternates)
        .map(([hreflang, routePath]) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(absoluteSiteUrl(routePath))}" />`)
        .join("\n");
      return [
        "  <url>",
        `    <loc>${escapeXml(absoluteSiteUrl(entry.canonicalPath))}</loc>`,
        alternates,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function markdownUrl(entry) {
  return absoluteSiteUrl(`${entry.path}/index.html.md`);
}

function markdownLabel(value) {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function createLlmsTxt(entries, baseline) {
  const startEntries = [
    ["zh", "overview"],
    ["en", "overview"],
    ["zh", "heimdall"],
    ["en", "heimdall"],
    ["zh", "ai-ready"],
    ["en", "ai-ready"],
  ].map(([locale, slug]) => {
    const entry = entries.find((item) => item.locale === locale && item.slug === slug);
    assert.ok(entry, `llms.txt start entry ${locale}/${slug} is missing`);
    return entry;
  });
  const lines = [
    "# Asgard Documentation",
    "",
    "> Bilingual, source-verified documentation for the Asgard .NET framework, Heimdall OIDC identity platform, and Asgard Skills AI engineering layer.",
    "",
    `${baseline.framework.name} is currently documented against framework ${baseline.framework.version} and .NET ${baseline.runtime.dotnet} / C# ${baseline.runtime.csharp}. Source review: ${baseline.reviewedAt}. Prefer product-scoped canonical links. ${baseline.previewPolicy}`,
    "",
    "## Start here",
    "",
  ];
  for (const entry of startEntries) {
    lines.push(`- [${markdownLabel(entry.title)}](${markdownUrl(entry)}) : ${entry.description.replace(/\s+/g, " ").trim()}`);
  }
  const labels = {
    zh: { asgard: "Asgard · 中文", heimdall: "Heimdall · 中文", skills: "Asgard Skills · 中文" },
    en: { asgard: "Asgard · English", heimdall: "Heimdall · English", skills: "Asgard Skills · English" },
  };

  for (const locale of ["zh", "en"]) {
    for (const product of ["asgard", "heimdall", "skills"]) {
      lines.push("", `## ${labels[locale][product]}`, "");
      for (const entry of entries.filter((item) => item.locale === locale && item.product === product)) {
        lines.push(`- [${markdownLabel(entry.title)}](${markdownUrl(entry)}) : ${entry.description.replace(/\s+/g, " ").trim()}`);
      }
    }
  }

  lines.push(
    "",
    "## Optional",
    "",
    `- [Machine-readable search index](${absoluteSiteUrl("/search-index.json")}) : versioned bilingual metadata, Agent workflow references, related documents, searchable content, and Markdown`,
    `- [Audited Skills manifest](${absoluteSiteUrl("/skills-manifest.json")}) : the reviewed full commit, all 29 Skill paths, descriptions, recursive file hashes, explicit bundles, and compatibility warning IDs`,
    `- [Asgard Skills installation lock](${absoluteSiteUrl("/asgard-skills.lock.json")}) : a reproducible all-reviewed snapshot lock; explicit bundles do not infer transitive dependencies`,
    `- [Skills staging verifier](${absoluteSiteUrl("/verify-skills-installation.mjs")}) : a portable Node.js verifier that fails closed on missing, extra, or modified Skill directories`,
    `- [Agent workflow coverage](${absoluteSiteUrl("/agent-workflow-coverage.json")}) : canonical bilingual guide-to-Skill mappings, unmapped inventory, and critical fail-closed rules`,
    `- [Agent workflow coverage verifier](${absoluteSiteUrl("/verify-agent-workflow-coverage.mjs")}) : validates mapping parity, Skill existence, orphan mappings, and critical-guide coverage`,
    `- [Skills compatibility report](${absoluteSiteUrl("/skills-compatibility-report.json")}) : open source-evidenced compatibility warnings for the audited snapshot and current Asgard baseline`,
    `- [Changelog review inbox](${absoluteSiteUrl("/changelog-review-report.json")}) : recorded-to-current commit subjects, changed-file evidence, public-surface review flags, and dirty-worktree fingerprints`,
    `- [Release documentation plan](${absoluteSiteUrl("/release-documentation-plan.json")}) : source-reviewed bilingual release decisions; unresolved or stale evidence fails closed`,
    `- [Release documentation plan verifier](${absoluteSiteUrl("/verify-release-documentation-plan.mjs")}) : regenerates the plan from the changelog inbox and explicit reviewed decisions without promoting commit subjects`,
    `- [Release readiness handoff](${absoluteSiteUrl("/release-readiness-report.json")}) : build-time evidence, required operator gates, artifact inventory, and post-upload checks that remain not performed`,
    `- [Static artifact integrity manifest](${absoluteSiteUrl("/artifact-manifest.json")}) : every exported file except the manifest itself, with byte count, MIME, SHA-256, and one aggregate hash`,
    `- [Static artifact verifier](${absoluteSiteUrl("/verify-static-artifact.mjs")}) : a portable pre-upload verifier that fails closed on missing, extra, modified, or symlinked entries`,
    `- [Static rollback planner](${absoluteSiteUrl("/plan-static-rollback.mjs")}) : a read-only two-artifact verifier and deterministic rollback diff; it never switches traffic`,
    `- [Complete LLM context](${absoluteSiteUrl("/llms-full.txt")}) : every canonical guide in both languages; skip when the complete corpus does not fit the context window`,
    `- [中文生态入口](${absoluteSiteUrl("/zh")}) : human-facing ecosystem portal`,
    `- [English ecosystem portal](${absoluteSiteUrl("/en")}) : human-facing ecosystem portal`,
  );

  return `${lines.join("\n").trim()}\n`;
}

function createLlmsFull(entries, baseline) {
  const documents = entries.map((entry) => [
    "---",
    `Canonical: ${absoluteSiteUrl(entry.path)}`,
    `Markdown: ${markdownUrl(entry)}`,
    "---",
    "",
    entry.markdown.trim(),
  ].join("\n"));
  return [
    "# Asgard Documentation — Full Context",
    "",
    `> Generated from the same bilingual content used by the published documentation pages. Baseline: ${baseline.framework.name} ${baseline.framework.version}, ${baseline.heimdall.name} ${baseline.heimdall.version}, reviewed ${baseline.reviewedAt}. Source code and released packages remain the final authority.`,
    "",
    ...documents,
    "",
  ].join("\n");
}

for (const entry of manifest) {
  const route = entry.path;
  const response = await worker.fetch(
    new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }),
    env,
    context,
  );
  assert.equal(response.status, 200, `${route} returned ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/i, `${route} did not return HTML`);

  const html = addLocaleMetadata(makeCdnSafe(await response.text()), entry);
  assert.doesNotMatch(html, /url\([A-Za-z]:[\\/]/, `${route} contains a build-machine file URL`);
  const routeDirectory = route === "/"
    ? outputDirectory
    : path.join(outputDirectory, ...route.slice(1).split("/"));
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(path.join(routeDirectory, "index.html"), html, "utf8");
}

const searchIndexResponse = await worker.fetch(
  new Request("http://localhost/search-index.json", { headers: { accept: "application/json" } }),
  env,
  context,
);
assert.equal(searchIndexResponse.status, 200, `/search-index.json returned ${searchIndexResponse.status}`);
assert.match(
  searchIndexResponse.headers.get("content-type") ?? "",
  /application\/json/i,
  "/search-index.json did not return JSON",
);
const searchIndex = await searchIndexResponse.text();
const searchData = JSON.parse(searchIndex);
assert.ok(Array.isArray(searchData.entries), "search index must expose entries");
assert.ok(searchData.baseline?.framework?.version, "search index must expose the shared site baseline");
for (const entry of searchData.entries) {
  assert.match(entry.path ?? "", /^\/(?:zh|en)\/(?:asgard|heimdall|skills)\/docs\/[a-z0-9-]+$/, "invalid AI document path");
  assert.match(entry.markdown ?? "", /^#\s+\S/m, `${entry.path} has no Markdown document`);
}

await Promise.all(searchData.entries.map(async (entry) => {
  const directory = path.join(outputDirectory, ...entry.path.slice(1).split("/"));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html.md"), entry.markdown, "utf8");
}));

const skillsManifest = JSON.parse(await readFile(path.join(root, "data", "skills-audited-snapshot.json"), "utf8"));
const skillReferenceSource = await readFile(path.join(root, "app", "skill-references.ts"), "utf8");
const agentWorkflowCoverage = createAgentWorkflowCoverage({ searchData, skillsManifest, declaredMappings: parseSkillReferenceSource(skillReferenceSource) });
const skillsLock = createSkillsLock(skillsManifest);
const sourceManifest = JSON.parse(await readFile(path.join(root, "docs-sources.json"), "utf8"));
const skillsCompatibilityReport = createSkillsCompatibilityReport({ sourceManifest, auditedSnapshot: skillsManifest });
const changelogReviewReport = JSON.parse(await readFile(path.join(root, "data", "changelog-review-report.json"), "utf8"));
const releaseDocumentationDecisions = JSON.parse(await readFile(path.join(root, "data", "release-documentation-decisions.json"), "utf8"));
const releaseDocumentationPlan = createReleaseDocumentationPlan({ changelogReport: changelogReviewReport, decisions: releaseDocumentationDecisions });
const releaseReadinessReport = createReleaseReadinessReport({
  sourceManifest,
  routeManifest: manifest,
  searchData,
  changelogReport: changelogReviewReport,
  skillsManifest,
  compatibilityReport: skillsCompatibilityReport,
});
const existingHeaders = await readFile(path.join(outputDirectory, "_headers"), "utf8").catch(() => "");
const aiArtifactHeaders = [
  "/skills-manifest.json",
  "  Content-Type: application/json; charset=utf-8",
  "/asgard-skills.lock.json",
  "  Content-Type: application/json; charset=utf-8",
  "/verify-skills-installation.mjs",
  "  Content-Type: text/javascript; charset=utf-8",
  "/agent-workflow-coverage.json",
  "  Content-Type: application/json; charset=utf-8",
  "/verify-agent-workflow-coverage.mjs",
  "  Content-Type: text/javascript; charset=utf-8",
  "/skills-compatibility-report.json",
  "  Content-Type: application/json; charset=utf-8",
  "/changelog-review-report.json",
  "  Content-Type: application/json; charset=utf-8",
  "/release-documentation-plan.json",
  "  Content-Type: application/json; charset=utf-8",
  "/verify-release-documentation-plan.mjs",
  "  Content-Type: text/javascript; charset=utf-8",
  "/release-readiness-report.json",
  "  Content-Type: application/json; charset=utf-8",
  "/artifact-manifest.json",
  "  Content-Type: application/json; charset=utf-8",
  "/verify-static-artifact.mjs",
  "  Content-Type: text/javascript; charset=utf-8",
  "/plan-static-rollback.mjs",
  "  Content-Type: text/javascript; charset=utf-8",
  "",
].join("\n");

await Promise.all([
  writeFile(path.join(outputDirectory, "sitemap.xml"), createSitemap(manifest), "utf8"),
  writeFile(
    path.join(outputDirectory, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${absoluteSiteUrl("/sitemap.xml")}\n`,
    "utf8",
  ),
  writeFile(path.join(outputDirectory, "search-index.json"), searchIndex, "utf8"),
  writeFile(path.join(outputDirectory, "llms.txt"), createLlmsTxt(searchData.entries, searchData.baseline), "utf8"),
  writeFile(path.join(outputDirectory, "llms-full.txt"), createLlmsFull(searchData.entries, searchData.baseline), "utf8"),
  writeFile(path.join(outputDirectory, "skills-manifest.json"), stableJson(skillsManifest), "utf8"),
  writeFile(path.join(outputDirectory, "asgard-skills.lock.json"), stableJson(skillsLock), "utf8"),
  copyFile(path.join(root, "scripts", "verify-skills-installation.mjs"), path.join(outputDirectory, "verify-skills-installation.mjs")),
  writeFile(path.join(outputDirectory, "agent-workflow-coverage.json"), stableJson(agentWorkflowCoverage), "utf8"),
  copyFile(path.join(root, "scripts", "agent-workflow-coverage.mjs"), path.join(outputDirectory, "verify-agent-workflow-coverage.mjs")),
  writeFile(path.join(outputDirectory, "skills-compatibility-report.json"), stableJson(skillsCompatibilityReport), "utf8"),
  writeFile(path.join(outputDirectory, "changelog-review-report.json"), stableJson(changelogReviewReport), "utf8"),
  writeFile(path.join(outputDirectory, "release-documentation-plan.json"), stableJson(releaseDocumentationPlan), "utf8"),
  copyFile(path.join(root, "scripts", "release-documentation-plan.mjs"), path.join(outputDirectory, "verify-release-documentation-plan.mjs")),
  writeFile(path.join(outputDirectory, "release-readiness-report.json"), stableJson(releaseReadinessReport), "utf8"),
  copyFile(path.join(root, "scripts", "verify-static-artifact.mjs"), path.join(outputDirectory, "verify-static-artifact.mjs")),
  copyFile(path.join(root, "scripts", "plan-static-rollback.mjs"), path.join(outputDirectory, "plan-static-rollback.mjs")),
  writeFile(path.join(outputDirectory, "_headers"), `${existingHeaders.trim()}\n\n${aiArtifactHeaders}`, "utf8"),
]);

const staticArtifactManifest = await createStaticArtifactManifest({
  root: outputDirectory,
  evidenceDate: sourceManifest.reviewedAt,
});
await writeFile(path.join(outputDirectory, "artifact-manifest.json"), stableJson(staticArtifactManifest), "utf8");

console.log(
  `Static CDN export OK: ${routes.length} HTML routes, ${searchData.entries.length} Markdown guides, and discovery assets written to dist/static.`,
);
