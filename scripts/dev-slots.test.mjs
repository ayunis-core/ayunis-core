import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSlotRecords,
  classifyProcessOwner,
  inspectUnmanagedListeners,
  listListeningPorts,
  parseWorktrees,
  parseUnmanagedListeners,
  releaseSlotClaim,
  runCommand,
  stopAllSlots,
  stopSlot,
  suggestAvailableSlots,
} from "./dev-slots-lib.mjs";
import { restartSlot, startSlot } from "./dev-slots-lifecycle.mjs";
import { deleteSlotData } from "./dev-slots-cleanup.mjs";
import {
  inspectWorktreeRemoval,
  removeWorktree,
} from "./dev-slots-worktree.mjs";
import {
  createSlotsHandler,
  disableDuring,
  selectableSlots,
  startActionLabel,
  updateNotice,
} from "./dev-slots-ui.mjs";

test("parseWorktrees keeps branch and detached checkout information", () => {
  const worktrees = parseWorktrees(`worktree /repo/main
HEAD abc123
branch refs/heads/main

worktree /repo/review
HEAD def456
detached
prunable gitdir file points to non-existent location
`);

  assert.deepEqual(worktrees, [
    {
      path: "/repo/main",
      head: "abc123",
      branch: "main",
      detached: false,
      prunable: false,
    },
    {
      path: "/repo/review",
      head: "def456",
      branch: "detached",
      detached: true,
      prunable: true,
    },
  ]);
});

test("parseUnmanagedListeners extracts every service, port, and PID", () => {
  const listeners =
    parseUnmanagedListeners(`Backend:   stopped  port 3080 occupied by unmanaged PID 4175 4176
Frontend:  stopped  port 3081 occupied by unmanaged PID 5000`);

  assert.deepEqual(listeners, [
    { service: "Backend", port: 3080, pid: 4175 },
    { service: "Backend", port: 3080, pid: 4176 },
    { service: "Frontend", port: 3081, pid: 5000 },
  ]);
});

test("classifyProcessOwner distinguishes active worktrees and verified orphans", () => {
  const worktrees = [
    { path: "/repo/main", branch: "main" },
    { path: "/repo/review", branch: "review" },
  ];

  assert.deepEqual(
    classifyProcessOwner("/repo/review/ayunis-core-backend", worktrees),
    {
      kind: "active-worktree",
      label: "Active worktree",
      worktree: "/repo/review",
      branch: "review",
    },
  );
  assert.deepEqual(
    classifyProcessOwner("/repo/main/.git/wt/trash/old", worktrees),
    {
      kind: "orphan",
      label: "Trashed orphan",
      worktree: null,
      branch: null,
    },
  );
  assert.deepEqual(classifyProcessOwner("/repo/review (deleted)", worktrees), {
    kind: "orphan",
    label: "Deleted-directory orphan",
    worktree: null,
    branch: null,
  });
  assert.deepEqual(classifyProcessOwner("/tmp/unrelated", worktrees), {
    kind: "unknown",
    label: "Unknown owner",
    worktree: null,
    branch: null,
  });
});

test("classifyProcessOwner chooses a nested worktree over its parent checkout", () => {
  const owner = classifyProcessOwner(
    "/repo/.claude/worktrees/review/ayunis-core-frontend",
    [
      { path: "/repo", branch: "main" },
      { path: "/repo/.claude/worktrees/review", branch: "review" },
    ],
  );

  assert.equal(owner.worktree, "/repo/.claude/worktrees/review");
  assert.equal(owner.branch, "review");
});

test("inspectUnmanagedListeners reports command and owning worktree", async () => {
  const diagnostics = await inspectUnmanagedListeners({
    detail: "Backend: stopped port 3080 occupied by unmanaged PID 4175",
    worktrees: [
      { path: "/repo/main", branch: "main" },
      { path: "/repo/review", branch: "review" },
    ],
    run: async (command) =>
      command === "ps"
        ? "node nest start --watch"
        : "p4175\nfcwd\nn/repo/review/ayunis-core-backend",
  });

  assert.deepEqual(diagnostics, [
    {
      service: "Backend",
      port: 3080,
      pid: 4175,
      command: "node nest start --watch",
      cwd: "/repo/review/ayunis-core-backend",
      owner: {
        kind: "active-worktree",
        label: "Active worktree",
        worktree: "/repo/review",
        branch: "review",
      },
      recommendation: "Stop this slot from the owning worktree.",
    },
  ]);
});

