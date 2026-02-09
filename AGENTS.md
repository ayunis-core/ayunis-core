# AI Coding Agent Guidelines

> **Philosophy**: Code is opaque weights. Correctness is inferred from externally observable behavior.

This file guides AI coding agents working in this repository. For architecture overview and module navigation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Core Principles

### 1. Validation-First Development

**Do NOT** trust your own assessment of code correctness.
**DO** verify changes through observable behavior:

```bash
# Backend validation sequence (run from ayunis-core-backend/)
npm run lint                    # Must pass
npx tsc --noEmit               # 0 type errors
npm run test                   # All tests pass
npm run docker:dev && curl http://localhost:3000/api/health  # Service runs
```

```bash
# Frontend validation sequence (run from ayunis-core-frontend/)
npm run build                  # Must succeed
npm run lint                   # Must pass
```

```bash
# Complexity check (both backend + frontend, from repo root)
./scripts/check-complexity.sh path/to/file.ts   # Check specific file
./scripts/check-complexity.sh                   # Check all staged files
```

**Complexity thresholds** (enforced by Husky pre-commit and CI):
- Cyclomatic complexity (CCN) ≤ 10
- Function length ≤ 50 lines
- Arguments ≤ 5

If a function exceeds these limits, **refactor it** into smaller units.

### 2. Incremental Progress

- Make one change at a time
- Validate after each change
- Commit after each validated change
- Never batch multiple logical changes

### 3. Module Boundaries

Before modifying any module, read its `SUMMARY.md`:

```bash
cat ayunis-core-backend/src/domain/[module]/SUMMARY.md
```

**Respect bounded contexts:**
- `src/domain/*` — core business logic
- `src/iam/*` — identity and access management  
- `src/common/*` — shared infrastructure only
- Cross-module dependencies via ports, not direct imports

---

## Backend Development

### Working Directory

**IMPORTANT**: All backend commands from `ayunis-core-backend/`:

```bash
cd ayunis-core-backend
```

### Module Structure (Hexagonal)

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

### Key Patterns

**Entity IDs**: Generated in domain layer, not database

```typescript
// Domain entity
constructor(id: string | null) {
  this.id = id ?? randomUUID();  // ID generated HERE
}

// Record uses @PrimaryColumn, NOT @PrimaryGeneratedColumn
@PrimaryColumn('uuid')
id: string;
```

**User Context**: From ContextService, not parameters

```typescript
// CORRECT ✓
const userId = this.contextService.get('userId');

// WRONG ✗
async execute(command: { userId: string })  // Don't pass context
```

**Errors**: Domain errors, not HTTP exceptions

```typescript
// In use case
throw new AgentNotFoundError(agentId);  // Domain error

// NOT
throw new NotFoundException();  // ✗ HTTP exception
```

### Database Migrations

```bash
npm run migration:generate:dev "MigrationName"
npm run migration:run:dev
```

---

## Frontend Development

### Working Directory

```bash
cd ayunis-core-frontend
```

### Architecture (Feature-Sliced)

```
src/
├── pages/      # Route components (compose widgets/features)
├── widgets/    # Reusable composites (≥2 pages)
├── features/   # Self-contained business logic
└── shared/     # Primitives (ui, api, lib)
```

**Import rules**: `pages → widgets → features → shared`

### API Client

After backend changes:

```bash
npm run openapi:update  # Regenerates src/shared/api/generated/
```

Never edit generated code manually.

### Hook Pattern

One hook per operation, encapsulating mutation logic:

```typescript
// api/useCreateItem.ts
export function useCreateItem(onSuccess?: () => void) {
  const mutation = useItemsControllerCreate({
    mutation: { onSuccess, onSettled: () => invalidate() }
  });
  return { createItem: (data) => mutation.mutate({ data }), isCreating: mutation.isPending };
}
```

---

## Validation Checklist

Before considering any change complete:

### Backend
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run test` all pass
- [ ] Service starts: `npm run docker:dev`
- [ ] Relevant endpoint responds correctly (test with curl)

### Frontend  
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] Page renders without console errors

### General
- [ ] No `any` types introduced
- [ ] DTOs have validation decorators
- [ ] New entities have proper mappers
- [ ] Module boundaries respected
- [ ] Committed with descriptive message

---

## Anti-Patterns to Avoid

| Don't | Why | Instead |
|-------|-----|---------|
| Skip tests | Agents game visible tests; external validation catches this | Run full validation sequence |
| Batch changes | Harder to identify breaking change | One change → validate → commit |
| `return true` to pass test | Reward hacking | Fix root cause |
| Edit test files to pass | Gaming the validator | Tests define correctness |
| Use `any` type | Hides errors | Use `unknown` or specific types |
| Pass userId through commands | Breaks ContextService pattern | Use `contextService.get()` |
| Import across module boundaries | Circular dependencies | Use ports/adapters |
| Edit generated API client | Will be overwritten | Run `openapi:update` |
| Write complex functions | CCN>10 triggers CI failure | Split into smaller functions |

---

## Quick Reference

### Key Files

| Purpose | Location |
|---------|----------|
| Architecture overview | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Module summaries | `src/[area]/[module]/SUMMARY.md` |
| TypeORM config | `ayunis-core-backend/src/db/datasource.ts` |
| OpenAPI spec | `http://localhost:3000/api/docs` (when running) |

### Common Commands

```bash
# Backend
cd ayunis-core-backend
npm run docker:dev           # Start with deps
npm run lint                 # Lint check
npx tsc --noEmit            # Type check
npm run test                 # Run tests
npm run migration:generate:dev "Name"  # New migration

# Frontend
cd ayunis-core-frontend
npm run dev                  # Dev server (port 3001)
npm run build               # Production build
npm run openapi:update      # Regenerate API client
```

---

## Navigating the Codebase

1. **Start with ARCHITECTURE.md** for the big picture
2. **Read the relevant SUMMARY.md** before touching a module
3. **Follow the validation checklist** after every change
4. **Commit incrementally** — one logical change per commit

The goal: code that works because it demonstrably works, not because it looks right.
