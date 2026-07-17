---
name: bugbot-triage
description: "Analyze Cursor Bugbot PR comments through a root-cause lens: is the finding valid, and is the suggested fix the real fix or a bandaid over a deeper problem? Use when the user asks to check, assess, or triage bugbot comments."
---

# Bugbot Triage

Bugbot findings are usually *locally* correct but *shallowly* scoped: it sees the flagged lines, not why the surrounding construct exists. Your job is not to confirm the finding — it is to decide what the finding is a **symptom of**. Never jump straight to applying bugbot's suggested fix.

## Fetching the Comments

Bugbot posts as `cursor[bot]`. Findings live in **inline review comments**; the PR body only carries its summary.

```bash
gh pr view --json number --jq .number   # if no PR number given
gh api repos/{owner}/{repo}/pulls/<number>/comments \
  --jq '.[] | select(.user.login == "cursor[bot]") | {path, line, body}'
```

Strip the HTML boilerplate (Fix-in-Cursor buttons, `BUGBOT_BUG_ID`); the substance is the severity line, the description, and the `LOCATIONS` block.

## The Triage Lens

Classify every finding into exactly one verdict:

1. **Invalid** — bugbot misread the code (wrong assumption about control flow, missed a guard, flagged intentional behavior). Requires evidence: cite the file:line that refutes it.
2. **Valid & simple** — the finding is self-contained and the suggested fix *is* the root-cause fix (a real off-by-one, a missing await, a wrong error type). Fix as suggested.
3. **Valid but symptom** — the finding is true, but it points at scaffolding whose *reason to exist* is gone or wrong. Applying the literal fix would polish code that should be deleted or redesigned. Propose the structural fix instead.

The default temptation is verdict 2. Most low-severity "dead code / needless indirection / unused parameter" findings are actually verdict 3 — dead code is rarely lonely; it usually signals a dead *contract*.

## Root-Cause Tracing (before settling on a verdict)

Work through these steps; stop early only for verdict 1:

1. **Read the whole flagged file**, not just the flagged lines. Understand what the construct's job is *now*, after the PR's changes.
2. **Trace every consumer across all packages** (backend, frontend, other services — `grep -rn` the identifiers, response-body fields, config keys). An unconsumed output means the contract, not just the parameter, is dead.
3. **Trace the stated purpose**: comments in the file, sibling files that reference it, module registrations, the PR description. Ask: *does the stated reason to exist still hold after this PR?* PRs that remove behavior routinely leave the scaffolding (helpers, flags, filters, rethrow branches, comments) standing.
4. **Find all coupling points** that would be affected by removing the construct entirely (registrations, filters/guards ordering, comments in other modules referencing it, tests asserting its output).
5. **Apply the structural test**: does deleting/redesigning the construct make the whole bug class *structurally impossible*, versus patching or testing around it? Prefer the fix where the vulnerable/dead code path no longer exists at all.

## Reporting

Report the assessment; do **not** implement a fix unless asked. Structure:

- **Verdict** first: valid/invalid, and simple vs. symptom. If symptom: one sentence naming the actual disease ("the finding is the symptom, not the disease").
- **Evidence** with `file:line` references for every claim — especially the consumer trace ("grepped both packages: only the filter and its spec reference these fields").
- **Root-cause fix** as a concrete numbered change list (what to delete, what registrations/comments/tests to update, what stays and why).
- **Caveats**: behavioral changes (e.g. response body shape), possible external consumers, test coverage that becomes moot.
- **Scope recommendation**: does the root-cause fix belong in the PR under review, or in a small stacked follow-up PR (keep security/feature fixes independently revertible; respect large-PR warnings)? If deferring, suggest replying to bugbot that the construct is removed in the follow-up.

If the honest answer is verdict 2, say so plainly and keep it short — not every finding hides a deeper problem, and inventing one is as wrong as missing one.