test("inspectUnmanagedListeners does not recommend dev down for an untracked local process", async () => {
  const diagnostics = await inspectUnmanagedListeners({
    detail: "Backend: stopped port 3080 occupied by unmanaged PID 4175",
    claimWorktree: "/repo/review",
    worktrees: [{ path: "/repo/review", branch: "review" }],
    run: async (command) =>
      command === "ps"
        ? "node nest start --watch"
        : "n/repo/review/ayunis-core-backend",
  });

  assert.equal(
    diagnostics[0].recommendation,
    "This process is inside the checkout but is not tracked; inspect it manually.",
  );
});

test("buildSlotRecords lists only worktrees that have selected a valid slot", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dev-slots-"));
  const main = path.join(root, "main");
  const review = path.join(root, "review");
  const unused = path.join(root, "unused");
  await Promise.all([
    mkdir(path.join(main, ".dev"), { recursive: true }),
    mkdir(path.join(review, ".dev"), { recursive: true }),
    mkdir(path.join(unused, ".dev"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(main, ".dev", "slot"), "2\n"),
    writeFile(path.join(review, ".dev", "slot"), "2\n"),
    writeFile(path.join(unused, ".dev", "slot"), "not-a-slot\n"),
  ]);

  const records = await buildSlotRecords({
    worktrees: [
      {
        path: main,
        head: "aaa",
        branch: "main",
        detached: false,
        prunable: false,
      },
      {
        path: review,
        head: "bbb",
        branch: "review",
        detached: false,
        prunable: false,
      },
      {
        path: unused,
        head: "ccc",
        branch: "unused",
        detached: false,
        prunable: false,
      },
    ],
    inspect: async ({ worktree }) => ({
      summary: worktree === main ? "running" : "stopped",
      detail: "status output",
    }),
    isDirty: async ({ worktree }) => worktree === review,
  });

  assert.equal(records.length, 2);
  assert.deepEqual(
    records.map(({ slot, branch, summary, conflict, dirty }) => ({
      slot,
      branch,
      summary,
      conflict,
      dirty,
    })),
    [
      {
        slot: 2,
        branch: "main",
        summary: "running",
        conflict: true,
        dirty: false,
      },
      {
        slot: 2,
        branch: "review",
        summary: "stopped",
        conflict: true,
        dirty: true,
      },
    ],
  );
});

test("buildSlotRecords only marks the frontend open when it is running", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dev-slots-frontend-"));
  await mkdir(path.join(root, ".dev"), { recursive: true });
  await writeFile(path.join(root, ".dev", "slot"), "4\n");

  const [record] = await buildSlotRecords({
    worktrees: [
      {
        path: root,
        head: "aaa",
        branch: "main",
        detached: false,
        prunable: false,
      },
    ],
    inspect: async () => ({
      summary: "running",
      detail: "Backend: running\nFrontend: stopped\nDocker infra: running",
    }),
    isDirty: async () => false,
    diagnose: async () => [],
  });

  assert.equal(record.frontendRunning, false);
});

test("buildSlotRecords allows a stopped checkout to move away from an orphan listener", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dev-slots-orphan-"));
  await mkdir(path.join(root, ".dev"), { recursive: true });
  await writeFile(path.join(root, ".dev", "slot"), "8\n");

  const [record] = await buildSlotRecords({
    worktrees: [
      {
        path: root,
        head: "aaa",
        branch: "main",
        detached: false,
        prunable: false,
      },
    ],
    inspect: async () => ({
      summary: "attention",
      detail:
        "Backend: stopped port 3080 occupied by unmanaged PID 42\nFrontend: stopped",
    }),
    isDirty: async () => false,
    diagnose: async () => [{ owner: { kind: "orphan", worktree: null } }],
  });

  assert.equal(record.startAllowed, false);
  assert.equal(record.reassignAllowed, true);
  assert.equal(record.deleteDataAllowed, false);
});

