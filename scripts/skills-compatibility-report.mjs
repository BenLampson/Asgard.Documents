import assert from "node:assert/strict";

function affectedSkills(sourceFiles, reviewedSkills) {
  const known = new Set(reviewedSkills);
  return [...new Set(sourceFiles
    .map((file) => file.match(/^skills\/([^/]+)\//)?.[1])
    .filter((name) => name && known.has(name)))]
    .sort();
}

export function createSkillsCompatibilityReport({ sourceManifest, auditedSnapshot }) {
  const contract = sourceManifest.skillsContract;
  assert.equal(contract.fullCommit, auditedSnapshot.source.ref, "Skills compatibility report snapshot mismatch");
  assert.equal(contract.reviewedAt, auditedSnapshot.source.reviewedAt, "Skills compatibility report review-date mismatch");
  assert.equal(contract.releaseStatus, "audited-snapshot", "Skills compatibility report must not promote the snapshot to stable");
  const warningIds = contract.compatibilityWarnings.map((warning) => warning.id);
  assert.deepEqual(warningIds, auditedSnapshot.compatibilityWarningIds, "manifest and compatibility warning contracts differ");
  assert.equal(new Set(warningIds).size, warningIds.length, "compatibility warning IDs must be unique");

  const warnings = contract.compatibilityWarnings.map((warning) => {
    assert.ok(warning.guidanceZh && warning.guidanceEn, `${warning.id} requires bilingual guidance`);
    return {
      id: warning.id,
      status: "open",
      name: warning.name,
      affectedSkills: affectedSkills(warning.sourceFiles, contract.expectedSkills),
      sourceFiles: warning.sourceFiles,
      sourceEvidence: warning.source,
      documentationEvidence: warning.content,
      guidance: { zh: warning.guidanceZh, en: warning.guidanceEn },
    };
  });
  return {
    schemaVersion: 1,
    reviewedAt: contract.reviewedAt,
    framework: { name: "Asgard", version: sourceManifest.asgard.version, commit: sourceManifest.asgard.commit },
    skillsSnapshot: {
      repository: contract.repository,
      ref: contract.fullCommit,
      tagAtReview: contract.tagAtReview,
      releaseStatus: contract.releaseStatus,
    },
    summary: {
      status: warnings.length > 0 ? "warnings-present" : "compatible",
      openWarnings: warnings.length,
      stableEligible: warnings.length === 0 && contract.releaseStatus === "stable",
    },
    resolutionPolicy: "Remove a warning only when its source evidence is gone, its bilingual guidance is removed through this contract, and manifest/report warning IDs are regenerated together.",
    warnings,
  };
}
