export const siteBaseline = {
  framework: { name: "Asgard", version: "5.1.3", sourceCommit: "d1002d1", releaseCommit: "90e8a8b" },
  heimdall: { name: "Heimdall", version: "5.3.19", sourceState: "clean main 0032070; HEAD is immutable tag v5.3.19 with no post-tag delta" },
  skills: { name: "Asgard Skills", sourceCommit: "7b26856", tagAtReview: "v4.0.0", releaseStatus: "audited-snapshot", reviewedAt: "2026-07-28" },
  runtime: { dotnet: "10", sdk: "10.0.302", csharp: "14" },
  reviewedAt: "2026-07-28",
  previewPolicy: "Content marked Preview or HEAD-only is not part of the immutable v5.3.19 release artifact unless a later tag includes it.",
} as const;