test("buildSlotRecords allows managed unhealthy infrastructure to be stopped", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "dev-slots-unhealthy-infra-"),
  );
  await mkdir(path.join(root, ".dev"), { recursive: true });
  await writeFile(path.join(root, ".dev", "slot"), "6\n");

  const [record] = await buildSlotRecords({
    worktrees: [
      {
        path: root,
        head: "aaa",
        branch: "main",
        detached: false,
        prunable: false,
      },
    ],
    inspect: async () => ({
      summary: "attention",
      detail:
        "postgres  Up 2 minutes (unhealthy)\nBackend: stopped\nFrontend: stopped",
    }),
    isDirty: async () => false,
    diagnose: async () => [],
  });

  assert.equal(record.stopAllowed, true);
  assert.equal(record.releaseAllowed, false);
  assert.equal(record.deleteDataAllowed, true);
});

test("runCommand does not force the local Infisical fallback", async () => {
  const previous = process.env.AYUNIS_NO_INFISICAL;
  delete process.env.AYUNIS_NO_INFISICAL;
  try {
    const value = await runCommand(process.execPath, [
      "-e",
      "process.stdout.write(process.env.AYUNIS_NO_INFISICAL ?? 'unset')",
    ]);
    assert.equal(value, "unset");
  } finally {
    if (previous === undefined) delete process.env.AYUNIS_NO_INFISICAL;
    else process.env.AYUNIS_NO_INFISICAL = previous;
  }
});

test("runCommand captures output larger than Node's default child-process buffer", async () => {
  const value = await runCommand(process.execPath, [
    "-e",
    "process.stdout.write('x'.repeat(1100000))",
  ]);

  assert.equal(value.length, 1_100_000);
});

test("disableDuring restores a failed action button", async () => {
  const button = { disabled: false };

  await assert.rejects(
    disableDuring(button, async () => {
      assert.equal(button.disabled, true);
      throw new Error("request failed");
    }),
    /request failed/,
  );

  assert.equal(button.disabled, false);
});

test("updateNotice clears stale error styling on success", () => {
  const notice = { textContent: "", style: { color: "" } };

  updateNotice(notice, "Request failed", true);
  assert.equal(notice.style.color, "#ff9aa8");

  updateNotice(notice, "Slot started");
  assert.equal(notice.textContent, "Slot started");
  assert.equal(notice.style.color, "");
});

test("a safely stopped slot offers its current slot and verified-free alternatives", () => {
  assert.deepEqual(
    selectableSlots(
      { slot: 4, startAllowed: true, reassignAllowed: false },
      [6, 7],
    ),
    [4, 6, 7],
  );
  assert.deepEqual(
    selectableSlots(
      { slot: 4, startAllowed: false, reassignAllowed: true },
      [6, 7],
    ),
    [6, 7],
  );
});

test("the start action label follows the selected target slot", () => {
  assert.equal(startActionLabel(4, 4), "Start");
  assert.equal(startActionLabel(4, 6), "Reassign & start");
});

test("stopSlot refuses a slot claimed by more than one worktree", async () => {
  const records = [
    { id: "one", slot: 2, conflict: true, worktree: "/repo/one" },
    { id: "two", slot: 2, conflict: true, worktree: "/repo/two" },
  ];
  let called = false;

  await assert.rejects(
    stopSlot({
      id: "one",
      records,
      run: async () => {
        called = true;
      },
    }),
    /claimed by multiple worktrees/,
  );
  assert.equal(called, false);
});

test("stopSlot refuses to partially stop a slot with unmanaged listeners", async () => {
  let called = false;
  await assert.rejects(
    stopSlot({
      id: "owner",
      records: [
        {
          id: "owner",
          slot: 8,
          conflict: false,
          worktree: "/repo/owner",
          detail: "Backend: stopped port 3080 occupied by unmanaged PID 42",
        },
      ],
      run: async () => {
        called = true;
      },
    }),
    /unmanaged process owns a slot port/,
  );
  assert.equal(called, false);
});

test("stopSlot runs the owning checkout's dev command", async () => {
  const calls = [];
  const record = {
    id: "owner",
    slot: 4,
    conflict: false,
    worktree: "/repo/owner",
  };

  await stopSlot({
    id: "owner",
    records: [record],
    run: async (command, args, options) =>
      calls.push({ command, args, options }),
  });

  assert.deepEqual(calls, [
    {
      command: "/repo/owner/dev",
      args: ["down", "--slot", "4"],
      options: { cwd: "/repo/owner" },
    },
  ]);
});

