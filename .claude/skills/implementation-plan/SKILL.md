---
name: implementation-plan
description: Plan repository work before implementation. Use when the user asks for a plan, design, implementation approach, or investigation before coding, or when the host is in plan mode. Do not use when the user asks to implement directly.
---

# Implementation Plan

Produce a decision-complete implementation plan grounded in the repository's current behavior. Planning is an opt-in phase, not a mandatory gate before ordinary execution.

## Boundaries

- Follow the Planning and Execution Modes contract in `CLAUDE.md`.
- Keep discovery read-only. Do not change repository or external state, including files, branches, worktrees, dependencies, services, tickets, commits, or PRs.
- Read applicable surface-specific skills to understand conventions, but do not perform their execution or delivery procedures.
- For Linear-backed work, read the issue, parent, comments, and relevant relations, but do not change its state or comments.
- Present the plan in the conversation unless the user asks for a plan artifact.

## Build the Plan

1. Establish the intended outcome, scope, non-scope, and acceptance criteria.
2. Inspect what the code does today, including the closest implementations and relevant tests. Do not plan from the ticket description alone.
3. Identify the affected ownership boundaries and trace the relevant path through UI, transport, application/domain logic, persistence, external providers, and caches. Explicitly note layers that do not participate.
4. Apply the Proportional Workflow from `CLAUDE.md`. State the provisional path and trigger, scan every High-Risk trigger, and build the applicable failure-mode matrix.
5. Resolve design decisions against demonstrated repository patterns. Surface a question only when the answer would materially change the plan.
6. Break implementation into ordered, independently verifiable logical changes. Name likely files or modules when the repository evidence supports them; do not invent exact files prematurely.
7. Map every credible failure mode to observable validation. Distinguish durable automated coverage, package checks, runtime or E2E evidence, QA, and delivery-only evidence such as CI or PR media.
8. Identify documentation, generated contracts, migrations, feature-toggle states, or release implications when applicable.

## Output

Lead with the recommended approach. Keep the plan proportional to the change, and include:

- outcome and current behavior;
- proposed design and affected boundaries;
- ordered implementation steps;
- workflow classification, failure modes, and validation;
- decisions, assumptions, and unresolved questions;
- delivery implications when relevant.

Use the host's plan-approval mechanism when available. Otherwise present the plan and stop for explicit implementation approval. Approval starts execution, not blind replay: recheck ticket and repository state, re-confirm the workflow classification, then load the applicable execution skills.
