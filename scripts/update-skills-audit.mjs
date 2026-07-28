import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSkillsArtifacts, stableJson } from "./skills-artifacts.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceManifest = JSON.parse(await readFile(path.join(root, "docs-sources.json"), "utf8"));
const sourceRoot = process.env.ASGARD_SKILLS_ROOT || sourceManifest.skills.path;
const { manifest } = await createSkillsArtifacts({
  sourceRoot,
  sourceSnapshot: sourceManifest.skills,
  contract: sourceManifest.skillsContract,
});
const dataDirectory = path.join(root, "data");
await mkdir(dataDirectory, { recursive: true });
await writeFile(path.join(dataDirectory, "skills-audited-snapshot.json"), stableJson(manifest), "utf8");
console.log(`Skills audited snapshot updated: ${manifest.skills.length} Skills at ${manifest.source.ref}.`);
