---
name: proportional-workflow
description: "Classify a non-trivial change (Standard or High-Risk) and derive its validation plan: failure-mode matrix, ownership trace, required checks, PR evidence. Load when a change alters behavior across layers, a public contract, persistent data, or a security boundary. Not for trivial edits — CLAUDE.md defines those and they need no classification."
---

# Proportional Workflow

Validation-first does not mean running every check for every change. Use the lightest workflow that produces credible evidence for the change's actual failure modes. Classify by blast radius, reversibility, and observability, not by diff size or urgency. A five-line authorization fix is High-Risk; a large isolated layout change is Fast Path.

If a change matches more than one level, use the highest. If it is unclear whether a change is Fast or Standard, use Standard. If uncertainty involves security, data integrity, infrastructure, or reversibility, use High-Risk.

## Step 0: honor the survey

CLAUDE.md requires a pre-implementation survey for non-trivial work. If the user chose a validation depth there, that choice is the classification; do not silently upgrade it. If you believe the chosen depth misses a High-Risk trigger, say so in one line and ask once before proceeding. In unattended runs (`linear-implement`, scheduled tasks) there is no survey; classify with the rules below.

## Classification checkpoint

Classify **before implementation**. Record the selected path and its trigger in the working notes and carry it into the PR description. Scan every High-Risk trigger explicitly; any match selects the High-Risk Path.

For Standard and High-Risk work, write a compact failure-mode matrix for the affected contract before changing behavior. Cover states and transitions that produce a materially different result, not only the happy path:

- unchanged and no-op requests;
- partial updates and omitted optional properties;
- create, change, remove, and remove-then-recreate lifecycles;
- validation failure and rollback or preservation of prior state;
- authorization, authentication, tenant, and provider variants that take different code paths;
- secrets or persisted values that must be preserved, cleared, masked, or invalidated.

Trace each relevant transition across the ownership path (UI, transport contract, application/domain logic, persistence, related per-user or organization data, caches) and assign an observable check to every credible failure mode. If a layer does not participate, say so rather than silently omitting it.

## Fast Path

Use when all of these hold:

- The change is isolated and easy to reverse.
- It does not alter a public contract, persistent data, security boundary, or cross-module interaction.
- Its behavior can be demonstrated with a focused check at one layer.
- It does not touch authentication, authorization, sharing, tenant boundaries, migrations, infrastructure, secrets, billing, or external-provider configuration.

Typical: documentation, copy, static styling, test-only maintenance, behavior-preserving refactors, narrow bug fixes with one understood failure mode.

Required:

1. For a behavior bug with a non-obvious cause, reproduce it with the smallest practical failing test first. Skip the reproduction when the cause is evident from the diff.
2. Run a focused test when behavior or test code changed, plus lint or type check on the changed files.
3. Render and inspect a visible UI change when automated checks cannot prove its result.
4. Inspect the final diff for unintended changes.

Not required: starting the full stack, broad suites, E2E when a lower layer proves the behavior, PR media, separate commits for mechanical steps. Run any of these only when it is the only credible way to test a failure mode.

## Standard Path

Default for ordinary features and behavior changes, including work spanning components or layers.

Required:

1. Define observable acceptance criteria; reproduce bugs before fixing them.
2. Use test-driven development for changed logic (load `test-driven-development`).
3. Run the relevant unit or integration tests.
4. Run lint and type-check or build for each affected package.
5. Add E2E coverage when a browser journey or system boundary changes and lower-level tests do not prove it (load `e2e`).
6. Capture PR media when it materially helps a reviewer evaluate a visible change (load `pr-media`).
7. Exercise the real runtime when the failure or changed behavior only exists there.

## High-Risk Path

Triggers: authentication, authorization, sharing, tenant isolation, migrations or data transformations, destructive or hard-to-reverse data operations, public API/schema contracts, security-sensitive input or secret handling, billing, infrastructure/CI/deployment, external-provider configuration, cross-module persistence, concurrency-sensitive background work, production incidents.

Required:

- Follow all applicable specialized skills and their safety checks.
- Include the classification trigger, failure-mode matrix, ownership trace, and validation evidence in the PR description.
- Validate configuration and integration behavior against the actual named environment.
- Exercise affected behavior end-to-end when it has a user-facing or system-boundary path.
- Run the full relevant validation suite, including distinct-principal tests for access control (below).
- Run a full affected-package type-check after changing a port, interface, DTO, generated contract, or other shared type boundary. Staged-file checks and transpile-only tests are not sufficient.
- Test destructive and omission-sensitive transitions at the system boundary, including removal followed by recreation when stale persisted data could reappear.
- Report the exact environment and commands used as evidence.

## Access-control and cross-user testing

Any change affecting sharing, permissions, visibility, organization scope, team scope, or resource access must be tested with distinct principals. A same-user test is not evidence that shared access works.

- Identify owner, grantor, recipient, and the organization/team boundaries before writing the test.
- Create the resource as the owner and authenticate the recipient through an independent user context.
- Preserve the causal order: assert denied first, apply the share or permission change second, assert allowed last.
- Exercise the API path that performs the access query and every affected user-facing surface (list pages, detail pages, pickers, workspace tabs).
- Assert externally observable results: response status and data, visibility, shared markers, user actions. Do not assert only that a helper was called.
- Keep E2E setup isolated and dynamically generated. Add a deterministic seed fixture when the scenario must be reproducible manually.
- The scenario is incomplete until the focused E2E test passes in CI. Record the exact command and environment when reporting.

## Feature flags

Every feature-gated change has two contracts: flag on and flag off. Flags resolve from `process.env` at boot, so mocking the guard proves wiring, not the disabled-state contract. A second instance started with the flag off is what proves it. Load `feature-toggles` for the recipe.

## Pull requests

The workflow level controls local validation breadth. Once a PR exists, `finish-pr` still applies: CI and Cursor Bugbot must be clean on the latest submitted revision.
