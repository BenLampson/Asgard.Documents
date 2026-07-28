import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { getSourceSnapshot } from "./source-fingerprint.mjs";

const execFile = promisify(execFileCallback);

async function git(repository, args) {
  const { stdout } = await execFile("git", ["-C", repository, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout;
}

export function classifyPublicSurface(kind, file) {
  const normalized = file.replaceAll("\\", "/");
  const categories = new Set();
  if (/(?:^|\/)(?:Directory\.Build\.(?:props|targets)|[^/]+\.csproj|global\.json|package\.json)$/i.test(normalized)) categories.add("package-runtime");
  if (/(?:controller|endpoint|route|middleware|swagger|openid|oidc|jwks|userinfo|token)/i.test(normalized) && /\.(?:cs|json|ya?ml)$/i.test(normalized)) categories.add("api-protocol");
  if (/(?:config|options|settings|app\.ya?ml|plugin\.ya?ml)/i.test(normalized) && /\.(?:cs|json|ya?ml|template)$/i.test(normalized)) categories.add("configuration");
  if (/(?:Abstractions|Models|DTO|VO|Claims|Permissions|Attributes)/i.test(normalized) && /\.cs$/i.test(normalized)) categories.add("public-contract");
  if (/(?:Migrations?|docker|deploy|nginx|kestrel|proxy|schema)/i.test(normalized)) categories.add("operations-migration");
  if (/^(?:doc|docs)\//i.test(normalized) || /(?:^|\/)README\.md$/i.test(normalized)) categories.add("documentation");
  if (kind === "skills" && (/^skills\//i.test(normalized) || normalized === "README.md")) categories.add("agent-contract");
  return [...categories].sort();
}

function statusFiles(status) {
  return status.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    const value = line.slice(3).trim();
    return value.includes(" -> ") ? value.split(" -> ").map((item) => item.trim()) : [value];
  }).filter(Boolean).sort();
}

async function changedFilesForCommit(repository, commit) {
  return (await git(repository, ["diff-tree", "--no-commit-id", "--name-only", "-r", commit]))
    .split(/\r?\n/).filter(Boolean).sort();
}

export async function inspectChangelogSource({ id, kind, repository, recordedCommit, version = null }) {
  const snapshot = await getSourceSnapshot(repository);
  const recordedResolvedCommit = (await git(repository, ["rev-parse", `${recordedCommit}^{commit}`])).trim();
  let comparison = "up-to-date";
  let isAncestor = true;
  try {
    await git(repository, ["merge-base", "--is-ancestor", recordedResolvedCommit, snapshot.commit]);
  } catch {
    isAncestor = false;
    comparison = "history-diverged";
  }

  const commits = [];
  if (isAncestor && recordedResolvedCommit !== snapshot.commit) {
    comparison = "ahead-of-recorded";
    const records = (await git(repository, ["log", "--reverse", "--format=%H%x1f%cI%x1f%s%x1e", `${recordedResolvedCommit}..${snapshot.commit}`]))
      .split("\x1e").map((record) => record.trim()).filter(Boolean);
    for (const record of records) {
      const [commit, committedAt, subject] = record.split("\x1f");
      const changedFiles = await changedFilesForCommit(repository, commit);
      const publicSurfaceFiles = changedFiles
        .map((file) => ({ path: file, categories: classifyPublicSurface(kind, file) }))
        .filter((file) => file.categories.length > 0);
      commits.push({ commit, committedAt, subject, evidenceOnly: true, changedFiles, publicSurfaceFiles, requiresReview: publicSurfaceFiles.length > 0 });
    }
  }

  const porcelain = await git(repository, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const dirtyFiles = statusFiles(porcelain);
  const dirtyPublicSurfaceFiles = dirtyFiles
    .map((file) => ({ path: file, categories: classifyPublicSurface(kind, file) }))
    .filter((file) => file.categories.length > 0);
  const requiresReview = comparison === "history-diverged"
    || commits.some((commit) => commit.requiresReview)
    || snapshot.worktreeDirty;
  return {
    id,
    version,
    recordedCommit,
    recordedResolvedCommit,
    currentCommit: snapshot.commit,
    comparison,
    commits,
    dirtyWorktree: {
      dirty: snapshot.worktreeDirty,
      fingerprint: snapshot.worktreeFingerprint,
      changedFiles: dirtyFiles,
      publicSurfaceFiles: dirtyPublicSurfaceFiles,
      requiresReview: snapshot.worktreeDirty,
    },
    requiresReview,
  };
}

export async function createChangelogReviewReport({ sourceManifest, roots }) {
  const sources = await Promise.all([
    inspectChangelogSource({ id: "asgard", kind: "asgard", repository: roots.asgard, recordedCommit: sourceManifest.asgard.commit, version: sourceManifest.asgard.version }),
    inspectChangelogSource({ id: "heimdall", kind: "heimdall", repository: roots.heimdall, recordedCommit: sourceManifest.heimdall.commit, version: sourceManifest.heimdall.version }),
    inspectChangelogSource({ id: "skills", kind: "skills", repository: roots.skills, recordedCommit: sourceManifest.skills.commit, version: sourceManifest.skills.version }),
  ]);
  assert.equal(new Set(sources.map((source) => source.id)).size, 3, "changelog report source IDs must be unique");
  return {
    schemaVersion: 1,
    reviewedBaselineAt: sourceManifest.reviewedAt,
    policy: {
      commitSubjectsAreEvidenceOnly: true,
      automaticReleaseClaims: false,
      requiresSourceAndRuntimeVerification: true,
    },
    summary: {
      requiresReview: sources.some((source) => source.requiresReview),
      sourceCount: sources.length,
      newCommitCount: sources.reduce((count, source) => count + source.commits.length, 0),
      dirtySourceCount: sources.filter((source) => source.dirtyWorktree.dirty).length,
    },
    sources,
  };
}
