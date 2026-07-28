import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

async function git(repo, args, encoding = "utf8") {
  const { stdout } = await execFile("git", ["-C", repo, ...args], {
    encoding,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout;
}

export async function getSourceSnapshot(repo) {
  const commit = (await git(repo, ["rev-parse", "HEAD"])).trim();
  const status = await git(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], "buffer");
  const dirty = status.length > 0;
  if (!dirty) return { commit, worktreeDirty: false, worktreeFingerprint: null };

  const trackedDiff = await git(repo, ["diff", "--binary", "HEAD", "--", "."], "buffer");
  const untrackedOutput = await git(repo, ["ls-files", "--others", "--exclude-standard", "-z"], "buffer");
  const untrackedFiles = untrackedOutput.toString("utf8").split("\0").filter(Boolean).sort();
  const hash = createHash("sha256");
  hash.update("git-status-v1\0");
  hash.update(status);
  hash.update("\0tracked-diff\0");
  hash.update(trackedDiff);
  for (const file of untrackedFiles) {
    hash.update("\0untracked\0");
    hash.update(file);
    hash.update("\0");
    hash.update(await readFile(path.join(repo, ...file.split("/"))));
  }

  return { commit, worktreeDirty: true, worktreeFingerprint: `sha256:${hash.digest("hex")}` };
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  const repo = process.argv[2];
  if (!repo) throw new Error("usage: node scripts/source-fingerprint.mjs <repository>");
  console.log(JSON.stringify(await getSourceSnapshot(path.resolve(repo)), null, 2));
}
