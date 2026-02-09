---
name: ayunis-core-frontend-dev
description: Frontend development in ayunis-core. Use when creating, modifying, or debugging frontend code (React, Feature-Sliced Design, API client).
---

# Frontend Development — ayunis-core-frontend

## Working Directory

**All commands run from `ayunis-core-frontend/`:**

```bash
cd ayunis-core-frontend
```

## Validation Sequence

Run after every change. Do NOT trust your own assessment — verify through observable behavior.

```bash
npm run build                  # Must succeed
npm run lint                   # Must pass
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

## Architecture (Feature-Sliced Design)

```
src/
├── pages/      # Route components (compose widgets/features)
├── widgets/    # Reusable composites (used in ≥2 pages)
├── features/   # Self-contained business logic
└── shared/     # Primitives (ui, api, lib)
```

**Import rules**: `pages → widgets → features → shared`

Layers only depend on layers to their right. Never import upward.

## API Client

After backend API changes, regenerate the client:

```bash
npm run openapi:update  # Regenerates src/shared/api/generated/
```

**Never edit generated code manually** — it will be overwritten.

## Hook Pattern

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

## Common Commands

```bash
npm run dev                  # Dev server (port 3001)
npm run build               # Production build
npm run lint                # Lint check
npm run openapi:update      # Regenerate API client
```

## Completion Checklist

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] Page renders without console errors
- [ ] No `any` types introduced
- [ ] Import rules respected (no upward imports)
- [ ] Committed with descriptive message

## Anti-Patterns

| Don't | Why | Instead |
|-------|-----|---------|
| Edit generated API client | Will be overwritten | Run `openapi:update` |
| Import upward across layers | Breaks FSD architecture | Respect `pages → widgets → features → shared` |
| Batch changes | Harder to identify breakage | One change → validate → commit |
| Use `any` type | Hides errors | Use `unknown` or specific types |
| Write complex functions | CCN>10 triggers CI failure | Split into smaller functions |
