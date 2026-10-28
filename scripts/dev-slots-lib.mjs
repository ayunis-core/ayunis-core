import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export function parseWorktrees(output) {
  return output
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((block) => {
      const fields = new Map();
      for (const line of block.split("\n")) {
        const separator = line.indexOf(" ");
        const key = separator === -1 ? line : line.slice(0, separator);
        const value = separator === -1 ? true : line.slice(separator + 1);
        fields.set(key, value);
      }
      const branchRef = fields.get("branch");
      return {
        path: String(fields.get("worktree")),
        head: String(fields.get("HEAD")),
        branch:
          typeof branchRef === "string"
            ? branchRef.replace(/^refs\/heads\//, "")
            : "detached",
        detached: fields.has("detached"),
        prunable: fields.has("prunable"),
      };
    });
}

function slotId(worktree, slot) {
  return createHash("sha256")
    .update(`${worktree}:${slot}`)
    .digest("hex")
    .slice(0, 16);
}

async function readSelectedSlot(worktree) {
  try {
    const value = (
      await readFile(path.join(worktree, ".dev", "slot"), "utf8")
    ).trim();
    return /^\d+$/.test(value) ? Number(value) : null;
  } catch {
    return null;
  }
}

export function classifyStatus(detail) {
  if (/unhealthy|occupied by unmanaged/i.test(detail)) return "attention";
  if (/Backend:\s+running|Frontend:\s+running/i.test(detail)) return "running";
  if (!/Docker infra:\s+not running/i.test(detail)) return "running";
  return "stopped";
}

export function parseUnmanagedListeners(detail) {
  const listeners = [];
  for (const line of detail.split("\n")) {
    const match = line.match(
      /^\s*(Backend|Frontend):.*port\s+(\d+).*unmanaged PID\s+([\d\s,]+)/i,
    );
    if (!match) continue;
    for (const pid of match[3].match(/\d+/g) ?? []) {
      listeners.push({
        service: match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(),
        port: Number(match[2]),
        pid: Number(pid),
      });
    }
  }
  return listeners;
}

export function classifyProcessOwner(cwd, worktrees) {
  if (cwd.includes("/.git/wt/trash/")) {
    return {
      kind: "orphan",
      label: "Trashed orphan",
      worktree: null,
      branch: null,
    };
  }
  if (cwd.includes(" (deleted)")) {
    return {
      kind: "orphan",
      label: "Deleted-directory orphan",
      worktree: null,
      branch: null,
    };
  }
  const owner = [...worktrees]
    .sort((left, right) => right.path.length - left.path.length)
    .find(
      (worktree) =>
        cwd === worktree.path || cwd.startsWith(`${worktree.path}${path.sep}`),
    );
  if (owner) {
    return {
      kind: "active-worktree",
      label: "Active worktree",
      worktree: owner.path,
      branch: owner.branch,
    };
  }
  return {
    kind: "unknown",
    label: "Unknown owner",
    worktree: null,
    branch: null,
  };
}

function ownerRecommendation(owner, claimWorktree) {
  if (owner.worktree === claimWorktree) {
    return "This process is inside the checkout but is not tracked; inspect it manually.";
  }
  if (owner.kind === "active-worktree")
    return "Stop this slot from the owning worktree.";
  if (owner.kind === "orphan")
    return "This process is eligible for guarded orphan cleanup.";
  return "Inspect this process manually before taking action.";
}

async function inspectProcess(listener, worktrees, claimWorktree, run) {
  const read = async (command, args) => {
    try {
      return await run(command, args);
    } catch {
      return "";
    }
  };
  const [command, lsofOutput] = await Promise.all([
    read("ps", ["-o", "command=", "-p", String(listener.pid)]),
    read("lsof", ["-a", "-p", String(listener.pid), "-d", "cwd", "-Fn"]),
  ]);
  const cwd =
    lsofOutput
      .split("\n")
      .find((line) => line.startsWith("n"))
      ?.slice(1) ?? "";
  const owner = classifyProcessOwner(cwd, worktrees);
  return {
    ...listener,
    command: command || "Process exited or command unavailable",
    cwd: cwd || "Working directory unavailable",
    owner,
    recommendation: ownerRecommendation(owner, claimWorktree),
  };
}

export async function inspectUnmanagedListeners({
  detail,
  worktrees,
  claimWorktree = null,
  run = runCommand,
}) {
  return Promise.all(
    parseUnmanagedListeners(detail).map((listener) =>
      inspectProcess(listener, worktrees, claimWorktree, run),
    ),
  );
}

function unmanagedListener(detail) {
  return /occupied by unmanaged PID/i.test(detail ?? "");
}

function servicesStopped(detail) {
  return (
    /Backend:\s+stopped/i.test(detail ?? "") &&
    /Frontend:\s+stopped/i.test(detail ?? "")
  );
}

function claimCanBeReleased(record) {
  return (
    servicesStopped(record.detail) &&
    (record.summary === "stopped" || record.conflict)
  );
}

function hasManagedService(detail) {
  return /(Backend|Frontend):\s+(running|unhealthy)/i.test(detail ?? "");
}

function hasUnhealthyInfrastructure(detail) {
  return (detail ?? "")
    .split("\n")
    .some(
      (line) =>
        /unhealthy/i.test(line) && !/^\s*(Backend|Frontend):/i.test(line),
    );
}

export function slotPorts(slot) {
  const offset = slot * 10;
  return [3000, 3001, 5432, 9000, 9001, 1025, 1080, 8080, 8002, 6379, 3100].map(
    (base) => base + offset,
  );
}

export function suggestAvailableSlots({
  records,
  listeningPorts,
  first = 2,
  last = 20,
}) {
  const claimedPorts = new Set(records.flatMap(({ slot }) => slotPorts(slot)));
  const available = [];
  for (let slot = first; slot <= last; slot += 1) {
    if (
      slotPorts(slot).some(
        (port) => claimedPorts.has(port) || listeningPorts.has(port),
      )
    ) {
      continue;
    }
    available.push(slot);
  }
  return available;
}

export async function listListeningPorts(run = runCommand) {
  let output;
  try {
    output = await run("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fn"]);
  } catch (error) {
    if (error.code === 1) output = String(error.stdout ?? "");
    else throw error;
  }
  return new Set(
    output
      .split("\n")
      .map((line) => line.match(/:(\d+)$/)?.[1])
      .filter(Boolean)
      .map(Number),
  );
}

