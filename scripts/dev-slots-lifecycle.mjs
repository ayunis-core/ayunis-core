import path from "node:path";

import { composeDown } from "./dev-slots-compose.mjs";
import { listListeningPorts, runCommand, slotPorts } from "./dev-slots-lib.mjs";

const modeFlags = {
  standard: [],
  e2e: ["--e2e"],
  anonymisation: ["--with-anonymisation"],
};

const servicesStopped = (detail) =>
  /Backend:\s+stopped/i.test(detail ?? "") &&
  /Frontend:\s+stopped/i.test(detail ?? "");

const unmanagedListener = (detail) =>
  /occupied by unmanaged PID/i.test(detail ?? "");

const hasManagedService = (detail) =>
  /(Backend|Frontend):\s+(running|unhealthy)/i.test(detail ?? "");

const hasLocalUnmanagedProcess = (record) =>
  record.diagnostics?.some(
    ({ owner }) => owner.worktree === record.worktree,
  ) ?? false;

function requestedMode(mode) {
  const flags = modeFlags[mode];
  if (!flags) throw new Error("Unknown start mode.");
  return flags;
}

function requestedSlot(targetSlot) {
  if (!Number.isInteger(targetSlot) || targetSlot < 2 || targetSlot > 99) {
    throw new Error("Slot must be an integer between 2 and 99.");
  }
  return targetSlot;
}

async function ensureSlotAvailable(targetSlot, records, run) {
  const targetPorts = new Set(slotPorts(targetSlot));
  const overlappingClaim = records.find(({ slot }) =>
    slotPorts(slot).some((port) => targetPorts.has(port)),
  );
  if (overlappingClaim) {
    if (overlappingClaim.slot === targetSlot) {
      throw new Error(`Slot ${targetSlot} is already claimed.`);
    }
    throw new Error(
      `Slot ${targetSlot} shares ports with claimed slot ${overlappingClaim.slot}.`,
    );
  }
  const listeningPorts = await listListeningPorts(run);
  const occupied = slotPorts(targetSlot).filter((port) =>
    listeningPorts.has(port),
  );
  if (occupied.length) {
    throw new Error(
      `Slot ${targetSlot} has occupied ports: ${occupied.join(", ")}.`,
    );
  }
}

export async function startSlot({
  id,
  targetSlot,
  mode,
  records,
  run = runCommand,
  ensureAvailable = (slot) =>
    ensureSlotAvailable(
      slot,
      records.filter((candidate) => candidate.id !== id),
      run,
    ),
}) {
  const record = records.find((candidate) => candidate.id === id);
  if (!record)
    throw new Error("Slot owner no longer exists. Refresh and try again.");
  const slot =
    targetSlot === record.slot ? record.slot : requestedSlot(targetSlot);
  const flags = requestedMode(mode);
  if (!servicesStopped(record.detail))
    throw new Error("The checkout is not stopped.");
  if (slot !== record.slot && hasLocalUnmanagedProcess(record)) {
    throw new Error("Stop the unmanaged process inside this worktree first.");
  }
  if (slot === record.slot) {
    if (record.conflict)
      throw new Error("Resolve or reassign the duplicate slot first.");
    if (unmanagedListener(record.detail))
      throw new Error("A slot port has an unmanaged owner.");
  } else {
    await ensureAvailable(slot);
  }
  const command = path.join(record.worktree, "dev");
  if (slot !== record.slot && !record.conflict) {
    await composeDown({ record, run });
  }
  return run(command, ["up", "--slot", String(slot), ...flags], {
    cwd: record.worktree,
  });
}

export async function restartSlot({ id, mode, records, run = runCommand }) {
  const record = records.find((candidate) => candidate.id === id);
  if (!record)
    throw new Error("Slot owner no longer exists. Refresh and try again.");
  if (
    record.conflict ||
    unmanagedListener(record.detail) ||
    !hasManagedService(record.detail)
  ) {
    throw new Error("This slot is not safely restartable.");
  }
  const flags = requestedMode(mode);
  const command = path.join(record.worktree, "dev");
  await run(command, ["down", "--slot", String(record.slot)], {
    cwd: record.worktree,
  });
  return run(command, ["up", "--slot", String(record.slot), ...flags], {
    cwd: record.worktree,
  });
}