test("stopAllSlots stops only safe records and continues after failures", async () => {
  const records = [
    { id: "safe", slot: 2, branch: "safe", summary: "running", detail: "" },
    {
      id: "stopped",
      slot: 3,
      branch: "stopped",
      summary: "stopped",
      detail: "",
    },
    {
      id: "blocked",
      slot: 4,
      branch: "blocked",
      summary: "attention",
      conflict: true,
      detail: "Backend: unhealthy",
    },
    { id: "fails", slot: 5, branch: "fails", summary: "running", detail: "" },
  ];
  const attempted = [];

  const result = await stopAllSlots({
    records,
    stop: async ({ id }) => {
      attempted.push(id);
      if (id === "fails") throw new Error("changed while stopping");
    },
  });

  assert.deepEqual(attempted, ["safe", "fails"]);
  assert.deepEqual(
    result.stopped.map(({ id }) => id),
    ["safe"],
  );
  assert.deepEqual(
    result.skipped.map(({ id }) => id),
    ["stopped", "blocked"],
  );
  assert.deepEqual(result.failed, [
    {
      id: "fails",
      slot: 5,
      branch: "fails",
      error: "changed while stopping",
    },
  ]);
});

test("deleteSlotData requires exact confirmation and removes only the slot compose data", async () => {
  const calls = [];
  const records = [
    {
      id: "owner",
      slot: 6,
      branch: "cleanup",
      worktree: "/repo/owner",
      deleteDataAllowed: true,
    },
  ];

  await assert.rejects(
    deleteSlotData({ id: "owner", confirmation: "DELETE", records }),
    /Type DELETE SLOT 6/,
  );
  await assert.rejects(
    deleteSlotData({
      id: "blocked",
      confirmation: "DELETE SLOT 6",
      records: [{ ...records[0], id: "blocked", deleteDataAllowed: false }],
      run: async () => calls.push("unexpected"),
    }),
    /Stop the slot/,
  );
  await deleteSlotData({
    id: "owner",
    confirmation: "DELETE SLOT 6",
    records,
    run: async (command, args, options) =>
      calls.push({ command, args, options }),
  });

  assert.equal(calls[0].command, "docker");
  assert.deepEqual(calls[0].args, [
    "compose",
    "-f",
    "/repo/owner/compose.dev.yml",
    "-p",
    "ayunis-dev-6",
    "down",
    "--volumes",
  ]);
  assert.equal(calls[0].options.cwd, "/repo/owner");
  assert.equal(calls[0].options.env.POSTGRES_HOST_PORT, "5492");
  assert.equal(calls[0].options.env.MINIO_HOST_PORT, "9060");
  assert.equal(calls[0].options.env.MINIO_ROOT_USER, "placeholder");
  assert.equal(calls[0].options.env.MINIO_ROOT_PASSWORD, "placeholder");
  assert.equal(calls[0].options.env.REDIS_PASSWORD, "placeholder");
});

test("inspectWorktreeRemoval allows only a stopped clean published checkout with no slot resources", async () => {
  const calls = [];
  const result = await inspectWorktreeRemoval({
    record: {
      slot: 6,
      branch: "feat/review",
      worktree: "/repo/review",
      dirty: false,
      detached: false,
      prunable: false,
      conflict: false,
      detail: "Backend: stopped\nFrontend: stopped",
    },
    repoDir: "/repo/dashboard",
    primaryWorktree: "/repo/main",
    run: async (command, args, options) => {
      calls.push({ command, args, options });
      if (command === "git" && args[0] === "rev-parse")
        return "origin/feat/review";
      if (command === "git") return "0";
      return "";
    },
  });

  assert.deepEqual(result, {
    removeWorktreeAllowed: true,
    removeWorktreeBlockedReason: null,
    upstream: "origin/feat/review",
  });
  assert.deepEqual(calls.at(-1).args, [
    "network",
    "ls",
    "-q",
    "--filter",
    "label=com.docker.compose.project=ayunis-dev-6",
  ]);
});

