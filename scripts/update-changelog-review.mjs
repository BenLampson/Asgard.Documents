import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChangelogReviewReport } from "./changelog-review.mjs";
import { stableJson } from "./skills-artifacts.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceManifest = JSON.parse(await readFile(path.join(root, "docs-sources.json"), "utf8"));
const report = await createChangelogReviewReport({
  sourceManifest,
  roots: {
    asgard: process.env.ASGARD_SOURCE_ROOT || sourceManifest.asgard.path,
    heimdall: process.env.HEIMDALL_SOURCE_ROOT || sourceManifest.heimdall.path,
    skills: process.env.ASGARD_SKILLS_ROOT || sourceManifest.skills.path,
  },
});
await mkdir(path.join(root, "data"), { recursive: true });
await writeFile(path.join(root, "data", "changelog-review-report.json"), stableJson(report), "utf8");
console.log(`Changelog review report updated: ${report.summary.newCommitCount} new commits, ${report.summary.dirtySourceCount} dirty sources, requiresReview=${report.summary.requiresReview}.`);
