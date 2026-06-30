---
name: backend-test-fixtures
description: Shared test fixtures for backend specs — port mock factories, domain builders, and shared IDs in a per-module testing/ folder. Use when a module's *.use-case.spec.ts files repeat the same mock-repository literal, inline entity construction, or hardcoded UUIDs across files.
---

# Backend Test Fixtures

Most repetition in backend unit specs is **setup**, not assertions: the same
port mock object, the same `new Entity({...})` literals, and the same hardcoded
UUIDs copy-pasted into every `*.spec.ts`. Extract that setup into a per-module
fixtures file so a port-signature change is a one-line edit instead of a
nine-file sweep.

**Extract setup. Keep assertions explicit.** Per-test `expect(...).toEqual(...)`
bodies document the contract — never hide them behind helpers.

## When to use

- A module has ≥3 specs that each re-declare the same `jest.Mocked<XRepository>` literal.
- Specs build the same domain entity inline (`new CreditLimit({...})`) repeatedly.
- The same UUID literals (`'1111…'`, `'2222…'`) appear across multiple specs.

**When NOT to use:** a single spec, or a one-off mock used in one place. Don't
build infrastructure for one caller.

## The hard constraint: keep `jest` out of the production build

A fixtures file uses the `jest` global, so it must never reach the production
`tsc` build. `tsconfig.build.json` only excludes `**/*spec.ts`, so the file
**cannot** be named `*.fixtures.ts` at an arbitrary path.

Put it in a `testing/` folder, which is excluded from both the build and
coverage:

- `tsconfig.build.json` → `exclude` includes `"**/testing/**"`
- `package.json` jest `collectCoverageFrom` → includes `"!**/testing/**"`

Both exclusions already exist (added with the credit-limits fixtures). Place new
fixtures under `<module>/application/testing/` and they are covered. Import them
**only** from `*.spec.ts` files.

## The pattern (canonical example)

See `src/iam/credit-limits/application/testing/credit-limit.fixtures.ts` and any
of `src/iam/credit-limits/application/use-cases/*/*.use-case.spec.ts`.

A fixtures file exports three things:

```ts
// 1. Shared identifiers — one source of truth for test IDs.
export const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
export const TEST_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;

// 2. Domain builders — sensible defaults, override only what the test asserts.
//    For a discriminated-union entity, expose one builder per variant.
export function aUserCreditLimit(
  overrides: { userId?: UUID; monthlyCredits?: number; orgId?: UUID } = {},
): CreditLimit {
  const { userId = TEST_USER_ID, orgId = TEST_ORG_ID, monthlyCredits = 5000 } = overrides;
  return new CreditLimit({ orgId, target: { scope: CreditLimitScope.USER, userId }, monthlyCredits });
}

// 3. A port mock factory — defaults model the "empty" state. No `as` cast needed:
//    the object literal already satisfies jest.Mocked<T>.
export function createMockCreditLimitRepository(): jest.Mocked<CreditLimitRepository> {
  return {
    save: jest.fn((limit: CreditLimit) => Promise.resolve(limit)),
    findByOrg: jest.fn().mockResolvedValue([]),
    findByUserId: jest.fn().mockResolvedValue(null),
    // …every port method, with a sensible default…
  };
}
```

In a spec, setup collapses to:

```ts
const repository = createMockCreditLimitRepository();
const existing = aUserCreditLimit({ monthlyCredits: 1000 });
repository.findByUserId.mockResolvedValue(existing);   // override per test
```

## Rules

- **Defaults model the empty/happy path.** Mock finders resolve to `null`/`[]`,
  `save` echoes its argument, deletes resolve. Tests override per case.
- **`import type` for type-only imports** (the port is only used in
  `jest.Mocked<T>`), and **no `as jest.Mocked<T>` cast** on the literal — both
  trip ESLint otherwise.
- **One builder per union variant** (`aUserCreditLimit` / `aTeamCreditLimit`)
  rather than a single builder that juggles a discriminated union.
- Keep the dominant spec style (`Test.createTestingModule`) — fixtures replace
  the *mock setup*, not the testing harness.

## Validate

```bash
pnpm jest src/<module>                                  # specs still green
npx tsc -p tsconfig.build.json --noEmit                 # testing/ NOT compiled
npx eslint --max-warnings=0 <changed files>             # mirrors pre-commit
```
