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

Wait for all checks on every submitted PR:

```bash
gh pr checks <pr-number> --watch --interval 30
```

If no checks are visible immediately after submission, wait 30 seconds and query again. Do not interpret absent checks as success.

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
- Every CI check has completed successfully, or was intentionally skipped with a documented reason.
- Cursor Bugbot completed on the current head.
- All Bugbot comments across the submitted stack were triaged and no actionable finding remains.
- The local worktree is clean and the submitted branches contain every fix.

A polling timeout is not success. Continue waiting and provide occasional progress updates. Report **blocked**, never **done**, when authentication, infrastructure, or another external condition prevents verification.

If the same CI failure or Bugbot finding survives three fix attempts, stop and escalate with the attempts and evidence. New findings on successive revisions are progress and restart the count for those findings.

## Report

Report the PR URLs and concise evidence for CI and Bugbot status. Mention fixes made during the loop. If blocked, name the exact unfinished check or finding and the evidence that prevents further progress.
