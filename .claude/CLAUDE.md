# AI Coding Agent Guidelines

> **Philosophy**: Code is opaque weights. Correctness is inferred from externally observable behavior.

For architecture overview and module navigation, see [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## Repository Overview

**Ayunis Core** is an open-source AI gateway enabling municipalities to run customizable AI assistants with multi-provider LLM support, tool integration, document retrieval (RAG), and organization-scoped access control.

```text
ayunis-core/
├── ayunis-core-backend/          # NestJS API server (hexagonal architecture)
├── ayunis-core-frontend/         # React SPA (Feature-Sliced Design)
├── ayunis-core-code-execution/   # Sandboxed code execution microservice
├── ayunis-core-anonymize/        # PII anonymization service
├── docker-compose.yml            # Local dev infrastructure
├── ARCHITECTURE.md               # Full architecture docs with module index
└── AGENTS.md                     # This file
```

---

## Match Effort to the Task

Most requests are small. Do not run a small request through the full delivery pipeline.

### Trivial

Copy, static styling, config or doc typos, a one-file fix with an obvious cause, test-only maintenance, renames.

Do: state the assumption in one line ("Treating as trivial: edit, lint, diff, no PR"), then make the edit, run the one relevant lint or focused test, inspect the diff, report. No survey, no classification, no failure-mode matrix, no reproduction test, no SUMMARY.md read, no commit, no PR. The user corrects the tier if it is wrong.

### Non-trivial

Behavior changes across layers, new features, anything touching a public contract, persistent data, or a security boundary.

Do: run the pre-implementation survey below, then load `proportional-workflow` and follow the path chosen. It owns the classification checkpoint, failure-mode matrix, access-control testing rules, and the two-state feature-flag contract.

### Pre-implementation survey

Before writing code for non-trivial work, or whenever the tier is ambiguous, ask one `AskUserQuestion` with three questions. Put your recommended option first and mark it "(Recommended)". Do not ask if the user's message already answers all three.

1. **Validation depth**: Fast (focused check, changed files only) / Standard (TDD, package tests, lint and type-check) / High-Risk (full suite, distinct-principal tests, environment evidence, PR evidence).
2. **Delivery**: Leave uncommitted (default) / Commit / Commit and open PR.
3. **Runtime verification**: None (tests, Storybook, or a rendered component are enough) / Reuse the running stack in this checkout / Start a new stack (worktree and slot). Recommend None for Fast, Reuse for Standard, and Start only when isolation or a different branch is needed. Name the slot you will use.

The runtime answer is binding. Do not create a worktree or run `./dev up` when the answer was None or Reuse, and say so if you later think runtime evidence is missing.

Skip the survey in unattended runs (`linear-implement`, scheduled tasks). There the ticket and the `proportional-workflow` rules decide, and delivery follows that skill's own contract.

### Delivery follows the survey

Leave changes uncommitted and report the diff unless the survey answer or the user's message asks to commit or open a PR. When a commit or PR is requested, load `git-workflow` first (Graphite only, never raw `git commit` or `git push`) and, after submitting, load `finish-pr` and keep ownership until CI and Cursor Bugbot are clean on the latest revision. Never report PR work as complete while checks are pending or actionable findings remain.

---

## Core Principles

### 1. Validation-first

Do not trust your own assessment of code correctness. Verify through observable behavior using the smallest set of checks that covers the change's credible failure modes.

### 2. Evidence before diagnosis

- **Reproduce before diagnosing.** For runtime, configuration, or integration failures, a root cause read from code is a hypothesis until reproduced at the smallest observable layer. Passing unit tests are not a substitute for one live request against the configured environment.
- **Never recommend a config value you haven't verified.** An example value in the repo is not the fix. Check it against provider docs and the deployed environment, or label it unverified.
- **Name the environment.** Staging and production differ. State where the evidence came from.
- **Report only what the evidence supports.** Label hypotheses as hypotheses. Do not pad reports with suspected bugs inferred from general knowledge.
- **Read what the code does today** before proposing a design from a ticket's description.
- **Report blockers immediately.** When an access path or tool fails, say so. Do not silently probe alternate routes.

### 3. Incremental progress

One logical change at a time, validated in proportion to its risk. Never batch unrelated changes. No ceremonial commits for intermediate steps of one coherent change.

### 4. Respect boundaries

- For non-trivial backend work, read the target module's SUMMARY.md and inspect the layer's two closest analogues before adding a file. Validation, orchestration, policy, domain invariants, and persistence go in their established layer; controllers only map validated input and orchestrate use cases.
- Cross-module application code uses the target module's exported use cases, not its ports or adapters. TypeORM records may reference other modules' records for foreign keys (see `typeorm-migrations`). Details in the `ayunis-core-backend` skill.
- Never edit generated code (e.g., the frontend API client).

### 5. No useless comments

Comment only what the code cannot say: a non-obvious constraint, ordering requirement, or why. Never restate a name or body, narrate the next line, or summarize a well-named class. If a comment would paraphrase the code, improve the naming instead.

### 6. Simplest sufficient solution

Lead with what a senior engineer would reach for. Prefer the library, pattern, or config that already solves the problem. When a fix keeps growing (extra parameters, watchdogs, budgets, plumbing), stop and name the tradeoff proactively. Often the right move is to challenge the constraint itself.

### 7. Absolute imports

New code uses path aliases, never parent traversal: `src/...` in the backend, `@/...` in the frontend. Same-directory `./sibling` imports are fine. The pre-commit ESLint run uses `--max-warnings=0`, so **any file you touch must have all of its `../` imports converted**. Don't rewrite files you aren't already changing.

### 8. Linear ticket state

For code-backed Linear issues, PR merge is not ticket completion. The merge integration moves the issue to the release-pending state (`Merged` for AYC); only the release process moves it to `Done`. Never set `Done` during implementation. Never reopen a completed issue without checking its state history first.

---

## Forbidden Actions

These rules exist because an agent violated them and caused data loss. They are non-negotiable.

### Stop only processes you can prove are ours

Processes that look like "just postgres" or "just ssh" may be Colima's infrastructure or SSH tunnels. Never `pkill` or `killall` by pattern. Never touch a process whose owner you have not established.

You may stop an Ayunis dev process without asking when one of these holds, in this order of preference:

1. `./dev down --slot N` run from the worktree that owns the slot. The script only stops its own pid-file processes and refuses foreign containers.
2. `scripts/qa-teardown.sh` for a worktree registered in `.dev/qa-worktrees`.
3. `docker compose -p ayunis-dev-N down` (never `-v`) when `./dev slots` shows no live worktree claims slot N.
4. `kill <PID>` (SIGTERM, then verify) when `./dev slots` diagnostics or `lsof -p <PID> -d cwd` show the process is a `node`, `nest`, `vite`, or `esbuild` process whose cwd is inside an `ayunis-core*` checkout or under `.git/wt/trash/`.

Report every PID, command, and cwd you stopped in the summary. For anything else, including a process with an unknown or deleted cwd that is not a trashed worktree, **describe the problem and ask**.

### Never use destructive Docker flags

Never `docker compose down -v`, `docker volume rm`, `docker system prune`, or anything that deletes volumes. Safe commands: `docker compose up` / `down` (without `-v`), `ps`, `logs`, `exec`.

### Never modify system or infrastructure state

Do not stop or restart Colima, edit Docker configs, change network settings, modify `/etc/hosts`, or touch anything outside the repository that isn't a source file.

### When the environment is broken, stop and ask

If Docker won't start, ports are occupied, or containers won't come up: **describe what you see and ask.** Do not diagnose or fix environment issues autonomously.

### General rule

If an action is irreversible and isn't writing or editing source code, **ask first**.

---

## Code Quality Enforcement

Enforced by ESLint, pre-commit hooks, and CI. Violations block commits and PRs.

- **Strict TypeScript.** Backend `strict: true`; frontend strict null checks.
- **`no-explicit-any: error`** in both packages. Use `unknown` or a specific type. If unavoidable (e.g., TypeORM pgvector), add a targeted `eslint-disable` with a justification.
- **sonarjs** recommended config in both packages. Cognitive complexity ≤ 15.
- **Complexity thresholds.** Cyclomatic complexity ≤ 10 and function length ≤ 50 lines block on changed files in pre-commit and in the CI `Complexity Check` workflow (`ayunis-core-backend/eslint.complexity.config.mjs`). `max-params` ≤ 5 is warn-only. Split functions that exceed the gated limits before committing. Keep the exclusion sets in `eslint.config.mjs` and `eslint.complexity.config.mjs` in sync.
- **File size limit.** 500 lines per file (excluding tests, migrations, records, generated code), enforced by `scripts/check-file-size.sh`.
- **No `console.*`.** Use NestJS `Logger` on the backend. `console.warn`/`console.error` are allowed in specific infrastructure code.
- **Circular dependency detection** via `madge` in pre-commit and CI.

---

## Development Skills

Load the implementation skill for the surface being changed (`ayunis-core-backend`, `ayunis-core-frontend-dev`, `use-case-reference`, `frontend-hook-reference`, etc.). Load `e2e`, `pr-media`, or `qa` when `proportional-workflow` requires them or the user asks. Surface-specific safety rules are mandatory; the effort tier controls the breadth of generic validation.

---

## Communication

Reports and summaries are decision tools, not essays.

- Lead with the answer or recommendation. The why goes underneath.
- One tight line per item. For a batch, give each a one-line verdict (fix now / follow-up / close).
- Skip preamble, restated context, and multi-header scaffolding unless depth was asked for.

Expand only on request.

### Final summary

Every task ends with this block and nothing after it. Use plain words a new team member would understand. Keep it under 150 words. Do not restate the request.

```text
**Done:** one sentence saying what the user can now do or rely on.
**Changed:** one bullet per file or behavior, in plain language, file names as links.
**Checked:** what was run and the result (tests, lint, CI, Bugbot). Say "not run" if something was skipped.
**PR:** Graphite link (https://app.graphite.com/github/pr/ayunis-core/ayunis-core/<number>), never the GitHub link. Omit if no PR.
**Open:** decisions or follow-ups that need the user. Omit if none.
```

Rules: no jargon, no code in prose, no numbers unless they change a decision, no closing offer.
