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

## Validation Sequence

Run after every change. Do NOT trust your own assessment — verify through observable behavior.

```bash
npm run lint                    # Must pass
npx tsc --noEmit               # 0 type errors
npm run test                   # All tests pass
npm run docker:dev && curl http://localhost:3000/api/health  # Service runs
```

## Complexity Thresholds

Enforced by Husky pre-commit and CI:
- Cyclomatic complexity (CCN) ≤ 10
- Function length ≤ 50 lines
- Arguments ≤ 5

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

```
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

```bash
npm run migration:generate:dev "MigrationName"
npm run migration:run:dev
```

## Common Commands

```bash
npm run docker:dev           # Start with deps
npm run lint                 # Lint check
npx tsc --noEmit            # Type check
npm run test                 # Run tests
npm run migration:generate:dev "Name"  # New migration
```

## Completion Checklist

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run test` all pass
- [ ] Service starts: `npm run docker:dev`
- [ ] Relevant endpoint responds correctly (test with curl)
- [ ] No `any` types introduced
- [ ] DTOs have validation decorators
- [ ] New entities have proper mappers
- [ ] Module boundaries respected
- [ ] Committed with descriptive message

## Anti-Patterns

| Don't | Why | Instead |
|-------|-----|---------|
| Skip tests | External validation catches gaming | Run full validation sequence |
| Batch changes | Harder to identify breakage | One change → validate → commit |
| `return true` to pass test | Reward hacking | Fix root cause |
| Edit test files to pass | Gaming the validator | Tests define correctness |
| Use `any` type | Hides errors | Use `unknown` or specific types |
| Pass userId through commands | Breaks ContextService pattern | Use `contextService.get()` |
| Import across module boundaries | Circular dependencies | Use ports/adapters |
| Write complex functions | CCN>10 triggers CI failure | Split into smaller functions |