test("inspectWorktreeRemoval blocks protected, dirty, detached, and uncleaned worktrees", async () => {
  const base = {
    slot: 6,
    branch: "feat/review",
    worktree: "/repo/review",
    dirty: false,
    detached: false,
    prunable: false,
    conflict: false,
    detail: "Backend: stopped\nFrontend: stopped",
  };
  const inspect = (record, run = async () => "") =>
    inspectWorktreeRemoval({
      record,
      repoDir: "/repo/dashboard",
      primaryWorktree: "/repo/main",
      run,
    });

  assert.match(
    (await inspect({ ...base, worktree: "/repo/dashboard" }))
      .removeWorktreeBlockedReason,
    /serving the dashboard/,
  );
  assert.match(
    (await inspect({ ...base, worktree: "/repo/main" }))
      .removeWorktreeBlockedReason,
    /primary checkout/,
  );
  assert.match(
    (await inspect({ ...base, dirty: true })).removeWorktreeBlockedReason,
    /dirty/,
  );
  assert.match(
    (await inspect({ ...base, detached: true })).removeWorktreeBlockedReason,
    /detached/,
  );
  assert.match(
    (
      await inspect(base, async (command, args) => {
        if (command === "git" && args[0] === "rev-parse")
          return "origin/feat/review";
        if (command === "git") return "0";
        return args[0] === "volume" ? "ayunis-dev-6_postgres-data" : "";
      })
    ).removeWorktreeBlockedReason,
    /Delete slot data first/,
  );
});

test("inspectWorktreeRemoval blocks unpublished and ahead branches", async () => {
  const record = {
    slot: 6,
    branch: "feat/review",
    worktree: "/repo/review",
    dirty: false,
    detached: false,
    prunable: false,
    conflict: false,
    detail: "Backend: stopped\nFrontend: stopped",
  };
  const inspect = (run) =>
    inspectWorktreeRemoval({
      record,
      repoDir: "/repo/dashboard",
      primaryWorktree: "/repo/main",
      run,
    });

  assert.match(
    (
      await inspect(async () => {
        throw new Error("no upstream");
      })
    ).removeWorktreeBlockedReason,
    /published upstream/,
  );
  assert.match(
    (
      await inspect(async (command, args) => {
        if (args[0] === "rev-parse") return "origin/feat/review";
        if (command === "git") return "2";
        return "";
      })
    ).removeWorktreeBlockedReason,
    /2 unpushed commits/,
  );
});

test("removeWorktree rechecks safety, requires exact confirmation, and never forces removal", async () => {
  const calls = [];
  const records = [
    { id: "owner", slot: 6, branch: "feat/review", worktree: "/repo/review" },
  ];
  const inspect = async () => ({ removeWorktreeAllowed: true });

  await assert.rejects(
    removeWorktree({
      id: "owner",
      confirmation: "REMOVE",
      records,
      repoDir: "/repo",
      inspect,
    }),
    /Type REMOVE WORKTREE 6/,
  );
  await removeWorktree({
    id: "owner",
    confirmation: "REMOVE WORKTREE 6",
    records,
    repoDir: "/repo",
    inspect,
    readSlot: async () => 6,
    run: async (command, args, options) =>
      calls.push({ command, args, options }),
  });

  assert.deepEqual(calls, [
    {
      command: "git",
      args: ["status", "--short"],
      options: { cwd: "/repo/review" },
    },
    {
      command: "git",
      args: ["worktree", "remove", "/repo/review"],
      options: { cwd: "/repo" },
    },
  ]);
});

test("removeWorktree refuses a checkout that became dirty after inventory", async () => {
  let removed = false;
  await assert.rejects(
    removeWorktree({
      id: "owner",
      confirmation: "REMOVE WORKTREE 6",
      records: [
        { id: "owner", slot: 6, worktree: "/repo/review", dirty: false },
      ],
      repoDir: "/repo",
      readSlot: async () => 6,
      inspect: async ({ record }) => ({
        removeWorktreeAllowed: !record.dirty,
        removeWorktreeBlockedReason: "The worktree became dirty.",
      }),
      run: async (command, args) => {
        if (args[0] === "status") return "?? untracked-file";
        if (command === "git") removed = true;
        return "";
      },
    }),
    /became dirty/,
  );
  assert.equal(removed, false);
});

test("removeWorktree refuses a changed slot claim before running git", async () => {
  let ran = false;
  await assert.rejects(
    removeWorktree({
      id: "owner",
      confirmation: "REMOVE WORKTREE 6",
      records: [{ id: "owner", slot: 6, worktree: "/repo/review" }],
      repoDir: "/repo",
      readSlot: async () => 7,
      run: async () => {
        ran = true;
      },
    }),
    /selected slot changed/,
  );
  assert.equal(ran, false);
});

