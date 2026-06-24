---
name: linear-implement
description: Work a Linear ticket end-to-end — read it, mark In Progress, do the work, summarize, proactively suggest follow-up tickets, and mark Done.
---

# Linear Implement

Take a Linear ticket and run with it. Generic entry point for "here's a ticket, handle it."

## Input

Daniel provides a Linear ticket ID (e.g. `AYC-123`) or URL. If one was mentioned earlier in the conversation, use that without asking again.

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

If anything material is unclear or the premise looks off, stop and ask Daniel before starting. Don't invent scope.

### 3. Mark In Progress

```bash
linear issue update <ID> --state "In Progress"
```

### 4. Execute

Do the work. This is deliberately open-ended — the ticket may ask for a code change, a migration, a document, a fix, research, a chore, etc.

- Follow the ticket's instructions and referenced patterns
- Use the right skills/tools for the job (e.g. `ayunis-core-backend`, `typeorm-migrations`, `browser-verify`, `code-review`, etc.)
- Run validation (tests, build, lint, manual check) when applicable
- If execution surfaces a blocker, a wrong premise, or a decision that needs Daniel, stop and surface it — don't plow through

### 5. Summarize

Present a compact summary:

```text
<ID>: <title>

Done:
- <concrete change 1>
- <concrete change 2>

Validation: <tests/build/manual result, or "none applicable">
Deviations: <anything that differs from the original ask, or "none">
```

### 6. Surface follow-ups proactively

If the work surfaced anything worth tracking separately, name it and propose a ticket for each. Always propose first — only create on Daniel's approval.

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

### 7. Close out

If validation passes, no blockers remain, and Daniel is satisfied with the summary:

```bash
linear issue update <ID> --state "Done"
```

If a blocker follow-up was created, leave the ticket In Progress and call that out instead.

## Rules

### Ticket is the source of truth

The description (plus linked context) defines the scope. Don't silently expand — surface emergent work as a follow-up ticket.

### Propose before writing to Linear

Creating, linking, or closing tickets is an external action. Propose first; execute on approval. The only routine state changes this workflow performs without asking are moving the current ticket to `In Progress` at the start and to `Done` at the end (once Daniel has seen the summary).

### Link what you create

When creating a follow-up, always add the right relation (`--parent`, `related`, `blocked-by`, `blocks`) so the thread isn't lost.

### Commit discipline

If the work involves code changes, don't commit unless Daniel asks. Leave changes staged for review.

### Follow existing patterns

When the ticket says "same pattern as X," go read X. Don't guess.
