---
name: linear-plan
description: Research a task and create a Linear issue as the plan instead of a file. Use when you need to think before doing in a Linear-tracked project.
---

# Linear Plan

When this skill is active, you are **planning, not executing**. Do not make any changes to code, config, or project files.

This is the first phase of a three-phase workflow:

1. **`linear-plan`** (this skill) — research and create a plan as a Linear issue (what and why)
2. **`linear-implementation-plan`** — break it into sub-issues (how and in what order)
3. **`build`** — execute sub-issues in reviewed batches

If the task warrants step-by-step execution, suggest following up with the `linear-implementation-plan` skill after the plan is approved.

## Input

The user provides a task description after `/linear-plan`. Example: `/linear-plan refactor the auth module to use JWT`

An existing Linear issue ID may also be provided. In that case, read it and use it as the plan issue — skip to the Present step.

## Steps

### 1. Orient

- Read relevant files to understand the current state
- Check compass files if the task relates to goals or ongoing work
- Check references if the task involves people, products, or projects
- Look at existing code, config, or notes that would be affected

### 2. Clarify

- If anything is ambiguous, **ask before writing the plan**
- Don't guess at requirements — surface assumptions and get confirmation
- Keep questions focused: what you need to know to write a precise plan, nothing more
- If everything is clear, skip this step and say so

### 3. Create the Linear issue

Use `manage-linear` to create the plan issue. The issue description IS the plan.

```bash
linear issue create \
  --team <TEAM> \
  --project <PROJECT> \
  --title "Plan: <concise title>" \
  --description-file <temp-file> \
  --no-interactive
```

Write the description to a temp file first (for markdown formatting), then pass via `--description-file`.

#### Description format

```markdown
## Problem

What we're solving and why. 2-4 sentences max.

## Solution

Step-by-step outline of the approach. Precise enough that someone with no prior context
can execute it, but not so detailed that it's pseudocode. Think "senior dev handoff."

Include:
- Key decisions and why (not just what)
- Architecture or structural choices
- Edge cases or gotchas worth flagging
- Pointers to relevant files, docs, or context (full paths) so the executor can
  quickly load what they need without re-doing the research

Do NOT include a file changes list — that belongs in the implementation plan
(sub-issues). The plan stays at the "what and why" altitude.
```

### 4. Present

- Share the issue ID and link with the user
- Show the plan summary
- Wait for approval, feedback, or questions
- Do **not** start executing unless explicitly told to

## Guidelines

- The plan issue must be **self-contained enough to hand off**. A fresh session with no context should be able to read the issue + the referenced files and understand the approach.
- Include full file paths, not relative ones — the executor may be in a different working directory.
- Keep the solution section at the right altitude: architectural decisions yes, line-by-line changes no.
- If the task is trivial (< 5 minutes of work), say so and ask if the user still wants a plan or just wants it done.
- **Ask before creating the issue** — confirm the plan content with the user first, then create.
