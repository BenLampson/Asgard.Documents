import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createReleaseReadinessReport, releaseArtifactContract } from "../scripts/release-readiness.mjs";

const sourceManifest = JSON.parse(await readFile(new URL("../docs-sources.json", import.meta.url), "utf8"));
const skillsManifest = JSON.parse(await readFile(new URL("../data/skills-audited-snapshot.json", import.meta.url), "utf8"));
const changelogReport = JSON.parse(await readFile(new URL("../data/changelog-review-report.json", import.meta.url), "utf8"));

function fixture() {
  return createReleaseReadinessReport({
    sourceManifest,
    routeManifest: [
      { kind: "portal", slug: null },
      { kind: "doc", slug: "overview" },
      { kind: "doc", slug: "overview" },
      { kind: "legacy", slug: "overview" },
    ],
    searchData: { baseline: { reviewedAt: sourceManifest.reviewedAt }, entries: [{}, {}] },
    changelogReport,
    skillsManifest,
    compatibilityReport: { summary: { status: "warnings-present", openWarnings: 10, stableEligible: false } },
  });
}

test("release handoff separates build evidence from unperformed operator gates", () => {
  const report = fixture();
  assert.equal(report.handoffStatus, "operator-gates-required");
  assert.equal(report.productionReadyClaimed, false);
  assert.equal(report.documentationEvidence.bilingualTopicCount, 1);
  assert.equal(report.documentationEvidence.canonicalLocalizedGuideCount, 2);
  assert.equal(report.requiredOperatorGates.find((gate) => gate.id === "full-release-gate")?.status, "required-not-attested");
  assert.ok(report.postUploadChecks.every((check) => check.status === "not-performed"));
  assert.equal(report.skillsEvidence.releaseStatus, "audited-snapshot");
  assert.equal(report.skillsEvidence.stableEligible, false);
  assert.deepEqual(report.artifactInventory.map((artifact) => artifact.path), releaseArtifactContract.map((artifact) => artifact.path));
});

test("release handoff contains no invented operational timestamp or verify success", () => {
  const serialized = JSON.stringify(fixture());
  assert.doesNotMatch(serialized, /"(?:generatedAt|lastmod|uploadedAt|checkedAt)"/);
  assert.doesNotMatch(serialized, /"status":"(?:passed|success|green)"/);
  assert.match(serialized, /local build or static check does not prove that the public hostname is live/);
});
