import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifySourceProjectCoverage } from "../scripts/check-source-project-coverage.mjs";

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "asgard-project-coverage-"));
  await mkdir(path.join(directory, "src"), { recursive: true });
  await writeFile(path.join(directory, "src", "Example.csproj"), "<Project />");
  return directory;
}

const manifest = {
  schemaVersion: 1,
  reviewedAt: "2026-07-18",
  sources: {
    sample: {
      projects: [{ path: "src/Example.csproj", classification: "public-package", docs: ["overview"] }],
    },
  },
};

test("accepts an exact project inventory with canonical documentation owners", async () => {
  const directory = await fixture();
  try {
    const result = await verifySourceProjectCoverage({ manifest, sourceRoots: { sample: directory }, knownSlugs: new Set(["overview"]) });
    assert.deepEqual(result, { sample: { projects: 1, publicSurfaces: 1 } });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("fails closed when source adds an unclassified project", async () => {
  const directory = await fixture();
  try {
    await writeFile(path.join(directory, "src", "New.csproj"), "<Project />");
    await assert.rejects(
      verifySourceProjectCoverage({ manifest, sourceRoots: { sample: directory }, knownSlugs: new Set(["overview"]) }),
      /project inventory changed/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("fails closed on an unknown documentation owner", async () => {
  const directory = await fixture();
  try {
    const invalid = structuredClone(manifest);
    invalid.sources.sample.projects[0].docs = ["missing-guide"];
    await assert.rejects(
      verifySourceProjectCoverage({ manifest: invalid, sourceRoots: { sample: directory }, knownSlugs: new Set(["overview"]) }),
      /unknown documentation slug/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
