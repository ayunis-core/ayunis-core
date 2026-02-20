---
name: ayunis-core-backend-dev
description: Backend development in ayunis-core. Use when creating, modifying, or debugging backend code (NestJS, TypeORM, hexagonal architecture).
---

# Backend Development — ayunis-core-backend

## Working Directory

**All commands run from `ayunis-core-backend/`:**

```bash
cd ayunis-core-backend
```

## Red-Green TDD Workflow

Every change follows red-green TDD. Do NOT write production code without a failing test first.

### Cycle

1. **Red** — Write a test that captures the desired behavior. Run it. It MUST fail.
   - If the test passes immediately, it's not testing anything new — delete it or rethink.
2. **Green** — Write the minimum production code to make the test pass. Nothing more.
3. **Refactor** — Clean up while keeping tests green. Run the full validation sequence.
4. **Repeat** — Next behavior, next test.

```bash
# During each cycle:
npm run test -- --testPathPattern=<module>   # Run focused tests (red → green)
npm run lint && npx tsc --noEmit && npm run test  # Full validation (refactor step)
```

### What Makes a Meaningful Test

- **Test behavior, not implementation** — assert on outputs and side effects, not internal method calls.
- **One logical assertion per test** — each test proves one thing. Name it after what it proves.
- **Use realistic data** — don't use `"test"`, `"foo"`, `"bar"`. Use domain-realistic values.
- **Cover the edges** — happy path alone is insufficient. Test error cases, boundary values, empty inputs, duplicates.
- **Tests are documentation** — a reader should understand the feature by reading tests alone.

```typescript
// GOOD ✓ — behavior-focused, descriptive name, realistic data
it('should reject agent creation when name exceeds 200 characters', async () => {
  const longName = 'A'.repeat(201);
  await expect(useCase.execute({ name: longName })).rejects.toThrow(AgentNameTooLongError);
});

// BAD ✗ — tests implementation, vague name, no real assertion
it('should work', async () => {
  const result = await useCase.execute({ name: 'test' });
  expect(result).toBeDefined();
});
```

### Test Structure

- **Use cases** — test through the public `execute()` method with stubbed ports.
- **Domain entities** — test invariants and business rules directly.
- **Mappers** — test round-trip: domain → record → domain preserves all fields.
- **Controllers** — only test HTTP-specific concerns (status codes, serialization). Business logic is tested via use cases.

## Validation Sequence

Run after every refactor step and before committing. Do NOT trust your own assessment — verify through observable behavior.

```bash
npm run lint                    # Must pass
npx tsc --noEmit               # 0 type errors
npm run test                   # All tests pass
# Ensure dev stack is running (./dev up from repo root), then:
curl http://localhost:3000/api/health  # Service responds
```

## TypeScript Strictness

The backend uses `strict: true` in `tsconfig.json` (with `strictPropertyInitialization: false` for TypeORM entities). This means:

- No implicit `any` — every variable must have a type or be inferable
- `strictBindCallApply`, `strictFunctionTypes`, `strictNullChecks` — all enabled
- `noImplicitReturns: true` — every code path must return

ESLint enforces `@typescript-eslint/no-explicit-any: error`. Use `unknown` and narrow with type guards. The `sonarjs` plugin is also active — it flags cognitive complexity (threshold: 15), duplicate code, and other code smells.

Use `Logger` (from `@nestjs/common`) instead of `console.*`. The `no-console` rule is enforced with only `console.warn` and `console.error` allowed.

## Complexity Thresholds

Enforced by Husky pre-commit and CI:

- Cyclomatic complexity (CCN) ≤ 10
- Function length ≤ 50 lines
- Arguments ≤ 5
- File size ≤ 500 lines (excluding tests, migrations, records)

```bash
# From repo root
./scripts/check-complexity.sh path/to/file.ts   # Check specific file
./scripts/check-complexity.sh                   # Check all staged files
```

If a function exceeds these limits, **refactor it** into smaller units.

## Before You Start

Read the target module's `SUMMARY.md`:

```bash
cat ayunis-core-backend/src/domain/[module]/SUMMARY.md
```

## Module Structure (Hexagonal)

```text
[module]/
├── SUMMARY.md           # ← Read this first
├── domain/              # Pure entities, no decorators
├── application/
│   ├── use-cases/       # Business operations
│   ├── ports/           # Abstract interfaces
│   └── dtos/            # Validation decorators
├── infrastructure/
│   └── persistence/postgres/
│       ├── schema/      # TypeORM records
│       ├── mappers/     # Domain ↔ Record conversion
│       └── *.repository.ts
├── presenters/http/     # Controllers (thin)
└── [module].module.ts   # NestJS wiring
```

## Key Patterns

### Entity IDs — Generated in domain layer, not database

```typescript
// Domain entity
constructor(id: string | null) {
  this.id = id ?? randomUUID();  // ID generated HERE
}

// Record uses @PrimaryColumn, NOT @PrimaryGeneratedColumn
@PrimaryColumn('uuid')
id: string;
```

### User Context — From ContextService, not parameters

```typescript
// CORRECT ✓
const userId = this.contextService.get('userId');

// WRONG ✗
async execute(command: { userId: string })  // Don't pass context
```

### Errors — Domain errors, not HTTP exceptions

```typescript
// In use case
throw new AgentNotFoundError(agentId);  // Domain error

// NOT
throw new NotFoundException();  // ✗ HTTP exception
```

## Database Migrations

For schema changes, use the `ayunis-core-migrations` skill. Never write migrations by hand — always auto-generate from entity changes.

## Common Commands

```bash
# From repo root:
./dev up                     # Start full dev stack (infra + backend + frontend)
./dev status                 # Check what's running
./dev logs backend           # View backend logs
./dev down                   # Stop everything

# From ayunis-core-backend/:
npm run lint                 # Lint check
npx tsc --noEmit            # Type check
npm run test                 # Run tests
npm run migration:generate:dev -- src/db/migrations/Name  # New migration
```

## Completion Checklist

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run test` all pass
- [ ] Dev stack is running (`./dev up` from repo root, or `./dev status` to verify)
- [ ] Relevant endpoint responds correctly (test with curl)
- [ ] No `any` types introduced
- [ ] DTOs have validation decorators
- [ ] New entities have proper mappers
- [ ] Module boundaries respected
- [ ] Committed with descriptive message

## Anti-Patterns

| Don't | Why | Instead |
|-------|-----|---------|
| Write production code before a failing test | Breaks TDD; you can't trust untested code | Red first, then green |
| Write tests that pass immediately | Test proves nothing new | Ensure the test fails for the right reason |
| Test implementation details (mock internals) | Brittle tests that break on refactor | Test inputs → outputs and side effects |
| Use vague test names (`should work`, `handles error`) | Tests are documentation | Name the specific behavior being proven |
| Skip tests | External validation catches gaming | Run full validation sequence |
| Batch changes | Harder to identify breakage | One change → validate → commit |
| `return true` to pass test | Reward hacking | Fix root cause |
| Edit test files to pass | Gaming the validator | Tests define correctness |
| Use `any` type | `no-explicit-any: error` blocks commit | Use `unknown` or specific types, narrow with type guards |
| Use `console.*` | `no-console` rule enforced | Use NestJS `Logger` (`this.logger.log(...)`) |
| Pass userId through commands | Breaks ContextService pattern | Use `contextService.get()` |
| Import across module boundaries | Circular dependencies | Use ports/adapters |
| Write complex functions | CCN>10 triggers CI failure | Split into smaller functions |
