export const GATE_CONTEXT = "pr-gate";

// Graphite is no longer used, but its legacy check still appears on PRs and
// never completes.
const IGNORED_WHEN_PENDING = new Set(["Graphite / mergeability_check"]);
const PASSING_CONCLUSIONS = new Set(["SUCCESS", "SKIPPED"]);
const PENDING_STATUS_STATES = new Set(["PENDING", "EXPECTED"]);
const MEMBER_ASSOCIATIONS = new Set(["MEMBER", "OWNER"]);
// COMMENTED reviews don't change a reviewer's decision; a dismissal withdraws it.
const DECISIVE_REVIEW_STATES = new Set([
  "APPROVED",
  "CHANGES_REQUESTED",
  "DISMISSED",
]);

export const OPEN_PULL_REQUESTS_QUERY = `
query($owner: String!, $name: String!, $cursor: String) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name }
    pullRequests(states: OPEN, first: 25, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url isDraft baseRefName headRefOid
        author { login }
        reviews(last: 100) {
          pageInfo { hasPreviousPage }
          nodes { state authorAssociation author { login } commit { oid } }
        }
        commits(last: 1) {
          nodes {
            commit {
              oid
              checkSuites(first: 50) {
                nodes { status createdAt app { slug } workflowRun { workflow { name } } }
              }
              statusCheckRollup {
                contexts(first: 100) {
                  pageInfo { hasNextPage }
                  nodes {
                    __typename
                    ... on CheckRun {
                      name status conclusion startedAt
                      checkSuite { app { slug } workflowRun { workflow { name } } }
                    }
                    ... on StatusContext { context state description targetUrl createdAt }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

// Office hours are Mon–Fri 08:00–18:00 Europe/Berlin. The cron covers the UTC
// hours of both CET and CEST, so scheduled runs drop the extra hour here.
export function isWithinOfficeHours(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday").value;
  const hour = Number(parts.find((part) => part.type === "hour").value);
  return weekday !== "Sat" && weekday !== "Sun" && hour >= 8 && hour <= 18;
}

export function normalizePullRequest(node) {
  const commit = node.commits.nodes[0]?.commit;
  const rollup = commit?.statusCheckRollup?.contexts;
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    isDraft: node.isDraft,
    baseRefName: node.baseRefName,
    headSha: node.headRefOid,
    author: node.author?.login ?? null,
    contexts: rollup?.nodes ?? [],
    contextsComplete: !rollup?.pageInfo.hasNextPage,
    checkSuites: commit?.checkSuites?.nodes ?? [],
    reviews: node.reviews.nodes,
    reviewsComplete: !node.reviews.pageInfo.hasPreviousPage,
  };
}

export function gateStatus(pr) {
  return (
    pr.contexts.find(
      (context) =>
        context.__typename === "StatusContext" &&
        context.context === GATE_CONTEXT,
    ) ?? null
  );
}

function checkKey(context) {
  if (context.__typename === "StatusContext")
    return `status:${context.context}`;
  const suite = context.checkSuite;
  const group = suite?.workflowRun?.workflow?.name ?? suite?.app?.slug ?? "";
  return `check:${group}:${context.name}`;
}

function startedAt(context) {
  const timestamp = context.startedAt ?? context.createdAt;
  return timestamp ? Date.parse(timestamp) : Number.MAX_SAFE_INTEGER;
}

// The rollup keeps superseded runs, e.g. the failed PR title check from before
// a title edit. Like the PR's checks tab, only the newest run of a check counts.
export function latestChecks(contexts) {
  const seen = new Set();
  return [...contexts]
    .sort((a, b) => startedAt(b) - startedAt(a))
    .filter((context) => {
      const key = checkKey(context);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function checkProblem(name, state, pending) {
  if (pending && IGNORED_WHEN_PENDING.has(name)) return null;
  return `check "${name}" is ${state.toLowerCase()}`;
}

function describeCheck(context) {
  if (context.__typename === "StatusContext") {
    if (context.context === GATE_CONTEXT || context.state === "SUCCESS")
      return null;
    return checkProblem(
      context.context,
      context.state,
      PENDING_STATUS_STATES.has(context.state),
    );
  }
  if (context.status !== "COMPLETED")
    return checkProblem(context.name, context.status, true);
  if (PASSING_CONCLUSIONS.has(context.conclusion)) return null;
  return checkProblem(context.name, context.conclusion, false);
}

// A workflow run waiting for its concurrency group or for approval of a fork
// PR has no check runs yet, so only its check suite shows that CI hasn't run.
// A run that was never approved stays queued after a newer run of the same
// workflow completed, so only the newest suite per workflow counts.
function pendingWorkflows(pr) {
  const newest = new Map();
  for (const suite of pr.checkSuites) {
    if (suite.app?.slug !== "github-actions") continue;
    const workflow = suite.workflowRun?.workflow?.name ?? "unknown";
    const known = newest.get(workflow);
    if (!known || Date.parse(suite.createdAt) > Date.parse(known.createdAt)) {
      newest.set(workflow, suite);
    }
  }
  return [...newest]
    .filter(([, suite]) => suite.status !== "COMPLETED")
    .map(
      ([workflow, suite]) =>
        `workflow "${workflow}" is ${suite.status.toLowerCase()}`,
    );
}

export function checkProblems(pr) {
  if (!pr.contextsComplete) return ["more than 100 checks, not evaluated"];
  return [
    ...latestChecks(pr.contexts).map(describeCheck).filter(Boolean),
    ...pendingWorkflows(pr),
  ];
}

function latestDecisiveReviews(reviews) {
  const byReviewer = new Map();
  for (const review of reviews) {
    if (review.author && DECISIVE_REVIEW_STATES.has(review.state)) {
      byReviewer.set(review.author.login, review);
    }
  }
  return [...byReviewer.values()];
}

function reviewProblems(pr) {
  if (!pr.reviewsComplete) return ["more than 100 reviews, not evaluated"];
  return latestDecisiveReviews(pr.reviews)
    .filter((review) => review.state === "CHANGES_REQUESTED")
    .map((review) => `changes requested by ${review.author.login}`);
}

// The job's own identity is excluded: it is the account agents run as, and an
// agent must never be able to answer a gate question on a human's behalf.
export function approverOnHead(pr, viewerLogin) {
  const approval = latestDecisiveReviews(pr.reviews).find(
    (review) =>
      review.state === "APPROVED" &&
      review.commit?.oid === pr.headSha &&
      MEMBER_ASSOCIATIONS.has(review.authorAssociation) &&
      review.author.login !== pr.author &&
      review.author.login !== viewerLogin,
  );
  return approval?.author.login ?? null;
}

function gateProblems(gate, approvedBy, headSha) {
  if (!gate) return ["no pr-gate status"];
  if (gate.state === "SUCCESS") return [];
  const description = gate.description ?? "";
  if (gate.state === "FAILURE" && description.startsWith("Human:")) {
    return approvedBy
      ? []
      : [
          `pr-gate "${description}" needs an approval on ${headSha.slice(0, 9)}`,
        ];
  }
  return [`pr-gate is ${gate.state.toLowerCase()}: "${description}"`];
}

export function assessPullRequest(pr, viewerLogin) {
  const gate = gateStatus(pr);
  const humanVerdict =
    gate?.state === "FAILURE" && gate.description?.startsWith("Human:");
  const approvedBy = humanVerdict ? approverOnHead(pr, viewerLogin) : null;
  const reasons = [
    ...(pr.isDraft ? ["draft"] : []),
    ...gateProblems(gate, approvedBy, pr.headSha),
    ...checkProblems(pr),
    ...reviewProblems(pr),
  ];
  return { pr, gate, approvedBy, ready: reasons.length === 0, reasons };
}

function stackFromApi(apiStack) {
  return {
    number: apiStack.number,
    base: apiStack.base.ref,
    members: apiStack.pull_requests.map((member) => ({
      number: member.number,
      open: member.state === "open",
      merged: Boolean(member.merged_at),
      headSha: member.head.sha,
    })),
  };
}

function singleStack(pr) {
  return {
    number: null,
    base: pr.baseRefName,
    members: [
      { number: pr.number, open: true, merged: false, headSha: pr.headSha },
    ],
  };
}

export function planStack(stack, { prsByNumber, defaultBranch, viewerLogin }) {
  const reasons = [];
  if (stack.base !== defaultBranch) reasons.push(`base is ${stack.base}`);
  const assessments = [];
  for (const member of stack.members) {
    if (member.merged) continue;
    const pr = prsByNumber.get(member.number);
    if (!member.open || !pr) {
      reasons.push(`#${member.number} is closed`);
      continue;
    }
    const assessment = assessPullRequest(pr, viewerLogin);
    assessments.push(assessment);
    reasons.push(...assessment.reasons.map((r) => `#${pr.number}: ${r}`));
  }
  return {
    stack,
    assessments,
    ready: reasons.length === 0 && assessments.length > 0,
    reasons,
  };
}