test("releaseSlotClaim removes only a stopped checkout's slot selection", async () => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "dev-slot-release-"));
  const slotFile = path.join(worktree, ".dev", "slot");
  await mkdir(path.dirname(slotFile), { recursive: true });
  await writeFile(slotFile, "4\n");

  await releaseSlotClaim({
    id: "owner",
    records: [
      {
        id: "owner",
        slot: 4,
        worktree,
        summary: "stopped",
        detail: "Backend:   stopped\nFrontend:  stopped",
      },
    ],
  });

  await assert.rejects(access(slotFile), { code: "ENOENT" });
});

test("releaseSlotClaim preserves a running checkout's slot selection", async () => {
  const worktree = await mkdtemp(path.join(os.tmpdir(), "dev-slot-running-"));
  const slotFile = path.join(worktree, ".dev", "slot");
  await mkdir(path.dirname(slotFile), { recursive: true });
  await writeFile(slotFile, "4\n");

  await assert.rejects(
    releaseSlotClaim({
      id: "owner",
      records: [
        {
          id: "owner",
          slot: 4,
          worktree,
          summary: "running",
          detail: "Backend:   running\nFrontend:  stopped",
        },
      ],
    }),
    /still has a managed service running/,
  );
  assert.equal(await readFile(slotFile, "utf8"), "4\n");
});

test("suggestAvailableSlots excludes claims and occupied service ports", () => {
  assert.deepEqual(
    suggestAvailableSlots({
      records: [{ slot: 2 }, { slot: 5 }],
      listeningPorts: new Set([3031]),
      first: 2,
      last: 5,
    }),
    [4],
  );
});

test("suggestAvailableSlots excludes ports reserved by another claimed slot", () => {
  assert.deepEqual(
    suggestAvailableSlots({
      records: [{ slot: 2 }],
      listeningPorts: new Set(),
      first: 12,
      last: 12,
    }),
    [],
  );
});

test("listListeningPorts keeps partial lsof output from exit code 1", async () => {
  const ports = await listListeningPorts(async () => {
    throw Object.assign(new Error("some processes were unreadable"), {
      code: 1,
      stdout: "p123\nn127.0.0.1:3040\np456\nn*:3041\n",
    });
  });

  assert.deepEqual(ports, new Set([3040, 3041]));
});

test("startSlot starts a stopped checkout in the selected mode", async () => {
  const calls = [];
  await startSlot({
    id: "owner",
    targetSlot: 4,
    mode: "e2e",
    records: [
      {
        id: "owner",
        slot: 4,
        conflict: false,
        worktree: "/repo/owner",
        detail: "Backend: stopped\nFrontend: stopped",
      },
    ],
    run: async (command, args, options) =>
      calls.push({ command, args, options }),
  });

  assert.deepEqual(calls, [
    {
      command: "/repo/owner/dev",
      args: ["up", "--slot", "4", "--e2e"],
      options: { cwd: "/repo/owner" },
    },
  ]);
});

test("startSlot accepts an existing slot 1 claim", async () => {
  const calls = [];
  await startSlot({
    id: "owner",
    targetSlot: 1,
    mode: "standard",
    records: [
      {
        id: "owner",
        slot: 1,
        conflict: false,
        worktree: "/repo/owner",
        detail: "Backend: stopped\nFrontend: stopped",
      },
    ],
    run: async (command, args) => calls.push({ command, args }),
  });

  assert.deepEqual(calls[0].args, ["up", "--slot", "1"]);
});

test("startSlot can move a stopped conflicting checkout to a verified free slot", async () => {
  const calls = [];
  await startSlot({
    id: "owner",
    targetSlot: 6,
    mode: "standard",
    records: [
      {
        id: "owner",
        slot: 5,
        conflict: true,
        worktree: "/repo/owner",
        detail: "Backend: stopped\nFrontend: stopped",
      },
      { id: "other", slot: 5, worktree: "/repo/other" },
    ],
    ensureAvailable: async (slot) => assert.equal(slot, 6),
    run: async (command, args) => calls.push({ command, args }),
  });

  assert.deepEqual(calls[0].args, ["up", "--slot", "6"]);
});

