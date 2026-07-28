import assert from "node:assert/strict";
import test from "node:test";
import { createReleaseDocumentationPlan } from "../scripts/release-documentation-plan.mjs";

const base = { schemaVersion: 1, reviewedBaselineAt: "2026-07-18", policy: { commitSubjectsAreEvidenceOnly: true }, sources: [] };
const commit = { id: "asgard", comparison: "ahead-of-recorded", recordedResolvedCommit: "a".repeat(40), currentCommit: "b".repeat(40), commits: [{ commit: "b".repeat(40), subject: "add magical endpoint", requiresReview: true, publicSurfaceFiles: [{ path: "Api.cs", categories: ["api-protocol"] }] }], dirtyWorktree: { requiresReview: false } };

test("creates a bilingual source-reviewed documentation plan without commit subjects", () => {
  const decision = { evidenceId: `asgard:commit:${"b".repeat(40)}`, disposition: "document", rationale: "Verified the public route and its runtime acceptance.", verifiedFacts: ["GET /api/items is registered and covered by acceptance."], releaseNote: { version: "5.1.0", summaryZh: "新增经过源码与运行验证的项目查询接口。", summaryEn: "Adds a source- and runtime-verified item query endpoint.", canonicalSlugs: ["asgard:api-reference"] } };
  const plan = createReleaseDocumentationPlan({ changelogReport: { ...base, sources: [commit] }, decisions: { schemaVersion: 1, reviewedBaselineAt: "2026-07-18", decisions: [decision] } });
  assert.equal(plan.status, "review-decisions-complete");
  assert.equal(plan.plannedChanges.length, 1);
  assert.doesNotMatch(JSON.stringify(plan), /add magical endpoint/);
  assert.match(plan.inputs.changelogReviewSha256, /^[0-9a-f]{64}$/);
});

test("fails closed on missing or stale decisions", () => {
  assert.throws(() => createReleaseDocumentationPlan({ changelogReport: { ...base, sources: [commit] }, decisions: { schemaVersion: 1, reviewedBaselineAt: "2026-07-18", decisions: [] } }), /exactly one decision/);
  assert.throws(() => createReleaseDocumentationPlan({ changelogReport: base, decisions: { schemaVersion: 1, reviewedBaselineAt: "2026-07-18", decisions: [{ evidenceId: "stale", disposition: "no-documentation-change", rationale: "Reviewed source and found no public behavior change.", verifiedFacts: ["Private refactor only."] }] } }), /exactly one decision/);
});

test("rejects a commit subject promoted directly to a release fact", () => {
  const evidenceId = `asgard:commit:${"b".repeat(40)}`;
  assert.throws(() => createReleaseDocumentationPlan({ changelogReport: { ...base, sources: [commit] }, decisions: { schemaVersion: 1, reviewedBaselineAt: "2026-07-18", decisions: [{ evidenceId, disposition: "document", rationale: "The source and runtime path were reviewed in detail.", verifiedFacts: ["Verified fact."], releaseNote: { version: "5.1.0", summaryZh: "这是经过验证的中文发布事实。", summaryEn: "add magical endpoint", canonicalSlugs: ["asgard:release-notes"] } }] } }), /copied a commit subject/);
});
