---
name: finish-pr
description: "Complete the post-submit PR loop: wait for CI and Cursor Bugbot on the latest pushed revision, triage and fix actionable findings, amend and resubmit, and repeat until clean. MUST be used after creating or updating a PR before declaring implementation work complete."
---

# Finish PR

Treat PR submission as the start of verification, not the end of the task. Keep ownership of the PR until its latest submitted revision is green and Bugbot-clean.

## 1. Resolve the submitted PRs

Load `git-workflow` and follow its Graphite safety rules throughout this workflow.

Identify every PR whose branch was created or updated by the submission. For a Graphite stack, include every submitted PR in the stack, not only the current or top PR. Record each PR number, URL, branch, and remote head SHA:

```bash
gh pr view <branch-or-number> --json number,url,headRefName,headRefOid
```

Use the remote `headRefOid` as the revision under verification. If the remote head changes while waiting, discard the stale result and restart verification for the new SHA.

## 2. Wait for CI and Bugbot

Wait for all checks on every submitted PR. For an ordinary PR:

```bash
gh pr checks <pr-number> --watch --interval 30
```

### Graphite downstack sentinel — do not use `--watch`

On a stacked PR, Graphite deliberately keeps `Graphite / mergeability_check` in progress until every downstack PR merges. `gh pr checks --watch` waits for that sentinel forever even after all real verification has passed.

Before watching a stacked PR, inspect the check run on the recorded head SHA:

```bash
gh api repos/{owner}/{repo}/commits/<head-sha>/check-runs \
  --jq '.check_runs[] | select(.name == "Graphite / mergeability_check") |
    {status, conclusion, title: .output.title, summary: .output.summary}'
```

Treat it as an intentional pending sentinel **only** when its current-SHA output explicitly says that it will pass when downstack PRs merge (and names the downstack dependency). Do not ignore the check merely because its name contains `Graphite`; any other output or a failed conclusion requires investigation.

When the sentinel is confirmed, do not run `gh pr checks --watch` for that PR. Poll the JSON state instead and evaluate every check except that exact sentinel:

```bash
gh pr checks <pr-number> --json name,bucket,state,link
```

Continue while any non-sentinel check is pending; handle any non-sentinel failure or cancellation normally. Once all non-sentinel checks have passed or intentionally skipped, record the sentinel and its downstack PR in the verification report and continue to Bugbot comment triage. The sentinel is expected stack state, not a blocker and not evidence that CI is still running.

If no checks are visible immediately after submission, wait 30 seconds and query again. Do not interpret absent checks as success.

### Zero runs created — check the platform before the repo

If **no workflow runs exist at all** for the new head SHA after a couple of minutes, the cause is far more often platform-side than repo-side. Check that first, before diagnosing workflow triggers, branch filters, or re-pushing:

```bash
curl -s https://www.githubstatus.com/api/v2/summary.json \
  | jq '.components[] | select(.name == "Actions") | {name, status}'
gh run list --limit 10   # repo-wide: are other branches stuck too?
```

If Actions reports `degraded_performance` or `major_outage`, stop diagnosing the PR — go to the outage rule below. Runs that GitHub never created during an incident do not appear later on their own; they need a re-trigger *after* recovery.

## 2b. External platform outage — report blocked, do not camp on it

A confirmed platform incident is an **external condition**, which §5 already classifies as blocked. Blocked means hand back, not poll harder.

- **Do not** sit in escalating in-session sleep loops, background watchers, or self-scheduled wake-ups waiting for a provider to recover. Sessions have burned 2–6 hours this way, across multiple PRs on the same day, while the answer was always "GitHub is down."
- **Within ~1 hour** of confirming the incident, report the PR as blocked with the incident status and the exact SHA awaiting verification, and stop. Let the user decide whether to wait.
- **Never push a no-op or empty commit** to force a `synchronize` event. It pollutes the branch history with meaningless SHAs and discards any Bugbot pass already earned on the real head.
- **After recovery**, re-trigger with a same-SHA method so existing check results stay valid:

  ```bash
  gh pr close <pr-number> && gh pr reopen <pr-number>   # same SHA, re-fires triggers
  ```

  Do this **once**, and say in the report that you did it — closing and reopening is a visible mutation of PR state, not a silent recovery step. If it does not produce runs, report blocked rather than repeating it.

The same applies to any external provider the loop depends on (Bugbot, the registry, Linear). Verify the incident is real before invoking this rule — a single failed check is not an outage.

After the watch completes, inspect the final state explicitly:

```bash
gh pr checks <pr-number> --json name,bucket,state,link
```

Treat `pending`, `fail`, and `cancel` buckets as unfinished. A skipped check is acceptable only when the workflow intentionally skipped it; mention that in the final report.

Do not trust Cursor Bugbot's check conclusion by itself. A successful Bugbot check can still leave review comments.

## 3. Address CI failures

For each failing or cancelled check:

1. Read the check details, annotations, and failed GitHub Actions logs. Use `gh run view <run-id> --log-failed` for Actions failures.
2. Classify the failure before changing code:
   - **PR-caused and actionable**: fix it in the existing PR.
   - **Flaky or cancelled**: rerun it once, then wait for the rerun.
   - **Infrastructure failure or demonstrably failing on the base revision**: gather evidence and report the PR as blocked; do not broaden the PR silently.
3. Run the relevant local validation for any code change.
4. Amend and resubmit with the process in `git-workflow`.

After any resubmission, refresh every affected PR's remote head SHA and restart the full CI and Bugbot loop. Results from the previous SHA no longer count.

## 4. Address Bugbot findings

Load `bugbot-triage` and use its paginated comment fetching, full-stack scan, root-cause tracing, and verdicts. Do not recreate a shallower Bugbot review here.

The implementation request that produced the PR authorizes fixes for actionable CI and Bugbot findings that stay within the PR's scope:

- **Valid and simple**: implement the direct root-cause fix.
- **Valid but symptom**: implement the structural fix recommended by the triage, unless that would materially expand the requested scope; if it would, stop and explain the decision needed.
- **Invalid**: record the evidence, reply when useful, and resolve the thread if permitted.

For valid findings, amend the existing PR rather than creating a separate fix PR. Resolve addressed threads when permitted. Resubmit and restart verification on the new head SHA.

## 5. Completion gate

Do not declare the task complete until all of these are true for every submitted PR:

- The recorded remote head SHA is still the PR's current head.
- Every CI check has completed successfully or was intentionally skipped with a documented reason; a current-SHA Graphite downstack sentinel verified as described in §2 is also acceptable and must be documented.
- Cursor Bugbot completed on the current head.
- All Bugbot comments across the submitted stack were triaged and no actionable finding remains.
- The local worktree is clean and the submitted branches contain every fix.

A polling timeout is not success. Report **blocked**, never **done**, when authentication, infrastructure, or another external condition prevents verification.

"Keep waiting" applies to checks that are *running* — queued jobs, a slow test suite, a Bugbot pass in flight. It does **not** license open-ended polling when nothing is running because the platform is down: that is the blocked case, and §2b governs it. If you have polled the same unchanged external condition more than a few times, you are no longer verifying — report and hand back.

If the same CI failure or Bugbot finding survives three fix attempts, stop and escalate with the attempts and evidence. New findings on successive revisions are progress and restart the count for those findings.

## Report

Report the PR URLs and concise evidence for CI and Bugbot status. Mention fixes made during the loop. If blocked, name the exact unfinished check or finding and the evidence that prevents further progress.