test("startSlot rejects reassignment while an unmanaged local process remains", async () => {
  let started = false;
  await assert.rejects(
    startSlot({
      id: "owner",
      targetSlot: 6,
      mode: "standard",
      records: [
        {
          id: "owner",
          slot: 5,
          conflict: false,
          worktree: "/repo/owner",
          detail:
            "Backend: stopped port 3050 occupied by unmanaged PID 42\nFrontend: stopped",
          diagnostics: [
            { owner: { kind: "active-worktree", worktree: "/repo/owner" } },
          ],
        },
      ],
      ensureAvailable: async () => {},
      run: async () => {
        started = true;
      },
    }),
    /unmanaged process inside this worktree/,
  );
  assert.equal(started, false);
});

test("startSlot tears down old managed infrastructure before an ordinary reassignment", async () => {
  const calls = [];
  await startSlot({
    id: "owner",
    targetSlot: 6,
    mode: "standard",
    records: [
      {
        id: "owner",
        slot: 5,
        conflict: false,
        worktree: "/repo/owner",
        detail: "Docker infra: running\nBackend: stopped\nFrontend: stopped",
      },
    ],
    ensureAvailable: async (slot) => assert.equal(slot, 6),
    run: async (command, args, options) =>
      calls.push({ command, args, options }),
  });

  assert.equal(calls[0].command, "docker");
  assert.deepEqual(calls[0].args.slice(-1), ["down"]);
  assert.deepEqual(calls[1].args, ["up", "--slot", "6"]);
});

test("startSlot stops old managed infrastructure before moving away from an unmanaged listener", async () => {
  const calls = [];
  await startSlot({
    id: "owner",
    targetSlot: 6,
    mode: "standard",
    records: [
      {
        id: "owner",
        slot: 5,
        conflict: false,
        worktree: "/repo/owner",
        detail:
          "Backend: stopped port 3050 occupied by unmanaged PID 42\nFrontend: stopped",
      },
    ],
    ensureAvailable: async (slot) => assert.equal(slot, 6),
    run: async (command, args, options) =>
      calls.push({ command, args, options }),
  });

  assert.equal(calls[0].command, "docker");
  assert.deepEqual(calls[0].args, [
    "compose",
    "-f",
    "/repo/owner/compose.dev.yml",
    "-p",
    "ayunis-dev-5",
    "down",
  ]);
  assert.equal(calls[0].options.env.POSTGRES_HOST_PORT, "5482");
  assert.deepEqual(calls[1].args, ["up", "--slot", "6"]);
});

test("startSlot rejects a target whose ports overlap another claim", async () => {
  let started = false;

  await assert.rejects(
    startSlot({
      id: "owner",
      targetSlot: 12,
      mode: "standard",
      records: [
        {
          id: "owner",
          slot: 5,
          conflict: false,
          worktree: "/repo/owner",
          detail: "Backend: stopped\nFrontend: stopped",
        },
        { id: "other", slot: 2, worktree: "/repo/other" },
      ],
      run: async (command) => {
        if (command === "lsof") return "";
        started = true;
      },
    }),
    /shares ports with claimed slot 2/,
  );

  assert.equal(started, false);
});

test("restartSlot stops before starting with the selected mode", async () => {
  const calls = [];
  await restartSlot({
    id: "owner",
    mode: "anonymisation",
    records: [
      {
        id: "owner",
        slot: 4,
        conflict: false,
        worktree: "/repo/owner",
        detail: "Backend: running\nFrontend: running",
      },
    ],
    run: async (command, args) => calls.push({ command, args }),
  });

  assert.deepEqual(
    calls.map(({ args }) => args),
    [
      ["down", "--slot", "4"],
      ["up", "--slot", "4", "--with-anonymisation"],
    ],
  );
});

