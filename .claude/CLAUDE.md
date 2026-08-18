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

## Core Principles

### 1. Validation-First

Do NOT trust your own assessment of code correctness. Verify through observable behavior — lint, type-check, tests, and runtime. See the development skills below for specific validation sequences.

### 2. Evidence Before Diagnosis

Principle 1 governs code you wrote. This one governs everything you *assert*: root causes, config values, provider behavior, "this is already fixed", "this should work".

- **Reproduce before diagnosing.** A "likely root cause" derived from reading code and config is not an answer. Run the stack, trigger the failure, then explain it. Passing unit tests are not a substitute for one live request against the actual configured environment.
- **Never recommend a config value you haven't verified.** An example value found in the repo (an API version, endpoint, model id) is not "the fix". Check it against current provider documentation and the deployed environment, or label it explicitly as unverified.
- **Name the environment.** Staging and production run different config and different model deployments. State which environment/app your evidence came from before drawing a conclusion; evidence from the wrong environment invalidates the whole analysis.
- **Report only failure modes the evidence supports.** Do not append extra suspected bugs or "regressions" inferred from general model knowledge to an incident report. If you have a hypothesis, label it as one to check — an unsupported claim presented alongside real findings costs more trust than it buys.
- **Check what the code does today before proposing a design.** When assessing a ticket in a known repo, read the current implementation and say what it actually does now, rather than reasoning from the ticket's description of intended behavior.

When an access path or tool fails, report the blocker immediately. Do not keep silently probing alternate routes — a named blocker is useful, a long invisible search is not.

### 3. Incremental Progress

- Make one change at a time
- Validate after each change
- Commit after each validated change
- Never batch multiple logical changes

### 4. Respect Boundaries

- Read the target module's SUMMARY.md before making changes
- Respect module boundaries — the `ayunis-core-backend` skill documents how cross-module work is done (application-layer code uses exported use cases from the target module, not ports/adapters; TypeORM schema records may reference records in other modules to declare foreign-key relations — see the `typeorm-migrations` skill)
- Never edit generated code (e.g., the frontend API client)

### 5. No Useless Comments

Only write a comment when it states something the code cannot: a non-obvious constraint, ordering requirement, or "why" (e.g., why an event fires *before* a delete). Never write comments that restate the name or body of the thing they annotate ("Returns the ids of every thread owned by a user" on `findAllIdsByUserId`, "// Delete the thread" above `threadsRepository.delete(...)`), narrate what the next line does, or summarize a well-named class a reader can grasp at a glance. If a comment would just paraphrase the code, improve the naming instead and write nothing.

### 6. Simplest Sufficient Solution

Lead with the solution a senior engineer would reach for, not the first mechanism that occurs to you. Before building bespoke machinery, ask whether this is a standard, already-solved problem — reach for the library/pattern/config that solves it directly.

Watch for complexity creep. When a fix keeps growing — extra parameters, a watchdog, a budget, stall-reason plumbing — stop and name the tradeoff: *is the added complexity justified, or is a plainer approach enough?* Surface that question proactively rather than accreting machinery across iterations and waiting for the user to ask "is this worth it?". Often the right move is to challenge the constraint itself (e.g. "does a 300s ceiling even matter here?") instead of engineering around it.

### 7. A Submitted PR Is Not Complete

When work creates or updates a PR, submitting it is an intermediate step. Immediately load `finish-pr` and keep ownership until CI and Cursor Bugbot are clean on the latest submitted revision. Fix actionable findings, amend and resubmit, then repeat the verification loop. Never report PR work as complete while checks are pending or failing, Bugbot has not finished, or actionable findings remain. If verification is prevented by an external condition or the same finding survives three fix attempts, report the work as blocked with evidence instead of calling it done.

### 8. Absolute Imports

New code always uses the path aliases, never relative imports: `src/...` in the backend, `@/...` in the frontend. Both are configured in the respective `tsconfig.json`. Same-directory `./sibling` imports are fine; parent traversal (`../`) is not.

