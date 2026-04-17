---
name: linear-implementation-plan
description: Break a plan into Linear sub-issues as self-contained, testable implementation steps. Use when a feature spans multiple files/modules and needs careful sequencing.
---

# Linear Implementation Plan

This skill breaks a plan into sub-issues on a parent Linear issue, where every sub-issue is a self-contained unit that compiles, passes tests, and can be committed independently.

## Relationship to other skills

This is the second phase of a three-phase workflow:

1. **`linear-plan`** — research and create a plan issue (what and why)
2. **`linear-implementation-plan`** (this skill) — break it into sub-issues (how and in what order)
3. **`build`** — execute sub-issues in reviewed batches

## Input

The user provides a Linear issue ID (the plan issue), or says something like "break this into steps". Example: `/linear-implementation-plan AYC-42`

If no issue ID is given, look for the plan issue created earlier in this conversation.

## Process

### 1. Read the plan

Load the parent issue with `linear issue view <ID> --json`. Understand the problem, solution, key decisions, and gotchas.

If the issue has a parent, read that too — it may contain broader context about why this work exists and constraints that apply.

### 2. Research

Read the codebase to understand:

- What modules/files will be affected
- What the dependency graph looks like (what depends on what)
- What patterns exist that should be followed (look at analogous features)
- What the validation infrastructure is (test commands, lint, type-check, CI)

### 3. Clarify

If anything is ambiguous, ask before creating sub-issues. Don't guess at:

- Requirements or acceptance criteria
- Which existing patterns to follow
- Naming conventions
- Whether something is in scope or not

If everything is clear, say so and proceed.

### 4. Design the steps

Plan the sub-issues before creating them. Present the full breakdown to the user for approval:

```text
Implementation steps for AYC-42:

1. <title> — <scope summary>
2. <title> — <scope summary>
3. <title> — <scope summary>
...

Shall I create these as sub-issues?
```

**Wait for approval before creating sub-issues.**

### 5. Create sub-issues

For each step, create a sub-issue on the parent:

```bash
linear issue create \
  --team <TEAM> \
  --project <PROJECT> \
  --parent <PARENT-ID> \
  --title "Step N: <short title>" \
  --description-file <temp-file> \
  --no-interactive
```

#### Sub-issue description format

````markdown
**Scope:** ONLY `<exact directories and files this step may touch>`

## Creates
- `path/to/new-file.ts` — what and why

## Edits
- `path/to/existing-file.ts` — what changes and why

## Deletes
(if any)
- `path/to/old-file.ts` — why

## Tests
- What to test and how (specific commands, not vague "verify it works")

## Validation
```bash
<exact commands to run — e.g. npm run lint && npx tsc --noEmit && npm run test>
```

## DO NOT touch
`<explicit list of directories/files that are OFF LIMITS>`
````

### 6. Present

- List the created sub-issue IDs
- Summarize the implementation sequence
- Suggest running `build` to start execution

## Rules for designing steps

### Each step is a compilable checkpoint

After completing a step, the project MUST:

- Type-check cleanly (`tsc --noEmit` or equivalent)
- Pass linting
- Pass all tests (existing + new)
- Start/build without errors

If a step can't meet this bar on its own, it's scoped wrong. Restructure.

### Scope boundaries are hard walls

Every sub-issue has an explicit **Scope** line listing the ONLY files/directories it may create or edit. Everything else is off-limits.

Every sub-issue has a **DO NOT touch** line listing what's explicitly forbidden. This prevents premature cross-module changes.

A step must NEVER:

- Add imports for code that doesn't exist yet (will be created in a later step)
- Write stub/placeholder implementations "for later"
- Modify files belonging to another step's scope
- Create .backup files or temp files

### Dependencies flow forward, never backward

If step 5 needs something from step 3, step 3 must create it. Step 5 never reaches back to modify step 3's files.

### Stubs are forbidden

Do not create files with `// TODO: implement in step N` or `throw new Error('not implemented')`. If a file can't be fully functional in the current step, it doesn't belong in this step.

The one exception: if a step creates a use case that will be *called by* a later step, the use case itself must be complete and tested — only the *wiring* in the caller happens later.

### Test commands are explicit

Don't write "verify it works". Write:

```bash
npm run lint && npx tsc --noEmit && npm run test
```

### Don't spell out commands the agent already knows

If the executing agent has a skill for something (e.g., a migration skill), state the intent — don't hardcode CLI commands.

### Step granularity

- Too small: "add one import statement" — not worth a step
- Too large: "build the entire backend" — can't verify incrementally
- Right size: a logical unit that adds one capability, touches 1-3 modules, and can be validated independently

### Backend and frontend travel together

Don't build the entire backend first, then the entire frontend. Sequence steps so that each backend capability is followed by its frontend counterpart as soon as possible. Verify observable end-to-end functionality at every stage.

### Migration steps are always separate

Database migrations get their own step because:

- They have their own validation
- They're irreversible in shared environments
- They must match the record definitions exactly

A migration step modifies records and generates/runs the migration. It does NOT modify domain entities, mappers, or repositories — those are separate steps.

## Emergent work

During implementation planning, if you discover work that is outside the scope of the parent issue:

- **Related but independent** — create a separate issue with `linear issue relation add <parentID> related <newID>` and note it in the parent issue as a comment
- **Blocking dependency** — create the issue and add a `blocks` relation: `linear issue relation add <newID> blocks <parentID>`

Do NOT silently expand the scope of the parent issue. Surface it, link it, move on.