export async function findAvailableSlots(records) {
  return suggestAvailableSlots({
    records,
    listeningPorts: await listListeningPorts(),
  });
}

export async function runCommand(command, args, options = {}) {
  const result = await execFile(command, args, {
    maxBuffer: 16 * 1024 * 1024,
    ...options,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
  });
  return result.stdout.trim();
}

export async function inspectWorktree({ worktree, slot }) {
  try {
    const detail = await runCommand(path.join(worktree, "dev"), ["status"], {
      cwd: worktree,
    });
    return { summary: classifyStatus(detail), detail };
  } catch (error) {
    const detail = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .join("\n");
    return { summary: "attention", detail };
  }
}

export async function isWorktreeDirty({ worktree }) {
  try {
    return Boolean(
      await runCommand("git", ["status", "--short"], { cwd: worktree }),
    );
  } catch {
    return false;
  }
}

export async function buildSlotRecords({
  worktrees,
  inspect = inspectWorktree,
  isDirty = isWorktreeDirty,
  diagnose = inspectUnmanagedListeners,
  inspectRemoval = async () => ({}),
}) {
  const candidates = (
    await Promise.all(
      worktrees.map(async (worktree) => ({
        ...worktree,
        slot: await readSelectedSlot(worktree.path),
      })),
    )
  ).filter(({ slot }) => slot !== null);

  const counts = new Map();
  for (const { slot } of candidates)
    counts.set(slot, (counts.get(slot) ?? 0) + 1);

  return Promise.all(
    candidates.map(async (worktree) => {
      const [{ summary, detail }, dirty] = await Promise.all([
        inspect({ worktree: worktree.path, slot: worktree.slot }),
        isDirty({ worktree: worktree.path }),
      ]);
      const diagnostics = await diagnose({
        detail,
        worktrees,
        claimWorktree: worktree.path,
      });
      const conflict = counts.get(worktree.slot) > 1;
      const record = {
        id: slotId(worktree.path, worktree.slot),
        slot: worktree.slot,
        worktree: worktree.path,
        branch: worktree.branch,
        head: worktree.head,
        detached: worktree.detached,
        prunable: worktree.prunable,
        dirty,
        summary,
        detail,
        diagnostics,
        conflict,
        stopBlockedReason: conflict
          ? "Resolve the duplicate slot claim first."
          : unmanagedListener(detail)
            ? "An unmanaged process owns a slot port. Inspect its owner before stopping anything."
            : null,
        ports: {
          backend: 3000 + worktree.slot * 10,
          frontend: 3001 + worktree.slot * 10,
          postgres: 5432 + worktree.slot * 10,
        },
      };
      const localUntrackedProcess = diagnostics.some(
        ({ owner }) => owner.worktree === worktree.path,
      );
      const removal = await inspectRemoval(record);
      return {
        ...record,
        ...removal,
        frontendRunning: /Frontend:\s+running/i.test(detail),
        stopAllowed:
          !conflict &&
          !unmanagedListener(detail) &&
          (summary === "running" ||
            hasManagedService(detail) ||
            hasUnhealthyInfrastructure(detail)),
        releaseAllowed: claimCanBeReleased(record),
        deleteDataAllowed:
          servicesStopped(detail) && !conflict && !unmanagedListener(detail),
        startAllowed:
          servicesStopped(detail) && !conflict && !unmanagedListener(detail),
        reassignAllowed:
          servicesStopped(detail) &&
          (conflict || unmanagedListener(detail)) &&
          !localUntrackedProcess,
        restartAllowed:
          hasManagedService(detail) && !conflict && !unmanagedListener(detail),
      };
    }),
  );
}

