---
name: frontend-testing
description: Decide whether an ayunis-core frontend change needs a committed test, at which layer, and how to write and run it. MUST be loaded before writing, changing, or deleting any frontend *.test.ts(x) / *.spec.ts, and when deciding how to verify a frontend change.
---

# Frontend Testing

Every change needs **evidence** that it works. Only some changes need a
**committed test**. These are separate decisions.

- **Evidence** is mandatory and may be throwaway: open the page in the browser,
  click through the flow, check the console, take a screenshot, run the
  existing focused tests. State what you checked in the PR.
- **A committed test** is a permanent maintenance cost. Commit one only when it
  protects against a regression you can name.

Most UI changes need browser verification and no new test.

## The commit criterion

Commit a test only if all three hold:

1. You can name the **concrete regression** it catches: "a run started after
   the request returned never appears in the sidebar", "the update form
   sends `modelId: null` when the user picks the default model". "The badge renders"
   is not a regression.
2. Types, lint, the generated API client, and existing tests would **not**
   already catch it.
3. The regression would **matter** to a user: lost input, wrong data sent,
   wrong state shown after an action, a hidden or exposed control that changes
   what the user is allowed to do.

If you cannot name the regression, do not commit the test. Put the named
regression in the test's `it(...)` description.

## Commit a test for

- **Bug fixes** in logic: reproduce with a failing test first, then fix.
- **Pure logic in `lib/` and `model/`**: form-value mapping, parsing,
  formatting with branching, sorting/grouping, state reducers, polling or
  retry intervals. These are cheap and robust; prefer them.
- **Hooks with real logic**: cache updates, optimistic updates and rollback,
  polling, reattach/resume behavior, error-to-message mapping.
- **Components only when they own consequential behavior** that cannot be
  extracted into a function: a multi-step interaction, a guard that prevents a
  destructive action, gating by permission or feature flag.

If a component test needs several `vi.mock` calls to reach one decision, move
that decision into a `lib/` function or a hook and test it there instead.

## Do not commit a test for

- Copy, labels, translation keys, placeholder text, or i18n wiring.
- Styling: class names, variants, colors, spinners, icons, layout, responsive
  behavior. Verify these in the browser.
- That a component renders, that a button exists, or that props pass through.
- Mapping a status to a badge variant or label.
- Route registration, navigation links, or a hook that only wraps a generated
  query.
- Snapshots.
- Behavior already proven by an E2E spec or another test.

## Writing tests

- **Hooks**: use `renderHook` with a real `QueryClient` and mock only the HTTP
  boundary (`customAxiosInstance` from `@/shared/api/client`). Assert the state
  the user would see, such as cache contents or returned data. Do not assert
  that hooks were called. Reference:
  `src/features/routines/api/useRunRoutineNow.test.tsx`.
- **Pure functions**: plain input → output. Reference:
  `src/features/routines/lib/routine-form-values.test.ts`.
- **Components**: query by role or `data-testid`, act with `fireEvent`, and
  assert behavior: what was submitted, what became enabled or disabled, what
  appeared after the action. Do not assert text content or translation keys.
- One behavior per `it`, with names that state the rule being protected.

## Browser journeys

When the change alters a browser-to-backend journey that lower layers cannot
prove (auth, persistence across reload, email, uploads, access grants), load
the `e2e` skill. One representative journey, not permutations.

## Write it first

When a test passes the commit criterion, write it before the fix or feature
and watch it fail for the expected reason.

## Maintain the suite

- When behavior changes, update or delete the tests that encoded the old
  behavior.
- Delete a test you touch if it fails the commit criterion, and say so in the
  PR. Removing a low-value test is a valid change, not lost coverage.
- Never skip or disable a failing test to get green. Fix it, or delete it with
  a reason.
- Coverage is not a goal.

## Running tests

```bash
cd ayunis-core-frontend
pnpm test <path-or-pattern>    # focused (vitest run)
pnpm test                      # full suite
```

Run the focused tests for the files you changed. CI runs the full suite.
