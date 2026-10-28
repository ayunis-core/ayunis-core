import path from "node:path";
import { readFile } from "node:fs/promises";

import {
  buildSlotRecords,
  parseWorktrees,
  runCommand,
} from "./dev-slots-lib.mjs";

const stoppedServices = (detail) =>
  /Backend:\s+stopped/i.test(detail ?? "") &&
  /Frontend:\s+stopped/i.test(detail ?? "");

function staticBlockReason(record, repoDir, primaryWorktree) {
  if (record.worktree === repoDir || record.removalProtection === "dashboard") {
    return "This worktree is serving the dashboard.";
  }
  if (
    record.worktree === primaryWorktree ||
    record.removalProtection === "primary"
  ) {
    return "The primary checkout cannot be removed as a linked worktree.";
  }
  if (!stoppedServices(record.detail))
    return "Stop the worktree's services first.";
  if (record.conflict) return "Resolve the duplicate slot claim first.";
  if (/occupied by unmanaged PID/i.test(record.detail ?? "")) {
    return "Resolve the unmanaged slot listener first.";
  }
  if (record.dirty)
    return "The worktree is dirty; commit, stash, or discard its changes first.";
  if (record.detached)
    return "A detached worktree cannot be removed from the dashboard.";
  if (record.prunable)
    return "Prune this stale worktree manually before removing it.";
  return null;
}

async function slotResources(record, run) {
  const label = `label=com.docker.compose.project=ayunis-dev-${record.slot}`;
  const resources = [];
  for (const kind of ["container", "volume", "network"]) {
    const quietFlag = kind === "container" ? "-aq" : "-q";
    const output = await run("docker", [
      kind,
      "ls",
      quietFlag,
      "--filter",
      label,
    ]);
    if (output) resources.push(kind);
  }
  return resources;
}

const blockedRemoval = (reason, upstream = null) => ({
  removeWorktreeAllowed: false,
  removeWorktreeBlockedReason: reason,
  upstream,
});

async function inspectPublishedBranch(record, run) {
  let upstream;
  try {
    upstream = await run(
      "git",
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      { cwd: record.worktree },
    );
  } catch {
    return blockedRemoval("The branch has no published upstream.");
  }
  const ahead = Number(
    await run("git", ["rev-list", "--count", "@{upstream}..HEAD"], {
      cwd: record.worktree,
    }),
  );
  return ahead > 0
    ? blockedRemoval(
        `${ahead} unpushed commit${ahead === 1 ? "" : "s"} remain.`,
        upstream,
      )
    : { upstream };
}

async function inspectSlotResources(record, upstream, run) {
  try {
    return (await slotResources(record, run)).length
      ? blockedRemoval("Delete slot data first.", upstream)
      : null;
  } catch {
    return blockedRemoval("Docker resources could not be verified.", upstream);
  }
}

export async function inspectWorktreeRemoval({
  record,
  repoDir,
  primaryWorktree,
  run,
}) {
  const blocked = staticBlockReason(record, repoDir, primaryWorktree);
  if (blocked) return blockedRemoval(blocked);
  const publication = await inspectPublishedBranch(record, run);
  if (publication.removeWorktreeBlockedReason) return publication;
  const { upstream } = publication;
  const resourceBlock = await inspectSlotResources(record, upstream, run);
  if (resourceBlock) return resourceBlock;
  return {
    removeWorktreeAllowed: true,
    removeWorktreeBlockedReason: null,
    upstream,
  };
}

export async function removeWorktree({
  id,
  confirmation,
  records,
  repoDir,
  run = runCommand,
  inspect = inspectWorktreeRemoval,
  readSlot = async (worktree) =>
    Number(
      (await readFile(path.join(worktree, ".dev", "slot"), "utf8")).trim(),
    ),
}) {
  const record = records.find((candidate) => candidate.id === id);
  if (!record)
    throw new Error("Slot owner no longer exists. Refresh and try again.");
  const expected = `REMOVE WORKTREE ${record.slot}`;
  if (confirmation !== expected)
    throw new Error(`Type ${expected} to remove this worktree.`);
  if ((await readSlot(record.worktree)) !== record.slot) {
    throw new Error(
      "The worktree's selected slot changed. Refresh and try again.",
    );
  }
  const dirty = Boolean(
    await run("git", ["status", "--short"], { cwd: record.worktree }),
  );
  const safety = await inspect({ record: { ...record, dirty }, repoDir, run });
  if (!safety.removeWorktreeAllowed)
    throw new Error(safety.removeWorktreeBlockedReason);
  await run("git", ["worktree", "remove", record.worktree], { cwd: repoDir });
  return `Removed worktree ${record.worktree}. The branch was preserved.`;
}

function removalProtection(worktree, repoDir, primaryWorktree) {
  if (path.resolve(worktree) === path.resolve(repoDir)) return "dashboard";
  if (path.resolve(worktree) === path.resolve(primaryWorktree))
    return "primary";
  return null;
}

export async function discoverSlotsWithRemoval(repoDir, run = runCommand) {
  const output = await run("git", ["worktree", "list", "--porcelain"], {
    cwd: repoDir,
  });
  const worktrees = parseWorktrees(output);
  const primaryWorktree = worktrees[0]?.path ?? repoDir;
  return buildSlotRecords({
    worktrees,
    inspectRemoval: async (record) => {
      const protection = removalProtection(
        record.worktree,
        repoDir,
        primaryWorktree,
      );
      const safety = await inspectWorktreeRemoval({
        record: { ...record, removalProtection: protection },
        repoDir,
        primaryWorktree,
        run,
      });
      return { ...safety, removalProtection: protection };
    },
  });
}
