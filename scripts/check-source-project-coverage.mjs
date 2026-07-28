import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocumentationRoutes } from "./documentation-routes.mjs";

const root = path.resolve(import.meta.dirname, "..");
const classifications = new Set(["public-package", "application-module", "host", "example", "test", "test-helper"]);

async function collectProjects(directory, relative = "") {
  const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (["bin", "obj", ".git", "node_modules", "dist", ".next"].includes(entry.name)) continue;
    const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) projects.push(...await collectProjects(directory, child));
    else if (entry.isFile() && (entry.name.endsWith(".csproj") || entry.name === "package.json")) projects.push(child);
  }
  return projects.sort();
}

export async function verifySourceProjectCoverage({ manifest, sourceRoots, knownSlugs }) {
  assert.equal(manifest.schemaVersion, 1, "unsupported source-project coverage schemaVersion");
  assert.match(manifest.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, "coverage reviewedAt must be YYYY-MM-DD");
  const summary = {};

  for (const [sourceId, source] of Object.entries(manifest.sources)) {
    const sourceRoot = sourceRoots[sourceId];
    assert.ok(sourceRoot, `coverage source ${sourceId} has no source root`);
    const declaredPaths = source.projects.map((project) => project.path);
    assert.equal(new Set(declaredPaths).size, declaredPaths.length, `${sourceId} contains duplicate project paths`);
    for (const project of source.projects) {
      assert.equal(path.isAbsolute(project.path), false, `${sourceId} project paths must stay relative`);
      assert.equal(project.path.includes("\\"), false, `${sourceId} project paths must use POSIX separators`);
      assert.ok(classifications.has(project.classification), `${project.path} has unknown classification`);
      assert.ok(Array.isArray(project.docs) && project.docs.length > 0, `${project.path} has no documentation owner`);
      assert.equal(new Set(project.docs).size, project.docs.length, `${project.path} repeats a documentation slug`);
      for (const slug of project.docs) assert.ok(knownSlugs.has(slug), `${project.path} references unknown documentation slug ${slug}`);
    }

    const actualPaths = await collectProjects(sourceRoot);
    assert.deepEqual([...declaredPaths].sort(), actualPaths, `${sourceId} project inventory changed; classify every .csproj/package.json and assign documentation owners`);
    summary[sourceId] = {
      projects: actualPaths.length,
      publicSurfaces: source.projects.filter((project) => ["public-package", "application-module", "host"].includes(project.classification)).length,
    };
  }
  return summary;
}

async function main() {
  const [manifest, docsSources, routeData] = await Promise.all([
    readFile(path.join(root, "data/source-project-coverage.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "docs-sources.json"), "utf8").then(JSON.parse),
    getDocumentationRoutes(),
  ]);
  const knownSlugs = new Set(routeData.slugs);
  const summary = await verifySourceProjectCoverage({
    manifest,
    sourceRoots: { asgard: docsSources.asgard.path, heimdall: docsSources.heimdall.path },
    knownSlugs,
  });
  console.log(`Source-project coverage OK: ${summary.asgard.projects} Asgard projects and ${summary.heimdall.projects} Heimdall backend/frontend projects are classified and linked to canonical guides.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
