---
name: backend-testing
description: Decide whether an ayunis-core backend change needs a committed test, at which layer, and how to write and run it. MUST be loaded before writing, changing, or deleting any backend *.spec.ts, and when deciding how to verify a backend change.
---

# Backend Testing

Every change needs **evidence** that it works. Only some changes need a
**committed test**. These are separate decisions.

- **Evidence** is mandatory and may be throwaway: run the existing focused
  specs, a `curl` against the dev stack, a scratch script, a temporary spec you
  delete afterwards, a log line you read. State what you ran in the PR.
- **A committed test** is a permanent maintenance cost. Commit one only when it
  protects against a regression you can name.

## The commit criterion

Commit a test only if all three hold:

1. You can name the **concrete regression** it catches: "a member of another
   org can read the routine", "a team limit is ignored when the user has a
   personal limit" — not "the use case works".
2. Types, lint, DTO validation, and existing tests would **not** already catch
   that regression.
3. The regression would **matter**: wrong data, wrong access, wrong money,
   lost work, a broken contract another module or client depends on.

If you cannot name the regression, do not commit the test. Put the named
regression in the test's `it(...)` description; that is what the test is for.

## Always commit a test for

- **Bug fixes** with a behavioral cause. Reproduce the bug with a failing test
  at the lowest layer where it is observable, then fix it. A bug in a query is
  reproduced in a repository integration spec, not in a use-case spec with a
  mocked repository.
- **Access rules**: ownership, org/tenant scoping, sharing, permission checks.
  Follow the distinct-principal rules in `AGENTS.md`.
- **Domain rules with branching or arithmetic**: invariants, state
  transitions, quotas, credit/limit resolution, scheduling, parsing.
- **Non-trivial persistence**: filters, sorting, pagination, joins, locks,
  upserts, tenant-scoped queries, raw SQL, multi-statement transactions.
- **Contracts other code depends on**: error codes clients map, event payloads,
  outbox/webhook shapes, OpenAI-compatible responses.

## Do not commit a test for

- Use cases that only delegate (load by id → return, map → save) with no
  decision of their own.
- Mappers that copy fields. Test a mapper only when it transforms: enum or
  subtype discrimination, JSON (de)serialization, defaulting.
- Feature-flag and config defaults, constants, enum membership, DI wiring,
  module registration.
- DTO decorators (`@IsString`, `@MaxLength`). Test only custom validators.
- Controllers that map input and call a use case. Controller specs are for
  HTTP-specific behavior that has no other proof (a custom status code, a
  streamed response).
- Log messages, error message wording, and anything the type system already
  guarantees.
- Behavior-preserving refactors: run the existing specs before and after; do
  not add new ones.
- A second test at another layer for a behavior already proven elsewhere.

## Choose the layer

| What changed                                      | Where the test goes                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| Entity / value-object rule                        | Plain unit spec next to the entity. No Nest module, no mocks.        |
| Decision logic in a use case or service           | Use-case spec through `execute()`, ports stubbed via fixtures.       |
| Query, lock, upsert, transaction, raw SQL         | `*.integration.spec.ts` against real Postgres.                       |
| Cross-module or HTTP-to-DB journey, access grants | E2E (`e2e` skill) when lower layers cannot prove it.                 |

When a use-case test would need to mock half the module to reach one decision,
extract the decision into a domain method or application service and test that
directly.

## Writing use-case specs

Assert the **outcome**: the returned value, the thrown domain error, or the
state handed to persistence (the fields of the entity passed to `save`). Do
not make "this port was called" the proof. A call assertion is acceptable only
when the call itself is the observable side effect, such as an event being
published or an email being sent.

```ts
// Good — proves the rule
const saved = repository.save.mock.calls[0][0];
expect(saved.monthlyCredits).toBe(1000);
await expect(useCase.execute(cmd)).rejects.toThrow(CreditLimitNotFoundError);

// Bad — restates the implementation
expect(repository.findByUserId).toHaveBeenCalledWith(orgId, userId);
expect(repository.save).toHaveBeenCalledTimes(1);
```

Use domain-realistic values, one behavior per `it`, and names that state the
rule being protected.

### Shared fixtures

When three or more specs in a module repeat the same port mock, entity
construction, or UUIDs, extract them into
`<module>/application/testing/<name>.fixtures.ts`. Canonical example:
`src/iam/credit-limits/application/testing/credit-limit.fixtures.ts`.

- `testing/` is excluded from the build (`tsconfig.build.json`) and coverage.
  Never name a fixtures file `*.fixtures.ts` outside a `testing/` folder, and
  import fixtures only from `*.spec.ts` files.
- Export shared IDs, one builder per entity subclass with sensible defaults,
  and one mock factory per port whose defaults model the empty state (finders
  resolve `null`/`[]`, `save` echoes its argument).
- Extract setup, never assertions.

Do not create a fixtures file for a single spec.

## Writing integration specs

Copy the closest existing `*.integration.spec.ts` (for example
`src/iam/orgs/infrastructure/repositories/local/local-orgs.repository.integration.spec.ts`):
a `DataSource` on a random schema, `synchronize()`, the real repository, and
`dropSchema` in `afterAll`. Assert on rows returned or written, not on SQL
strings. They need a reachable Postgres from the backend env (`./dev up`
locally; CI provides one).

For multi-statement atomicity, write a real PostgreSQL rollback test (see
`ayunis-core-backend/TRANSACTIONS.md`).

## Write it first

When a test passes the commit criterion, write it before the fix or feature
and watch it fail for the expected reason. A test that never failed proves
nothing.

## Maintain the suite

- When behavior changes, update or delete the tests that encoded the old
  behavior instead of stacking new ones beside them.
- Delete a test you touch if it fails the commit criterion, and say so in the
  PR. Removing a low-value test is a valid change, not lost coverage.
- Never skip or disable a failing test to get green. Fix it, or delete it with
  a reason.
- Coverage is not a goal. Do not add tests to raise it.

## Running tests

Always run Jest through `pnpm test` from `ayunis-core-backend/`, never bare
`jest` or `npx jest`. Pass the path directly: with `pnpm run test -- <flag>`,
Jest receives the `--` and reads the flag as a path pattern that matches nothing.

```bash
cd ayunis-core-backend
pnpm test <path-or-pattern>    # focused, e.g. pnpm test src/iam/credit-limits
pnpm test                      # full suite
```

`pnpm test` sets the Node ESM flags and module mapping. Bare `jest` breaks the
ESM-only `p-queue` import, and the `embeddings-throttle` and
`ingest-bulk-content` suites fail with module-resolution errors. Those failures
are caused by running Jest the wrong way, not by a regression. Do not report
them as pre-existing failures.

Run the focused specs for the code you changed. Run the full suite for
High-Risk changes and for changes to shared test infrastructure, as the
Proportional Workflow requires.
