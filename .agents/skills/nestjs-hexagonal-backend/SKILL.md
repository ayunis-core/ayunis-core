---
name: nestjs-hexagonal-backend
description: Backend development with NestJS, TypeORM, and hexagonal architecture. Use when creating, modifying, or debugging backend code.
---

# NestJS Hexagonal Backend Development

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
it("should reject agent creation when name exceeds 200 characters", async () => {
  const longName = "A".repeat(201);
  await expect(useCase.execute({ name: longName })).rejects.toThrow(
    AgentNameTooLongError,
  );
});

// BAD ✗ — tests implementation, vague name, no real assertion
it("should work", async () => {
  const result = await useCase.execute({ name: "test" });
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
```

## Backend-Specific TypeScript Rules

- `strict: true` with `strictPropertyInitialization: false` (for TypeORM entities)
- `noImplicitReturns: true` — every code path must return
- Use `Logger` (from `@nestjs/common`) instead of `console.*`

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

### Errors — Domain errors, not HTTP exceptions

```typescript
// In use case
throw new AgentNotFoundError(agentId); // Domain error

// NOT
throw new NotFoundException(); // ✗ HTTP exception
```

## Database Migrations

For schema changes, use the `typeorm-migrations` skill. Never write migrations by hand — always auto-generate from entity changes.

## Completion Checklist

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run test` all pass
- [ ] No `any` types introduced
- [ ] DTOs have validation decorators
- [ ] New entities have proper mappers

## Anti-Patterns

| Don't                                                 | Why                                  | Instead                                |
| ----------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| Test implementation details (mock internals)          | Brittle tests that break on refactor | Test inputs → outputs and side effects |
| Use vague test names (`should work`, `handles error`) | Tests are documentation              | Name the specific behavior being proven|
| Throw HTTP exceptions from use cases                  | Couples domain to HTTP               | Throw domain errors                    |