Enforced by `@typescript-eslint/no-restricted-imports` in both `eslint.config.mjs` files. It sits at `warn` so the pre-existing backlog stays visible without failing repo-wide lint, but the pre-commit staged ESLint run uses `--max-warnings=0` — so **any file you touch must have all of its `../` imports converted**, not just the lines you added. Don't go rewriting files you aren't already changing.

---

## Forbidden Actions

These rules exist because an agent violated them and caused data loss. They are non-negotiable.

### Never kill processes

You do not understand what is running on the host machine. Processes that look like "just postgres" or "just ssh" may be Colima's infrastructure, SSH tunnels, or other critical services. If a port is occupied or a process is blocking something, **describe the problem and ask** — never `kill`, `pkill`, or `killall`.

### Never use destructive Docker flags

Never use `docker compose down -v`, `docker volume rm`, `docker system prune`, or any command that deletes volumes. Volumes contain database data that cannot be restored. The only safe Docker commands are:

- `docker compose up` / `docker compose down` (without `-v`)
- `docker compose ps` / `docker compose logs`
- `docker compose exec` (to run commands inside containers)

### Never modify system or infrastructure state

Do not stop/restart Colima, edit Docker configs, change network settings, modify `/etc/hosts`, or touch anything outside the repository that isn't a source file.

### When the environment is broken, stop and ask

If Docker won't start, ports are occupied, containers won't come up, or anything infrastructure-related is failing: **describe what you see and ask for instructions.** Do not attempt to diagnose or fix environment issues autonomously. Every escalating "fix" risks making things worse.

### General rule

If an action is irreversible and isn't writing/editing source code, **ask first**.

---

## Code Quality Enforcement

The following rules are enforced by ESLint, pre-commit hooks, and CI. Violations block commits and PRs.

- **Strict TypeScript** — Backend uses `strict: true` (no implicit any, strict null checks, strict bind/call/apply). Frontend uses strict null checks.
- **`no-explicit-any: error`** — Both backend and frontend. Use `unknown` or specific types. If `any` is truly unavoidable (e.g., TypeORM pgvector), add a targeted `eslint-disable` comment with a justification.
- **sonarjs** — Both packages use `eslint-plugin-sonarjs` (recommended config). Cognitive complexity threshold: 15.
- **Complexity thresholds** — Enforced via ESLint (AST-accurate): cyclomatic complexity (`complexity`) ≤ 10 and function length (`max-lines-per-function`) ≤ 50 lines block on changed files, both in the pre-commit hook (the staged ESLint run uses `--max-warnings=0`) and in CI (the `Complexity Check` workflow runs `ayunis-core-backend/eslint.complexity.config.mjs` on the PR's changed backend files). The rules also live at `warn` in `eslint.config.mjs` so the repo-wide backlog stays visible without failing CI lint. `max-params` ≤ 5 is `warn`-only and not gated (NestJS DI constructors legitimately need >5 injected deps). If a function exceeds the gated limits, split it into smaller units before committing. Keep the exclusion sets in `eslint.config.mjs` and `eslint.complexity.config.mjs` in sync.
- **File size limit** — 500 lines per file (excluding tests, migrations, records, generated code). Enforced by `scripts/check-file-size.sh` in pre-commit.
- **No `console.*`** — Use NestJS `Logger` on the backend. `console.warn` and `console.error` are allowed in specific infrastructure code.
- **Circular dependency detection** — `madge` runs in pre-commit and CI.

---

## Development Skills

For detailed development workflows, patterns, and validation checklists, load the appropriate skill. Skills are listed with descriptions in the system prompt — pick the one that matches the task.

---

## Communication

Investigation reports, PR summaries, and status write-ups are decision tools, not essays. Default to terse and findings-first:

- Lead with the answer or recommendation; the "why" goes underneath, not before.
- One tight line per item. For a batch (several PRs, tickets, or findings), give each a one-line verdict — e.g. *fix now / follow-up ticket / close* — rather than a multi-section prose block per item.
- Skip preamble, restated context, and multi-header scaffolding unless the depth was asked for.

Expand only on request. When the user wants more, they'll say so — then go deep.
