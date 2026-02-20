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

```bash
npm run lint                    # Must pass
npx tsc --noEmit               # 0 type errors
npm run test                   # All tests pass
# Ensure dev stack is running, then:
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

## Module Boundaries

The backend enforces strict bounded contexts:

- **`src/domain/*`** — Core business logic (agents, threads, messages, runs, models, tools, prompts, sources, RAG, etc.)
- **`src/iam/*`** — Identity and access management (auth, users, orgs, subscriptions, quotas, teams, etc.)
- **`src/common/*`** — Shared infrastructure only (base classes, utilities)
- **`src/admin/*`** — Super admin routes

Cross-module dependencies go through **ports** (abstract interfaces), not direct imports. Before modifying any module, read its `SUMMARY.md`. See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the complete module index.

## Key Files

| Purpose                     | Location                                             |
| --------------------------- | ---------------------------------------------------- |
| Architecture & module index | `ARCHITECTURE.md`                                    |
| Module summaries            | `src/[area]/[module]/SUMMARY.md`                     |
| TypeORM config              | `src/db/datasource.ts`                               |
| OpenAPI spec                | `http://localhost:3000/api/docs` (when running)      |

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

## Completion Checklist

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run test` all pass
- [ ] Dev stack is running (`./dev up` from repo root, or `./dev status` to verify)
- [ ] Relevant endpoint responds correctly (test with curl)
- [ ] No `any` types introduced
- [ ] DTOs have validation decorators
- [ ] New entities have proper mappers

## Anti-Patterns

| Don't                                                    | Why                                          | Instead                                                    |
| -------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| Test implementation details (mock internals)             | Brittle tests that break on refactor         | Test inputs → outputs and side effects                     |
| Use vague test names (`should work`, `handles error`)    | Tests are documentation                      | Name the specific behavior being proven                    |
| Use `any` type                                           | `no-explicit-any: error` blocks commit       | Use `unknown` or specific types, narrow with type guards   |
| Use `console.*`                                          | `no-console` rule enforced                   | Use NestJS `Logger` (`this.logger.log(...)`)               |
| Pass userId through commands                             | Breaks ContextService pattern                | Use `contextService.get()`                                 |
| Throw HTTP exceptions from use cases                     | Couples domain to HTTP                       | Throw domain errors                                        |