test("slot UI API protects lifecycle mutations with its session token", async () => {
  const record = {
    id: "owner",
    slot: 4,
    conflict: false,
    summary: "running",
    worktree: "/repo/owner",
  };
  let stops = 0;
  let releases = 0;
  const dataDeletions = [];
  const worktreeRemovals = [];
  let batchStops = 0;
  const starts = [];
  const restarts = [];
  const handler = createSlotsHandler({
    repoDir: "/repo",
    token: "test-token",
    discover: async () => [record],
    stop: async () => {
      stops += 1;
      return "Slot 4 stopped.";
    },
    release: async () => {
      releases += 1;
      return "Slot 4 claim released.";
    },
    deleteData: async (request) => {
      dataDeletions.push(request);
      return "Slot 4 data deleted.";
    },
    remove: async (request) => {
      worktreeRemovals.push(request);
      return "Worktree removed.";
    },
    stopAll: async () => {
      batchStops += 1;
      return { stopped: [], skipped: [], failed: [] };
    },
    start: async (request) => starts.push(request),
    restart: async (request) => restarts.push(request),
    available: async () => [6, 7],
    logs: async () => "backend log",
  });
  const request = (method, url, headers = {}) =>
    new Promise((resolve) => {
      const response = {
        writeHead(status) {
          this.status = status;
        },
        end(body) {
          resolve({ status: this.status, body: JSON.parse(body) });
        },
      };
      handler(
        { method, url, headers: { host: "127.0.0.1:4317", ...headers } },
        response,
      );
    });

  const rejectedList = await request("GET", "/api/slots");
  assert.equal(rejectedList.status, 403);

  const listResponse = await request("GET", "/api/slots", {
    "x-dev-slots-token": "test-token",
  });
  assert.equal(listResponse.status, 200);
  assert.deepEqual(listResponse.body, {
    slots: [record],
    availableSlots: [6, 7],
  });

  const rejected = await request("POST", "/api/slots/owner/stop");
  assert.equal(rejected.status, 403);
  assert.equal(stops, 0);

  const accepted = await request("POST", "/api/slots/owner/stop", {
    "x-dev-slots-token": "test-token",
  });
  assert.equal(accepted.status, 200);
  assert.equal(stops, 1);

  const acceptedStopAll = await request("POST", "/api/slots/stop-all", {
    "x-dev-slots-token": "test-token",
  });
  assert.equal(acceptedStopAll.status, 200);
  assert.deepEqual(acceptedStopAll.body, {
    stopped: [],
    skipped: [],
    failed: [],
  });
  assert.equal(batchStops, 1);

  const rejectedRelease = await request("POST", "/api/slots/owner/release");
  assert.equal(rejectedRelease.status, 403);
  assert.equal(releases, 0);

  const acceptedRelease = await request("POST", "/api/slots/owner/release", {
    "x-dev-slots-token": "test-token",
  });
  assert.equal(acceptedRelease.status, 200);
  assert.equal(releases, 1);

  const acceptedDelete = await request(
    "POST",
    "/api/slots/owner/delete-data?confirmation=DELETE%20SLOT%204",
    { "x-dev-slots-token": "test-token" },
  );
  assert.equal(acceptedDelete.status, 200);
  assert.deepEqual(dataDeletions, [
    { id: "owner", confirmation: "DELETE SLOT 4", records: [record] },
  ]);

  const acceptedRemove = await request(
    "POST",
    "/api/slots/owner/remove-worktree?confirmation=REMOVE%20WORKTREE%204",
    { "x-dev-slots-token": "test-token" },
  );
  assert.equal(acceptedRemove.status, 200);
  assert.deepEqual(worktreeRemovals, [
    {
      id: "owner",
      confirmation: "REMOVE WORKTREE 4",
      records: [record],
      repoDir: "/repo",
    },
  ]);

  const rejectedStart = await request(
    "POST",
    "/api/slots/owner/start?slot=6&mode=e2e",
  );
  assert.equal(rejectedStart.status, 403);
  assert.equal(starts.length, 0);

  const acceptedStart = await request(
    "POST",
    "/api/slots/owner/start?slot=6&mode=e2e",
    { "x-dev-slots-token": "test-token" },
  );
  assert.equal(acceptedStart.status, 200);
  assert.deepEqual(starts[0], {
    id: "owner",
    targetSlot: 6,
    mode: "e2e",
    records: [record],
  });

  const acceptedRestart = await request(
    "POST",
    "/api/slots/owner/restart?mode=anonymisation",
    { "x-dev-slots-token": "test-token" },
  );
  assert.equal(acceptedRestart.status, 200);
  assert.equal(restarts[0].mode, "anonymisation");
});

test("slot UI rejects non-loopback hosts before serving its session token", async () => {
  const handler = createSlotsHandler({
    repoDir: "/repo",
    token: "test-token",
    discover: async () => [],
  });
  const response = await new Promise((resolve) => {
    const target = {
      writeHead(status) {
        this.status = status;
      },
      end(body) {
        resolve({ status: this.status, body });
      },
    };
    handler(
      { method: "GET", url: "/", headers: { host: "attacker.example" } },
      target,
    );
  });

  assert.equal(response.status, 403);
  assert.doesNotMatch(response.body, /test-token/);
});
