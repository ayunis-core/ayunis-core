---
name: linear-implement
description: Work a Linear ticket end-to-end — read it, mark it started, implement and validate it, submit and finish its PR unless local-only was requested, summarize the outcome, proactively suggest follow-up tickets, and mark it Done.
---

# Linear Implement

Take a Linear ticket and run with it. Generic entry point for "here's a ticket, handle it."

## Input

The user provides a Linear ticket ID (e.g. `AYC-123`) or URL. If one was mentioned earlier in the conversation, use that without asking again.

## Process

### 1. Read the ticket

```bash
linear issue view <ID> --json
```

Also pull in:

- **Parent issue** — if this ticket has a parent, read it too. The parent often carries the broader context, linked plan, or constraints that shape the work.
- **Comments** — `linear issue comment list <ID>` for clarifications or corrections added after the description.
- **Related / blocker issues** — scan relations in the JSON. Read blockers or closely related issues if they affect scope.

### 2. Understand the ask

Parse out:

- **Outcome** — what concrete change or deliverable is expected
- **Scope & non-scope** — what's explicitly in or out
- **Constraints** — referenced files, patterns, validation commands, acceptance criteria

If anything material is unclear or the premise looks off, stop and ask the user before starting. Don't invent scope.

### 3. Mark started

Move the ticket to the team's "started" state. **The state name is not the same
across teams** — see the per-team state-names table in the `manage-linear` skill
and use the team's actual started-state name. For AYC tickets this is
`"In Development"`, not `"In Progress"`:

```bash
# AYC ticket
linear issue update <ID> --state "In Development"

# Other teams (default until proven otherwise)
linear issue update <ID> --state "In Progress"
```

### 4. Execute

Do the work. This is deliberately open-ended — the ticket may ask for a code change, a migration, a document, a fix, research, a chore, etc.

- Follow the ticket's instructions and referenced patterns
- Use the right skills/tools for the job (e.g. `ayunis-core-backend`, `typeorm-migrations`, `code-review`, etc.)
- Classify the work using the repository's Proportional Workflow and run the corresponding validation
- Browser journey or system boundary changed without sufficient lower-level coverage? Load the `e2e` skill; done means the focused journey spec exists or is updated and runs green (`pnpm --filter ayunis-core-e2e test --grep "<feature>"`)
- If execution surfaces a blocker, a wrong premise, or a decision that needs the user, stop and surface it — don't plow through

### 5. Deliver code changes

Unless the user explicitly asks to keep changes local, code implementation includes delivery:

1. Load `git-workflow`, commit the validated logical change, and submit or update its Graphite PR. The ticket ID from this workflow is the commit's required ticket ID.
2. Use `e2e` for required durable browser-journey or system-boundary regression coverage when lower-level tests are insufficient.
3. Load `qa` when the user requests it or when PR-specific behaviors, visuals, or edge cases need live evidence beyond automated coverage. QA may supplement but does not replace required E2E coverage.
4. For visually meaningful frontend changes, capture the required QA views and load `pr-media` when publishing them materially helps review.
5. After the latest revision is submitted, load `finish-pr` and keep ownership until its completion gate passes.

Do not create ceremonial screenshots for backend-only or non-visual changes. QA findings, CI failures, and actionable Bugbot findings remain part of the same logical change and PR.

### 6. Summarize

Present a compact summary:

```text
<ID>: <title>

Done:
- <concrete change 1>
- <concrete change 2>

Validation: <tests/build/manual result, or "none applicable">
Deviations: <anything that differs from the original ask, or "none">
```

### 7. Surface follow-ups proactively

If the work surfaced anything worth tracking separately, name it and propose a ticket for each. Always propose first — only create with the user's approval.

Pick the right shape for each follow-up:

- **Sibling subtask** — if the current ticket is itself a subtask and the new work belongs to its parent, create a new subtask under that parent (`--parent <parent-of-current>`).
- **Child subtask** — if the new work is a clear piece of the current ticket, create a subtask under it (`--parent <currentID>`). Use `--state Backlog`.
- **New related ticket** — clearly related but independently deliverable. Create in the same team, then link it: `linear issue relation add <currentID> related <newID>`.
- **Blocker** — something that must happen before the current ticket can truly close. Create it, then `linear issue relation add <currentID> blocked-by <newID>`, and keep the current ticket In Progress.
- **Unrelated finding** — surface it, but route it to the right team/project.

Examples of what qualifies as a follow-up:

- Bugs spotted in adjacent code
- Refactor opportunities that were out of scope
- Missing tests or docs
- Implicit follow-up work that the ask hinted at but didn't cover
- Decisions that need broader input

If nothing qualifies, say so explicitly — don't manufacture follow-ups.

### 8. Close out

If validation and the applicable delivery steps pass and no blockers remain, move the ticket to Done. If the user explicitly requested review before closure, wait for that review first.

```bash
linear issue update <ID> --state "Done"
```

(`Done` is the standard closed-state name and currently shared across the AYC
team — check `manage-linear`'s per-team state-names table if working in a team
that diverges.)

If a blocker follow-up was created, leave the ticket in the started state and
call that out instead.

## Rules

### Ticket is the source of truth

The description (plus linked context) defines the scope. Don't silently expand — surface emergent work as a follow-up ticket.

### Propose before writing to Linear

Creating or linking follow-up tickets is an external action. Propose first; execute on approval. Moving the ticket being implemented to its started state and then to `Done` after the completion gate passes are routine parts of this workflow.

### Link what you create

When creating a follow-up, always add the right relation (`--parent`, `related`, `blocked-by`, `blocks`) so the thread isn't lost.

### Commit discipline

A request to implement a ticket authorizes committing and submitting its validated code changes through `git-workflow`. Keep changes local only when the user explicitly requests that. Never include unrelated working-tree changes.

### Follow existing patterns

When the ticket says "same pattern as X," go read X. Don't guess.