export async function discoverSlots(repoDir) {
  const output = await runCommand("git", ["worktree", "list", "--porcelain"], {
    cwd: repoDir,
  });
  return buildSlotRecords({ worktrees: parseWorktrees(output) });
}

export async function stopSlot({ id, records, run = runCommand }) {
  const record = records.find((candidate) => candidate.id === id);
  if (!record)
    throw new Error("Slot owner no longer exists. Refresh and try again.");
  if (record.conflict) {
    throw new Error(`Slot ${record.slot} is claimed by multiple worktrees.`);
  }
  if (unmanagedListener(record.detail)) {
    throw new Error(
      "An unmanaged process owns a slot port; safe stop is blocked.",
    );
  }
  return run(
    path.join(record.worktree, "dev"),
    ["down", "--slot", String(record.slot)],
    { cwd: record.worktree },
  );
}

function canStopRecord(record) {
  if (record.stopAllowed !== undefined) return record.stopAllowed;
  return (
    !record.conflict &&
    !unmanagedListener(record.detail) &&
    (record.summary === "running" ||
      hasManagedService(record.detail) ||
      hasUnhealthyInfrastructure(record.detail))
  );
}

function batchRecord(record, extra = {}) {
  return { id: record.id, slot: record.slot, branch: record.branch, ...extra };
}

export async function stopAllSlots({ records, stop = stopSlot }) {
  const result = { stopped: [], skipped: [], failed: [] };
  for (const record of records) {
    if (!canStopRecord(record)) {
      result.skipped.push(batchRecord(record));
      continue;
    }
    try {
      await stop({ id: record.id, records });
      result.stopped.push(batchRecord(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push(batchRecord(record, { error: message }));
    }
  }
  return result;
}

export async function releaseSlotClaim({ id, records }) {
  const record = records.find((candidate) => candidate.id === id);
  if (!record)
    throw new Error("Slot owner no longer exists. Refresh and try again.");
  if (!(record.releaseAllowed ?? claimCanBeReleased(record))) {
    throw new Error("This checkout still has a managed service running.");
  }
  const selectedSlot = await readSelectedSlot(record.worktree);
  if (selectedSlot !== record.slot) {
    throw new Error(
      "The checkout's selected slot changed. Refresh and try again.",
    );
  }
  await unlink(path.join(record.worktree, ".dev", "slot"));
  return `Slot ${record.slot} claim released for ${record.worktree}.`;
}

export async function readSlotLogs(record) {
  return runCommand(
    path.join(record.worktree, "dev"),
    ["logs", "--tail", "120", "all"],
    { cwd: record.worktree },
  );
}
