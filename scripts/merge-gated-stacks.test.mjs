import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isWithinOfficeHours, runMergeJob } from "./merge-gated-stacks-lib.mjs";

// open-pull-requests.json is the GraphQL response for four open PRs: the
// stack #201 ← #202 with pr-gate success and green CI, the green PR #300 and
// the red PR #301, both never gated. stack.json is the REST stacks response
// for #201 and #202.
const fixture = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/merge-gated-stacks/${name}`, import.meta.url),
    ),
  );

const HUMAN = "Human: Should the memory page be behind the feature flag?";

function scenario() {
  const prs = fixture("open-pull-requests.json");
  const [stack] = fixture("stack.json");
  return { prs, stack, stacks: { 201: [stack], 202: [stack] }, merges: {} };
}

const pullRequest = (s, number) =>
  s.prs.repository.pullRequests.nodes.find((pr) => pr.number === number);
const headSha = (s, number) => pullRequest(s, number).headRefOid;
const commit = (s, number) => pullRequest(s, number).commits.nodes[0].commit;
const contexts = (s, number) =>
  commit(s, number).statusCheckRollup.contexts.nodes;

function setGate(s, number, state, description) {
  const gate = contexts(s, number).find((c) => c.context === "pr-gate");
  Object.assign(gate, { state, description });
}

function removeGate(s, number) {
  const nodes = contexts(s, number);
  nodes.splice(
    nodes.findIndex((c) => c.context === "pr-gate"),
    1,
  );
}

function addCheck(s, number, name, status, conclusion, app = "github-actions") {
  contexts(s, number).push({
    __typename: "CheckRun",
    name,
    status,
    conclusion,
    startedAt: "2026-11-17T09:20:00Z",
    checkSuite: {
      app: { slug: app },
      workflowRun:
        app === "github-actions"
          ? { workflow: { name: "Backend Tests" } }
          : null,
    },
  });
}

function addReview(s, number, login, state, oid, association = "MEMBER") {
  pullRequest(s, number).reviews.nodes.push({
    state,
    authorAssociation: association,
    author: { login },
    commit: { oid },
  });
}

function fakeGitHub(s) {
  const calls = [];
  return {
    calls,
    listOpenPullRequests: async () => structuredClone(s.prs),
    async findStacks(number) {
      calls.push(["findStacks", number]);
      return structuredClone(s.stacks[number] ?? []);
    },
    async setStatus(sha, status) {
      calls.push(["setStatus", sha, status]);
    },
    async mergeAsync(number, sha) {
      calls.push(["mergeAsync", number, sha]);
      return (
        s.merges[number]?.submit ?? {
          status: 202,
          body: { status: "pending", details: { uuid: `uuid-${number}` } },
        }
      );
    },
    async getMergeResult(number, uuid) {
      calls.push(["getMergeResult", number, uuid]);
      return (
        s.merges[number]?.poll ?? {
          status: "merged",
          details: { message: "", sha: "f".repeat(40) },
        }
      );
    },
  };
}

async function run(s, options = {}) {
  const github = fakeGitHub(s);
  const posts = [];
  const logs = [];
  await runMergeJob({
    github,
    slack: { post: async (message) => posts.push(message.text) },
    log: (line) => logs.push(line),
    runUrl: "https://github.com/ayunis-core/ayunis-core/actions/runs/1",
    pollIntervalMs: 0,
    ...options,
  });
  const writes = github.calls.filter(
    ([call]) => call === "setStatus" || call === "mergeAsync",
  );
  return { calls: github.calls, writes, posts, logs: logs.join("\n") };
}

test("merges a ready stack of two in one operation and posts both PRs", async () => {
  const s = scenario();
  const { calls, writes, posts } = await run(s);

  assert.deepEqual(writes, [["mergeAsync", 202, headSha(s, 202)]]);
  assert.equal(posts.length, 1);
  assert.match(
    posts[0],
    /<https:\/\/github\.com\/ayunis-core\/ayunis-core\/pull\/201\|#201 wip\(memory\): add the memory entity \(AYC-10\)>/,
  );
  assert.match(
    posts[0],
    /<https:\/\/github\.com\/ayunis-core\/ayunis-core\/pull\/202\|#202 feat\(memory\): add the memory settings page \(AYC-11\)>/,
  );
  assert.ok(
    !calls.some(([, number]) => number === 300 || number === 301),
    "ungated PRs are never looked at",
  );
});

const unmergedStacks = {
  "the upper PR has a Fix: verdict": (s) =>
    setGate(s, 202, "FAILURE", "Fix: 1 finding(s): missing guard test"),
  "the lower PR has a Human: verdict without approval": (s) =>
    setGate(s, 201, "FAILURE", HUMAN),
  "the Human: approval is on an older SHA": (s) => {
    setGate(s, 201, "FAILURE", HUMAN);
    addReview(s, 201, "sirolad", "APPROVED", "0".repeat(40));
  },
  "the Human: approval is by a non-member": (s) => {
    setGate(s, 201, "FAILURE", HUMAN);
    addReview(s, 201, "outsider", "APPROVED", headSha(s, 201), "CONTRIBUTOR");
  },
  "the Human: approval is by the job's own identity": (s) => {
    setGate(s, 201, "FAILURE", HUMAN);
    pullRequest(s, 201).author.login = "devbydaniel";
    addReview(s, 201, "ayunis-ai", "APPROVED", headSha(s, 201));
  },
  "the Human: approver later requested changes": (s) => {
    setGate(s, 201, "FAILURE", HUMAN);
    addReview(s, 201, "sirolad", "APPROVED", headSha(s, 201));
    addReview(s, 201, "sirolad", "CHANGES_REQUESTED", headSha(s, 201));
  },
  "a member requested changes on a passed PR": (s) =>
    addReview(s, 202, "sirolad", "CHANGES_REQUESTED", headSha(s, 202)),
  "the gate is still running": (s) => setGate(s, 202, "PENDING", "Running"),
  "the gate run errored": (s) => setGate(s, 201, "ERROR", "linear CLI failed"),
  "a check is pending": (s) =>
    addCheck(s, 201, "test (2)", "IN_PROGRESS", null),
  "a check failed": (s) => addCheck(s, 202, "test (2)", "COMPLETED", "FAILURE"),
  "Bugbot left unresolved findings": (s) =>
    addCheck(s, 202, "Cursor Bugbot", "COMPLETED", "NEUTRAL", "cursor"),
  "a workflow is queued without check runs": (s) =>
    commit(s, 201).checkSuites.nodes.push({
      status: "QUEUED",
      createdAt: "2026-11-17T09:20:00Z",
      app: { slug: "github-actions" },
      workflowRun: { workflow: { name: "E2E Tests" } },
    }),
  "the upper PR is a draft": (s) => {
    pullRequest(s, 202).isDraft = true;
  },
  "the upper PR was never gated": (s) => removeGate(s, 202),
};

for (const [condition, arrange] of Object.entries(unmergedStacks)) {
  test(`leaves the whole stack untouched when ${condition}`, async () => {
    const s = scenario();
    arrange(s);
    const { writes, posts, logs } = await run(s);

    assert.deepEqual(writes, []);
    assert.deepEqual(posts, []);
    assert.match(logs, /Not ready stack #200/);
  });
}

test("sets pr-gate success for a Human: verdict approved on its head, then merges the stack", async () => {
  const s = scenario();
  setGate(s, 201, "FAILURE", HUMAN);
  addReview(s, 201, "bugbot", "COMMENTED", headSha(s, 201), "NONE");
  addReview(s, 201, "sirolad", "APPROVED", headSha(s, 201));
  const { writes, posts } = await run(s);

  assert.deepEqual(writes, [
    [
      "setStatus",
      headSha(s, 201),
      {
        state: "success",
        context: "pr-gate",
        description: "Approved by sirolad",
        target_url:
          "https://github.com/ayunis-core/ayunis-core/pull/0#issuecomment-1",
      },
    ],
    ["mergeAsync", 202, headSha(s, 202)],
  ]);
  assert.equal(posts.length, 1);
});

test("never touches PRs without a pr-gate status and posts nothing", async () => {
  const s = scenario();
  removeGate(s, 201);
  removeGate(s, 202);
  const { calls, posts } = await run(s);

  assert.deepEqual(calls, []);
  assert.deepEqual(posts, []);
});

test("reports a rejected stack merge with its reason and still merges the next stack", async () => {
  const s = scenario();
  const single = structuredClone(pullRequest(s, 202));
  Object.assign(single, {
    number: 500,
    title: "fix(chat): keep <b>drafts</b> on reload (AYC-5)",
    url: "https://github.com/ayunis-core/ayunis-core/pull/500",
  });
  s.prs.repository.pullRequests.nodes.push(single);
  s.stacks[500] = [];
  s.merges[202] = {
    poll: {
      status: "failed",
      details: { message: "Pull request #201 has merge conflicts" },
    },
  };
  const { writes, posts } = await run(s);

  assert.deepEqual(
    writes.map(([call, number]) => [call, number]),
    [
      ["mergeAsync", 202],
      ["mergeAsync", 500],
    ],
  );
  assert.equal(posts.length, 1);
  assert.match(
    posts[0],
    /\*Merged after the PR gate\*\n• <[^|]+\|#500 fix\(chat\): keep &lt;b&gt;drafts&lt;\/b&gt; on reload/,
  );
  assert.match(
    posts[0],
    /\*Merge failed, retrying on the next run\*\n• Stack of 2 PRs:/,
  );
  assert.match(posts[0], /Reason: Pull request #201 has merge conflicts/);
});

test("reports a merge GitHub refuses to start", async () => {
  const s = scenario();
  s.merges[202] = {
    submit: {
      status: 405,
      body: { message: "Repository rule violations found" },
    },
  };
  const { posts } = await run(s);

  assert.match(posts[0], /Reason: Repository rule violations found/);
});

const changedStacks = {
  "a head moved since the check": (stack) => {
    stack.pull_requests[0].head.sha = "e".repeat(40);
  },
  "a PR was added on top since the check": (stack) => {
    stack.pull_requests.push({
      number: 203,
      state: "open",
      draft: false,
      merged_at: null,
      head: { ref: "ayc-12-memory-export", sha: "d".repeat(40) },
    });
  },
};

for (const [condition, change] of Object.entries(changedStacks)) {
  test(`skips the stack when ${condition}`, async () => {
    const s = scenario();
    const changed = structuredClone(s.stack);
    change(changed);
    s.stacks[202] = [changed];
    const { writes, posts, logs } = await run(s);

    assert.deepEqual(writes, []);
    assert.deepEqual(posts, []);
    assert.match(logs, /Skipped stack #200 .*the stack changed/);
  });
}

test("leaves a single PR alone that is not based on main", async () => {
  const s = scenario();
  const single = structuredClone(pullRequest(s, 202));
  Object.assign(single, { number: 500, baseRefName: "ayc-9-feature" });
  s.prs.repository.pullRequests.nodes = [single];
  const { writes, posts, logs } = await run(s);

  assert.deepEqual(writes, []);
  assert.deepEqual(posts, []);
  assert.match(logs, /base is ayc-9-feature/);
});

test("a dry run reports what it would do without writing or posting", async () => {
  const s = scenario();
  setGate(s, 201, "FAILURE", HUMAN);
  addReview(s, 201, "sirolad", "APPROVED", headSha(s, 201));
  const { writes, posts, logs } = await run(s, { dryRun: true, slack: null });

  assert.deepEqual(writes, []);
  assert.deepEqual(posts, []);
  assert.match(logs, /Would set pr-gate on #201: Approved by sirolad/);
  assert.match(logs, /Would merge stack #200 \(#201, #202\)/);
  assert.match(logs, /Would post to Slack:\n\*Merged after the PR gate\*/);
});

test("office hours are Mon–Fri 08:00–18:00 Berlin time in winter and summer", () => {
  const cases = {
    "2026-11-16T06:07:00Z": false, // Mon 07:07 CET
    "2026-11-16T07:07:00Z": true, // Mon 08:07 CET
    "2026-11-16T17:40:00Z": true, // Mon 18:40 CET, a delayed 18:00 run
    "2026-11-16T18:07:00Z": false, // Mon 19:07 CET
    "2026-07-13T06:07:00Z": true, // Mon 08:07 CEST
    "2026-07-13T16:07:00Z": true, // Mon 18:07 CEST
    "2026-07-13T17:07:00Z": false, // Mon 19:07 CEST
    "2026-11-21T10:07:00Z": false, // Sat
  };
  for (const [time, expected] of Object.entries(cases)) {
    assert.equal(isWithinOfficeHours(new Date(time)), expected, time);
  }
});
