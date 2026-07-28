import assert from "node:assert/strict";

export const releaseArtifactContract = [
  { path: "/sitemap.xml", mime: "application/xml", role: "canonical route discovery" },
  { path: "/robots.txt", mime: "text/plain", role: "crawler policy and sitemap pointer" },
  { path: "/search-index.json", mime: "application/json", role: "browser and agent search" },
  { path: "/llms.txt", mime: "text/plain", role: "curated AI discovery" },
  { path: "/llms-full.txt", mime: "text/plain", role: "complete AI context" },
  { path: "/skills-manifest.json", mime: "application/json", role: "audited Skills inventory" },
  { path: "/asgard-skills.lock.json", mime: "application/json", role: "audited Skills installation lock" },
  { path: "/verify-skills-installation.mjs", mime: "text/javascript", role: "staged Skills verifier" },
  { path: "/agent-workflow-coverage.json", mime: "application/json", role: "canonical guide to audited Skill coverage" },
  { path: "/verify-agent-workflow-coverage.mjs", mime: "text/javascript", role: "fail-closed Agent workflow coverage verifier" },
  { path: "/skills-compatibility-report.json", mime: "application/json", role: "open Skills compatibility evidence" },
  { path: "/changelog-review-report.json", mime: "application/json", role: "source-change review inbox" },
  { path: "/release-documentation-plan.json", mime: "application/json", role: "reviewed per-release documentation decisions" },
  { path: "/verify-release-documentation-plan.mjs", mime: "text/javascript", role: "fail-closed documentation decision verifier" },
  { path: "/release-readiness-report.json", mime: "application/json", role: "operator release handoff" },
  { path: "/artifact-manifest.json", mime: "application/json", role: "per-file static artifact integrity manifest" },
  { path: "/verify-static-artifact.mjs", mime: "text/javascript", role: "pre-upload directory integrity verifier" },
  { path: "/plan-static-rollback.mjs", mime: "text/javascript", role: "read-only two-artifact rollback planner" },
];

export function createReleaseReadinessReport({ sourceManifest, routeManifest, searchData, changelogReport, skillsManifest, compatibilityReport }) {
  assert.equal(searchData.baseline.reviewedAt, sourceManifest.reviewedAt, "release handoff documentation baseline mismatch");
  assert.equal(skillsManifest.source.releaseStatus, "audited-snapshot", "release handoff must not promote Skills to stable");
  assert.equal(compatibilityReport.summary.stableEligible, false, "open Skills warnings cannot become stable eligible");
  const routeKinds = {};
  for (const route of routeManifest) routeKinds[route.kind] = (routeKinds[route.kind] ?? 0) + 1;
  const canonicalDocuments = routeManifest.filter((route) => route.kind === "doc");
  const localizedTopics = new Set(canonicalDocuments.map((route) => route.slug));
  return {
    schemaVersion: 1,
    evidenceDate: sourceManifest.reviewedAt,
    timestampPolicy: "No generatedAt, lastmod, upload time, or production-check time is invented.",
    handoffStatus: "operator-gates-required",
    productionReadyClaimed: false,
    sourceBaselines: [
      { id: "asgard", version: sourceManifest.asgard.version, recordedCommit: sourceManifest.asgard.commit, worktreeDirty: sourceManifest.asgard.worktreeDirty, worktreeFingerprint: sourceManifest.asgard.worktreeFingerprint },
      { id: "heimdall", version: sourceManifest.heimdall.version, recordedCommit: sourceManifest.heimdall.commit, worktreeDirty: sourceManifest.heimdall.worktreeDirty, worktreeFingerprint: sourceManifest.heimdall.worktreeFingerprint },
      { id: "skills", version: sourceManifest.skills.version, recordedCommit: sourceManifest.skills.commit, worktreeDirty: sourceManifest.skills.worktreeDirty, worktreeFingerprint: sourceManifest.skills.worktreeFingerprint },
    ],
    documentationEvidence: {
      reviewedAt: sourceManifest.reviewedAt,
      bilingualTopicCount: localizedTopics.size,
      canonicalLocalizedGuideCount: canonicalDocuments.length,
      searchAndMarkdownEntryCount: searchData.entries.length,
      routeCount: routeManifest.length,
      routeKinds,
      evidenceScope: "route manifest and typed content used by this static export",
    },
    changelogEvidence: {
      reviewedBaselineAt: changelogReport.reviewedBaselineAt,
      summary: changelogReport.summary,
      sources: changelogReport.sources.map((source) => ({ id: source.id, comparison: source.comparison, currentCommit: source.currentCommit, requiresReview: source.requiresReview, dirty: source.dirtyWorktree.dirty, fingerprint: source.dirtyWorktree.fingerprint })),
      commitSubjectsAreEvidenceOnly: changelogReport.policy.commitSubjectsAreEvidenceOnly,
    },
    skillsEvidence: {
      ref: skillsManifest.source.ref,
      reviewedAt: skillsManifest.source.reviewedAt,
      releaseStatus: skillsManifest.source.releaseStatus,
      skillCount: skillsManifest.skills.length,
      compatibilityStatus: compatibilityReport.summary.status,
      openCompatibilityWarnings: compatibilityReport.summary.openWarnings,
      stableEligible: compatibilityReport.summary.stableEligible,
    },
    artifactInventory: releaseArtifactContract.map((artifact) => ({ ...artifact, buildContractStatus: "included-by-static-export" })),
    requiredOperatorGates: [
      { id: "full-release-gate", command: "npm run verify", status: "required-not-attested", reason: "This report never infers or stores a successful command run." },
      { id: "artifact-upload", status: "not-performed", reason: "Static export does not upload or mutate CDN state." },
      { id: "cdn-cache-and-rollback", status: "not-attested", reason: "The operator must configure cache policy, directory indexes, and rollback." },
    ],
    postUploadChecks: releaseArtifactContract.map((artifact) => ({ method: "GET", path: artifact.path, expectedStatus: 200, expectedMime: artifact.mime, status: "not-performed" })),
    limitations: [
      "A green local build or static check does not prove that the public hostname is live.",
      "Commit subjects and file classifications are review evidence, not release facts.",
      "The audited Skills snapshot is not a stable bundle while compatibility warnings remain open.",
    ],
  };
}
