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

Do NOT trust your own assessment of code correctness. Verify through observable behavior using the smallest set of checks that covers the change's credible failure modes. See **Proportional Workflow** below for the required depth and the development skills for surface-specific patterns.

### 2. Evidence Before Diagnosis

Principle 1 governs code you wrote. This one governs everything you *assert*: root causes, config values, provider behavior, "this is already fixed", "this should work".

- **Reproduce before diagnosing.** A "likely root cause" derived from reading code and config is not an answer. Reproduce the failure at the smallest layer where it is observable, then explain it. For runtime, configuration, or integration failures, passing unit tests are not a substitute for one live request against the actual configured environment.
- **Never recommend a config value you haven't verified.** An example value found in the repo (an API version, endpoint, model id) is not "the fix". Check it against current provider documentation and the deployed environment, or label it explicitly as unverified.
- **Name the environment.** Staging and production run different config and different model deployments. State which environment/app your evidence came from before drawing a conclusion; evidence from the wrong environment invalidates the whole analysis.
- **Report only failure modes the evidence supports.** Do not append extra suspected bugs or "regressions" inferred from general model knowledge to an incident report. If you have a hypothesis, label it as one to check — an unsupported claim presented alongside real findings costs more trust than it buys.
- **Check what the code does today before proposing a design.** When assessing a ticket in a known repo, read the current implementation and say what it actually does now, rather than reasoning from the ticket's description of intended behavior.

When an access path or tool fails, report the blocker immediately. Do not keep silently probing alternate routes — a named blocker is useful, a long invisible search is not.

### 3. Incremental Progress

- Make one logical change at a time
- Validate each logical change in proportion to its risk
- Commit after each validated logical change
- Never batch unrelated changes; do not create ceremonial commits for intermediate steps of one coherent change

### 4. Respect Boundaries

- Read the target module's SUMMARY.md before making changes
- Before adding a backend file, inspect the target layer's existing directories and two closest analogues. Place validation, orchestration, policy, domain invariants, and persistence in their established layer-specific locations; controllers only map validated HTTP input and orchestrate use cases.
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

### 9. Access-Control and Cross-User Testing

Any change that affects sharing, permissions, visibility, organization scope, team scope, or resource access must be tested with distinct principals. A same-user test is not evidence that shared access works.

- Identify the owner, grantor, recipient, and relevant organization/team boundaries before writing the test.
- Create the resource as the owner and authenticate the recipient through an independent user context.
- Assert the recipient cannot access the resource before the grant, then grant access and assert that the recipient can access it afterward.
- Exercise the API path that performs the access query and every affected user-facing surface, such as list pages, detail pages, pickers, or workspace tabs.
- Assert the externally observable result: response status and data, visibility, shared markers, and user actions. Do not test only that an internal query or helper was called.
- Keep the E2E setup isolated and dynamically generated. Add a deterministic seed fixture when the scenario must also be reproducible for manual testing.
- Treat the scenario as incomplete until the focused E2E test passes in CI. Record the exact command and environment when reporting verification.

For access-control regressions, the test must preserve the causal order: verify the denied state first, apply the share or permission change second, and verify the allowed state last. This prevents a test from passing because the resource was visible for an unrelated reason.

### 10. Proportional Workflow

Validation-first does not mean running every available check for every change. Use the lightest workflow that produces credible evidence for the change's actual failure modes. Classify by blast radius, reversibility, and observability — not by diff size, estimated effort, or urgency. A five-line authorization fix is high-risk; a larger isolated copy-and-layout change may use the Fast Path.

If a change matches more than one level, use the highest. If it is unclear whether an ordinary low-risk change qualifies for the Fast Path, use the Standard Path. If uncertainty involves security, data integrity, infrastructure, reversibility, or the boundary between Standard and High-Risk, use the High-Risk Path.

#### Fast Path

Use only when all of these are true:

- The change is isolated and easy to reverse.
- It does not alter a public contract, persistent data, security boundary, or cross-module interaction.
- Its behavior can be demonstrated with a focused check at one layer.
- It does not touch authentication, authorization, sharing, tenant boundaries, migrations, infrastructure, secrets, billing, or external-provider configuration.

Typical examples are documentation, copy, static styling, test-only maintenance, behavior-preserving refactors, and narrow bug fixes with one understood failure mode.

Required:

1. For a behavior bug, first reproduce it with the smallest practical failing test.
2. Run a focused test when behavior or test code changed, plus any lint or type check applicable to the changed files.
3. Render and inspect a visible UI change when automated checks cannot prove its result.
4. Inspect the final diff for unintended changes.

The Fast Path does **not automatically require** starting the full stack, broad package or repository suites, E2E coverage when a lower layer proves the behavior, PR media that adds no review value, or separate commits for mechanical steps within the same logical change. Run any of these when it is the only credible way to test a failure mode.

#### Standard Path

This is the default for ordinary features and behavior changes, including work that spans components or layers.

Required:

1. Define the observable acceptance criteria; reproduce bugs before fixing them.
2. Use test-driven development for changed logic or behavior.
3. Run the relevant unit or integration tests.
4. Run lint and type-check or build for each affected package.
5. Add E2E coverage when a browser journey or system boundary changes and lower-level tests do not sufficiently prove it.
6. Capture PR media when it materially helps a reviewer evaluate a visible change.
7. Exercise the real runtime when the reported failure or changed behavior only exists there.

#### High-Risk Path

Use for authentication, authorization, sharing, tenant isolation, migrations or data transformations, destructive or difficult-to-reverse data operations, public API/schema contracts, security-sensitive input or secret handling, billing, infrastructure/CI/deployment changes, external-provider configuration, cross-module persistence, concurrency-sensitive background work, and production incidents.

Required:

- Follow all applicable specialized skills and their safety checks.
- Validate configuration and integration behavior against the actual named environment.
- Exercise affected behavior end-to-end when it has a user-facing or system-boundary path.
- Run the full relevant validation suite, including distinct-principal tests for access control.
- Report the exact environment and commands used as evidence.

#### Pull Requests

The workflow level controls local implementation and validation breadth. It does not weaken **A Submitted PR Is Not Complete**: once a PR is created or updated, CI and Cursor Bugbot must still be clean on the latest submitted revision.

### 11. Feature Flags Have Two Contracts

Every feature-gated change must define and verify behavior with the flag both enabled and disabled. Identify existing workflows that share routes, controllers, navigation, services, or persisted state with the gated feature; disabling new entry points must not disable shared behavior unless that is explicitly part of the contract.

Flags resolve from `process.env` at boot, so mocking the guard or the config proves wiring, not the disabled-state contract — a second instance started with the flag off is what proves it. Load the `feature-toggles` skill for the two-state verification recipe.

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

Load the implementation skills for the files and surfaces being changed. Load validation workflow skills such as `e2e`, `pr-media`, or `qa` when required by the classification above, by a credible failure mode, or by the user's explicit request. Surface-specific safety rules remain mandatory; the proportional workflow controls the breadth of otherwise generic validation checklists.

---

## Communication

Investigation reports, PR summaries, and status write-ups are decision tools, not essays. Default to terse and findings-first:

- Lead with the answer or recommendation; the "why" goes underneath, not before.
- One tight line per item. For a batch (several PRs, tickets, or findings), give each a one-line verdict — e.g. *fix now / follow-up ticket / close* — rather than a multi-section prose block per item.
- Skip preamble, restated context, and multi-header scaffolding unless the depth was asked for.

Expand only on request. When the user wants more, they'll say so — then go deep.
