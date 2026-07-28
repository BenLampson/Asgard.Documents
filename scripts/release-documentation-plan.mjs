import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function evidenceItems(report) {
  const items = [];
  for (const source of report.sources) {
    if (source.comparison === "history-diverged") items.push({ evidenceId: `${source.id}:history-diverged:${source.recordedResolvedCommit}:${source.currentCommit}`, sourceId: source.id, kind: "history-diverged", categories: ["history"], files: [] });
    for (const commit of source.commits.filter((item) => item.requiresReview)) {
      items.push({ evidenceId: `${source.id}:commit:${commit.commit}`, sourceId: source.id, kind: "commit", categories: [...new Set(commit.publicSurfaceFiles.flatMap((file) => file.categories))].sort(), files: commit.publicSurfaceFiles.map((file) => file.path).sort(), subjectEvidenceOnly: commit.subject });
    }
    if (source.dirtyWorktree.requiresReview) {
      assert.match(source.dirtyWorktree.fingerprint ?? "", /^sha256:[0-9a-f]{64}$/, `${source.id} dirty evidence has no fingerprint`);
      items.push({ evidenceId: `${source.id}:dirty:${source.dirtyWorktree.fingerprint}`, sourceId: source.id, kind: "dirty-worktree", categories: [...new Set(source.dirtyWorktree.publicSurfaceFiles.flatMap((file) => file.categories))].sort(), files: source.dirtyWorktree.publicSurfaceFiles.map((file) => file.path).sort() });
    }
  }
  return items.sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
}

function validateDecision(decision, evidence) {
  assert.ok(["document", "no-documentation-change"].includes(decision.disposition), `${decision.evidenceId} has an invalid disposition`);
  assert.ok(typeof decision.rationale === "string" && decision.rationale.trim().length >= 12, `${decision.evidenceId} needs a reviewed rationale`);
  assert.ok(Array.isArray(decision.verifiedFacts) && decision.verifiedFacts.length > 0 && decision.verifiedFacts.every((fact) => typeof fact === "string" && fact.trim()), `${decision.evidenceId} needs verified source/runtime facts`);
  if (decision.disposition === "document") {
    assert.ok(decision.releaseNote && typeof decision.releaseNote === "object", `${decision.evidenceId} needs a bilingual release-note decision`);
    assert.match(decision.releaseNote.version ?? "", /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, `${decision.evidenceId} release version is invalid`);
    for (const key of ["summaryZh", "summaryEn"]) assert.ok(typeof decision.releaseNote[key] === "string" && decision.releaseNote[key].trim().length >= 12, `${decision.evidenceId} needs ${key}`);
    assert.ok(Array.isArray(decision.releaseNote.canonicalSlugs) && decision.releaseNote.canonicalSlugs.length > 0, `${decision.evidenceId} needs canonicalSlugs`);
    for (const slug of decision.releaseNote.canonicalSlugs) assert.match(slug, /^(?:asgard|heimdall|skills):[a-z0-9-]+$/, `${decision.evidenceId} has invalid product:slug ${slug}`);
    if (evidence.subjectEvidenceOnly) {
      const subject = evidence.subjectEvidenceOnly.trim().toLowerCase();
      assert.notEqual(decision.releaseNote.summaryZh.trim().toLowerCase(), subject, `${decision.evidenceId} copied a commit subject into Chinese release facts`);
      assert.notEqual(decision.releaseNote.summaryEn.trim().toLowerCase(), subject, `${decision.evidenceId} copied a commit subject into English release facts`);
    }
  } else assert.equal(decision.releaseNote, undefined, `${decision.evidenceId} no-change decision must not carry a release note`);
}

export function createReleaseDocumentationPlan({ changelogReport, decisions }) {
  assert.equal(changelogReport.schemaVersion, 1, "unsupported changelog review schema");
  assert.equal(changelogReport.policy.commitSubjectsAreEvidenceOnly, true, "commit subjects must remain evidence only");
  assert.equal(decisions.schemaVersion, 1, "unsupported documentation decision schema");
  assert.equal(decisions.reviewedBaselineAt, changelogReport.reviewedBaselineAt, "decision and changelog baselines differ");
  const evidence = evidenceItems(changelogReport);
  const decisionById = new Map(decisions.decisions.map((decision) => [decision.evidenceId, decision]));
  assert.equal(decisionById.size, decisions.decisions.length, "documentation decisions contain duplicate evidence IDs");
  assert.deepEqual([...decisionById.keys()].sort(), evidence.map((item) => item.evidenceId), "every review item needs exactly one decision; stale or missing decisions fail closed");
  const plannedChanges = [];
  const noChangeEvidence = [];
  for (const item of evidence) {
    const decision = decisionById.get(item.evidenceId);
    validateDecision(decision, item);
    const reviewed = { evidenceId: item.evidenceId, sourceId: item.sourceId, kind: item.kind, categories: item.categories, files: item.files, rationale: decision.rationale, verifiedFacts: decision.verifiedFacts };
    if (decision.disposition === "document") plannedChanges.push({ ...reviewed, releaseNote: decision.releaseNote });
    else noChangeEvidence.push(reviewed);
  }
  return {
    schemaVersion: 1,
    evidenceDate: changelogReport.reviewedBaselineAt,
    timestampPolicy: "No release, build, deployment, or verification time is invented.",
    policy: { commitSubjectsAreEvidenceOnly: true, automaticReleaseNotes: false, unresolvedEvidenceFailsClosed: true, bilingualReleaseFactsRequired: true },
    inputs: { changelogReviewSha256: digest(changelogReport), decisionsSha256: digest(decisions) },
    status: "review-decisions-complete",
    summary: { reviewedEvidenceCount: evidence.length, plannedDocumentationChangeCount: plannedChanges.length, noDocumentationChangeCount: noChangeEvidence.length },
    plannedChanges,
    noChangeEvidence,
  };
}

async function runCli() {
  const args = process.argv.slice(2);
  const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const changelog = valueAfter("--changelog");
  const decisions = valueAfter("--decisions");
  if (!changelog || !decisions || args.includes("--help")) {
    console.error("Usage: node release-documentation-plan.mjs --changelog <changelog-review-report.json> --decisions <release-documentation-decisions.json>");
    process.exitCode = 2;
    return;
  }
  try {
    const [report, reviewedDecisions] = await Promise.all([readFile(path.resolve(changelog), "utf8").then(JSON.parse), readFile(path.resolve(decisions), "utf8").then(JSON.parse)]);
    process.stdout.write(`${JSON.stringify(createReleaseDocumentationPlan({ changelogReport: report, decisions: reviewedDecisions }), null, 2)}\n`);
  } catch (error) {
    console.error(`Release documentation planning failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runCli();
