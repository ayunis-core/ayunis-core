---
name: test-driven-development
description: Write tests before code; reproduce bugs before fixing them. Use when implementing logic, fixing bugs, or modifying behavior. Tests are proof — "seems right" isn't done.
---

# Test-Driven Development

Write a failing test before writing the code that makes it pass. For bug fixes, reproduce the bug with a test before attempting a fix. A codebase with good tests is an agent's superpower; a codebase without tests is a liability.

## When to use

- Implementing new logic or behavior
- Fixing a bug (use the Prove-It pattern below)
- Modifying existing functionality
- Adding edge case handling
- Any change that could break existing behavior

**When NOT to use:** pure config changes, doc updates, static content with no behavioral impact.

## The cycle: Red → Green → Refactor

1. **Red** — Write a test that fails. A test that passes immediately proves nothing.
2. **Green** — Write the minimum code to make it pass. Don't over-engineer.
3. **Refactor** — Clean up with tests still green. Run tests after every refactor step.

Repeat. One concept at a time.

## The Prove-It pattern (bug fixes)

When a bug is reported, **don't start by trying to fix it**. Start by writing a test that reproduces it.

1. Write a test that demonstrates the bug. It must fail.
2. The failing test confirms the bug exists and that you understand it.
3. Implement the fix.
4. The test now passes — fix proven, regression guarded.
5. Run the full suite. No new failures.

If you can't write a failing test for the bug, you don't understand the bug yet. Stop and figure it out before touching the code.

## The test pyramid

Distribute testing effort by level:

```txt
        ╱╲
       ╱E2E╲          ~5% — full user flows, real browser
      ╱─────╲
     ╱integ. ╲        ~15% — boundaries, API, DB
    ╱────────╲
   ╱   unit   ╲       ~80% — pure logic, isolated, ms each
  ╱────────────╲
```

**The Beyonce Rule:** if you liked it, you should have put a test on it. Refactors don't catch your bugs — your tests do. Untested code that breaks is on you.

## Test sizes

Classify by what the test consumes:

| Size       | Constraints                               | Speed   | Where                              |
| ---------- | ----------------------------------------- | ------- | ---------------------------------- |
| **Small**  | Single process, no I/O, no DB, no network | ms      | Pure logic, transforms, validators |
| **Medium** | Localhost only, no external services      | seconds | API + test DB, components          |
| **Large**  | External services allowed                 | minutes | E2E, perf, staging integration     |

The vast majority of the suite should be small. They're fast, reliable, and easy to debug.

## Writing good tests

### Test state, not interactions

Assert on the _outcome_ of the operation, not on which methods were called internally. Interaction-based tests break on every refactor even when behavior is unchanged.

```typescript
// Good — tests behavior
const tasks = await listTasks({ sortBy: "createdAt", sortOrder: "desc" });
expect(tasks[0].createdAt.getTime()).toBeGreaterThan(
  tasks[1].createdAt.getTime(),
);

// Bad — tests SQL string
expect(db.query).toHaveBeenCalledWith(
  expect.stringContaining("ORDER BY created_at DESC"),
);
```

### DAMP over DRY in tests

In production code, DRY is usually right. In tests, **DAMP** (Descriptive And Meaningful Phrases) wins. Each test should read like a specification — self-contained, no tracing through shared helpers to figure out what's being verified. Duplication in tests is acceptable when it makes each test independently understandable.

### Prefer real implementations

Use the simplest test double that gets the job done. The closer to real, the more confidence:

```txt
Real implementation > Fake (in-memory) > Stub (canned data) > Mock (interaction)
```

Mock only when the real implementation is too slow, non-deterministic, or has side effects you can't control (external APIs, email sending). Over-mocking creates tests that pass while production breaks.

### Arrange-Act-Assert

```typescript
it("marks tasks overdue when deadline has passed", () => {
  // Arrange
  const task = createTask({ title: "Test", deadline: new Date("2025-01-01") });
  // Act
  const result = checkOverdue(task, new Date("2025-01-02"));
  // Assert
  expect(result.isOverdue).toBe(true);
});
```

### One assertion per concept

Each test verifies one behavior. Names read like a spec.

```typescript
// Good
it('rejects empty titles', ...);
it('trims whitespace from titles', ...);
it('enforces maximum title length', ...);

// Bad
it('validates titles correctly', () => {
  // ten different things in one test
});
```

## Anti-patterns

| Anti-pattern                   | Why it hurts                            | Fix                                      |
| ------------------------------ | --------------------------------------- | ---------------------------------------- |
| Testing implementation details | Tests break on every refactor           | Test inputs and outputs                  |
| Flaky tests (timing, ordering) | Erodes trust in the suite               | Deterministic assertions, isolated state |
| Testing framework code         | Wastes effort                           | Only test YOUR code                      |
| Snapshot abuse                 | Nobody reviews, breaks on any change    | Use sparingly, review every change       |
| No test isolation              | Pass alone, fail together               | Per-test setup/teardown                  |
| Mocking the unit under test    | Tests prove nothing about real behavior | Mock dependencies, never the subject     |

## Common rationalizations

| Rationalization                                           | Reality                                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| "I'll write tests after the code works."                  | You won't. And post-hoc tests test the implementation you wrote, not the behavior you needed.                                    |
| "This is too simple to test."                             | Simple code gets complicated. The test documents the expected behavior for the next person.                                      |
| "Tests slow me down."                                     | Tests slow you down now. They speed you up every time you change the code later.                                                 |
| "I tested it manually."                                   | Manual testing doesn't persist. Tomorrow's refactor breaks it with no way to know.                                               |
| "The code is self-explanatory."                           | Tests _are_ the spec. They describe what the code should do, not what it currently does.                                         |
| "It's just a prototype."                                  | Prototypes become production. Tests from day one avoid the test-debt crisis.                                                     |
| "I'll add the bug-reproduction test after I've fixed it." | If you fix first, the test only verifies your assumption about the fix, not the original bug. The test must fail before the fix. |
| "All tests pass."                                         | Did you actually run them? "All tests pass" with no command output is the agent equivalent of "trust me." Show the output.       |
| "This test is too hard to write — let me skip it."        | Hard-to-test code is a design smell. The friction is signal, not noise. Restructure the code so it can be tested.                |

## Red flags

- Writing code without a corresponding test
- Tests that pass on the first run (verify they actually fail when you break the code under test)
- Bug fixes without a reproduction test that failed before the fix
- Test names that don't describe a behavior ("works", "handles errors", "test 3")
- Skipping or disabling tests to make the suite pass
- Mocking the unit under test
- "All tests pass" without producing the test runner's output

## Verification

After implementation:

- [ ] Every new behavior has a corresponding test
- [ ] All tests pass — and the test runner's output proves it
- [ ] Bug fixes include a reproduction test that failed before the fix
- [ ] Test names describe behavior, not implementation
- [ ] No skipped or disabled tests
- [ ] Coverage hasn't decreased (if tracked)
