import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { classifyPublicSurface, inspectChangelogSource } from "../scripts/changelog-review.mjs";

const execFile = promisify(execFileCallback);
const git = (repository, args) => execFile("git", ["-C", repository, ...args], { encoding: "utf8", windowsHide: true });

test("classifies review-triggering public surfaces without treating every file as public", () => {
  assert.deepEqual(classifyPublicSurface("asgard", "Host/Auth/JwtConfig.cs"), ["configuration"]);
  assert.ok(classifyPublicSurface("heimdall", "Controllers/Identity/TokenController.cs").includes("api-protocol"));
  assert.deepEqual(classifyPublicSurface("skills", "skills/asgard-cache/SKILL.md"), ["agent-contract"]);
  assert.deepEqual(classifyPublicSurface("asgard", "tests/InternalFixture.txt"), []);
});

test("ingests commit evidence and fingerprints a dirty worktree without changing source", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "asgard-changelog-"));
  try {
    await git(repository, ["init"]);
    await git(repository, ["config", "user.email", "docs@example.invalid"]);
    await git(repository, ["config", "user.name", "Docs Test"]);
    await writeFile(path.join(repository, "README.md"), "baseline\n", "utf8");
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "baseline"]);
    const baseline = (await git(repository, ["rev-parse", "HEAD"])).stdout.trim();

    await mkdir(path.join(repository, "Controllers"));
    await writeFile(path.join(repository, "Controllers", "TokenController.cs"), "public sealed class TokenController {}\n", "utf8");
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "claim a feature in a subject only"]);
    await writeFile(path.join(repository, "app.yaml"), "host: {}\n", "utf8");

    const report = await inspectChangelogSource({ id: "fixture", kind: "heimdall", repository, recordedCommit: baseline });
    assert.equal(report.comparison, "ahead-of-recorded");
    assert.equal(report.commits.length, 1);
    assert.equal(report.commits[0].subject, "claim a feature in a subject only");
    assert.equal(report.commits[0].evidenceOnly, true);
    assert.equal(report.commits[0].requiresReview, true);
    assert.ok(report.commits[0].publicSurfaceFiles.some((file) => file.path === "Controllers/TokenController.cs"));
    assert.equal(report.dirtyWorktree.dirty, true);
    assert.match(report.dirtyWorktree.fingerprint, /^sha256:[0-9a-f]{64}$/);
    assert.equal(report.dirtyWorktree.requiresReview, true);
    assert.ok(report.dirtyWorktree.changedFiles.includes("app.yaml"));
    assert.equal(report.requiresReview, true);
    assert.equal((await git(repository, ["status", "--porcelain=v1"])).stdout.trim(), "?? app.yaml");
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