async function collectStacks(github, gatedPrs) {
  const covered = new Set();
  const stacks = [];
  for (const pr of gatedPrs) {
    if (covered.has(pr.number)) continue;
    const [apiStack] = await github.findStacks(pr.number);
    const stack = apiStack ? stackFromApi(apiStack) : singleStack(pr);
    for (const member of stack.members) covered.add(member.number);
    stacks.push(stack);
  }
  return stacks;
}

function describeStack(plan) {
  const numbers = plan.stack.members
    .filter((member) => !member.merged)
    .map((member) => `#${member.number}`)
    .join(", ");
  return plan.stack.number === null
    ? numbers
    : `stack #${plan.stack.number} (${numbers})`;
}

// Between the check and the merge, a push or a new PR on top would make the
// merge include unchecked commits or leave a prefix of the stack behind.
function stackChanged(plan, currentStack) {
  const current = stackFromApi(currentStack)
    .members.filter((member) => !member.merged)
    .map((member) => `${member.number}@${member.headSha}`);
  const checked = plan.assessments.map(
    ({ pr }) => `${pr.number}@${pr.headSha}`,
  );
  return current.join(" ") !== checked.join(" ");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function awaitMerge(github, top, initial, { pollIntervalMs, maxPolls }) {
  let result = initial;
  for (let poll = 0; result.status === "pending" && poll < maxPolls; poll++) {
    await sleep(pollIntervalMs);
    result = await github.getMergeResult(top.number, result.details.uuid);
  }
  if (result.status === "merged" || result.status === "enqueued") return null;
  if (result.status === "pending")
    return "GitHub was still merging when the job stopped waiting; check the PRs";
  return result.details?.message || `merge ${result.status}`;
}

// The async merge of the top PR merges it and every open PR below it in one
// all-or-nothing operation. It is the API `gh stack merge <top-pr> --yes`
// calls, and it merges single PRs too. `sha` makes GitHub cancel the merge if
// the top PR is pushed meanwhile.
async function mergeTop(github, top, options) {
  const response = await github.mergeAsync(top.number, top.headSha);
  if (response.status !== 200 && response.status !== 202) {
    return response.body?.message || `HTTP ${response.status}`;
  }
  return awaitMerge(github, top, response.body, options);
}

async function approveGates(github, plan, { dryRun, log }) {
  for (const { pr, gate, approvedBy, reasons } of plan.assessments) {
    if (!approvedBy || reasons.length > 0) continue;
    const description = `Approved by ${approvedBy}`;
    log(
      `${dryRun ? "Would set" : "Setting"} pr-gate on #${pr.number}: ${description}`,
    );
    if (dryRun) continue;
    await github.setStatus(pr.headSha, {
      state: "success",
      context: GATE_CONTEXT,
      description,
      target_url: gate.targetUrl ?? undefined,
    });
  }
}

async function mergeStack(github, plan, context) {
  const top = plan.assessments.at(-1).pr;
  if (plan.stack.number !== null) {
    const [current] = await github.findStacks(top.number);
    if (!current || stackChanged(plan, current)) {
      return {
        outcome: "skipped",
        reason: "the stack changed since it was checked",
      };
    }
  }
  if (context.dryRun) return { outcome: "merged" };
  const reason = await mergeTop(github, top, context);
  return reason ? { outcome: "failed", reason } : { outcome: "merged" };
}

async function processStack(github, stack, context) {
  const plan = planStack(stack, context);
  await approveGates(github, plan, context);
  if (!plan.ready) return { plan, outcome: "not ready", reasons: plan.reasons };
  return { plan, ...(await mergeStack(github, plan, context)) };
}

function logResult({ plan, outcome, reason, reasons }, { dryRun, log }) {
  const label = describeStack(plan);
  if (outcome === "not ready")
    log(`Not ready ${label}:\n  ${reasons.join("\n  ")}`);
  else if (outcome === "merged")
    log(`${dryRun ? "Would merge" : "Merged"} ${label}`);
  else
    log(
      `${outcome === "failed" ? "Merge failed" : "Skipped"} ${label}: ${reason}`,
    );
}

function escapeSlack(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function prLines(plan, indent) {
  return plan.assessments.map(
    ({ pr }) => `${indent}• <${pr.url}|#${pr.number} ${escapeSlack(pr.title)}>`,
  );
}

function stackLines(plan) {
  if (plan.assessments.length === 1) return prLines(plan, "");
  return [
    `• Stack of ${plan.assessments.length} PRs:`,
    ...prLines(plan, "    "),
  ];
}

export function formatSlackMessage({ merged, failed, runUrl }) {
  const lines = [];
  if (merged.length > 0) {
    lines.push("*Merged after the PR gate*");
    for (const { plan } of merged) lines.push(...stackLines(plan));
  }
  if (failed.length > 0) {
    lines.push("*Merge failed, retrying on the next run*");
    for (const { plan, reason } of failed) {
      lines.push(...stackLines(plan), `    Reason: ${escapeSlack(reason)}`);
    }
  }
  if (runUrl) lines.push(`<${runUrl}|Workflow run>`);
  return { text: lines.join("\n") };
}

export async function runMergeJob({
  github,
  slack,
  dryRun = false,
  log = console.log,
  runUrl = null,
  pollIntervalMs = 5000,
  maxPolls = 120,
}) {
  const data = await github.listOpenPullRequests();
  const prs = data.repository.pullRequests.nodes.map(normalizePullRequest);
  const context = {
    prsByNumber: new Map(prs.map((pr) => [pr.number, pr])),
    defaultBranch: data.repository.defaultBranchRef.name,
    viewerLogin: data.viewer.login,
    dryRun,
    log,
    pollIntervalMs,
    maxPolls,
  };
  const gated = prs.filter((pr) => gateStatus(pr) !== null);
  log(`${prs.length} open PRs, ${gated.length} with a pr-gate status`);

  const results = { merged: [], failed: [] };
  for (const stack of await collectStacks(github, gated)) {
    const result = await processStack(github, stack, context).catch(
      (error) => ({
        plan: planStack(stack, context),
        outcome: "failed",
        reason: error.message,
      }),
    );
    logResult(result, context);
    if (result.outcome === "merged") results.merged.push(result);
    if (result.outcome === "failed") results.failed.push(result);
  }

  if (results.merged.length === 0 && results.failed.length === 0) {
    log("Nothing merged or failed, not posting to Slack");
    return results;
  }
  const message = formatSlackMessage({ ...results, runUrl });
  if (dryRun) log(`Would post to Slack:\n${message.text}`);
  else await slack.post(message);
  return results;
}
