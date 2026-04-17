---
name: linear-build
description: Execute sub-issues from a Linear plan issue in reviewed batches. Reads sub-issues, identifies what's done, proposes the next batch, executes with validation, and marks sub-issues complete.
---

# Linear Build

Execute implementation steps stored as Linear sub-issues in reviewed batches. This is the third phase of the linear-plan → linear-implementation-plan → linear-build workflow.

## Input

The user provides a parent Linear issue ID, or says something like "next batch" / "continue building" when one is already in context.

If no ID is given, look for the plan issue referenced earlier in the conversation.

## Process

### 1. Read the plan

Load the parent issue with `linear issue view <ID> --json` to get the plan context (problem, solution, decisions, gotchas).

If the parent issue itself has a parent, read that too — it may contain broader context about why this work exists and constraints that apply.

Then list sub-issues to get the implementation steps. Use the GraphQL API to fetch sub-issues with their state:

```bash
linear api 'query($id: String!) { issue(id: $id) { children { nodes { id identifier title state { name type } sortOrder } } } }' --variable id=<UUID>
```

Get the parent's UUID from `linear issue view <ID> --json` first.

Sort sub-issues by `sortOrder` (ascending) to preserve the intended step sequence. Identify:

- **Completed steps** — state type is `completed` or `canceled`
- **In progress** — state type is `started`
- **Remaining steps** — state type is `unstarted` or `backlog`
- **Current position** — the first non-completed step

If all steps are complete, say so and stop.

### 2. Propose the batch

Determine the next logical batch of sub-issues. A batch is a group that:

- Are sequential from the current position (don't skip)
- Form a coherent unit of work that makes sense as a single pull request
- Tell a clear story in code review
- Don't split tightly coupled changes across batches (e.g., entity + migration, API + tests)
- Typically 1-3 steps, rarely more

Present the batch:

```text
Next batch:

- AYC-43: <title> (<scope summary>)
- AYC-44: <title> (<scope summary>)

This batch adds <what capability>. Good commit point after.
```

Proceed immediately to execution — don't wait for approval.

### 3. Execute

For each sub-issue in the batch, in order:

1. **Read the sub-issue** — `linear issue view <ID> --json` to load scope, creates/edits/deletes, validation commands, and DO NOT touch list
2. **Mark in progress** — `linear issue update <ID> --state "In Progress"`
3. **Execute the work** — create files, make edits, follow the sub-issue's instructions precisely
4. **Run validation** — execute the exact validation commands from the sub-issue description
5. **Stop on failure** — if validation fails, fix the issue. If the fix is non-trivial, present it to the user before continuing. Do not proceed to the next step with broken validation.
6. **Mark complete** — `linear issue update <ID> --state "Done"`

### 4. Report

After the batch is complete, present:

```text
Batch complete

Done:
- AYC-43: <title> — <what was done>
- AYC-44: <title> — <what was done>

Validation: all passing
Next up: <brief description of upcoming sub-issues>
```

If this batch represents a meaningful change (new capability, architectural milestone), suggest updating the context graph.

## Rules

### Respect scope boundaries

The sub-issue's **Scope** and **DO NOT touch** lines are hard constraints. Do not touch files outside the step's declared scope, even if it seems convenient.

### Don't batch across natural commit boundaries

If a sub-issue changes something risky (migration, public API change, config change), it should be the last in its batch so the user can review and commit before moving on.

### Commit only when instructed

If the caller explicitly tells you to commit (e.g., with a specific type and task ID), do so after validation passes. Otherwise, leave changes staged for review.

### Follow existing patterns

When a sub-issue says "same pattern as X," go read X. Don't guess what the pattern is.

### Sub-issue is the source of truth

Don't improvise beyond what the sub-issue specifies. If it's missing something, flag it — don't silently add scope. If the instructions conflict with what you see in the codebase, stop and ask.

### Emergent work

If execution surfaces work outside the current sub-issue's scope:

- **Small fix in scope** — handle it within the current step if it's in the declared scope
- **New sub-issue** — if it's clearly part of the parent plan, create a sub-issue on the parent and mention it in the report
- **Related but independent** — create a separate issue and link it with `linear issue relation add <parentID> related <newID>`
- **Blocking** — stop, create the issue, add a `blocks` relation, and inform the user

Do NOT silently expand scope. Surface it, link it, move on.
