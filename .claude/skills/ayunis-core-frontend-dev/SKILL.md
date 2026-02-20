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

Before modifying any layer, read its `SUMMARY.md` in `src/[layer]/SUMMARY.md`. The top-level `src/SUMMARY.md` provides an overview.

## Validation Sequence

```bash
npm run build                  # Must succeed
npm run lint                   # Must pass
```

## TypeScript & Lint Strictness

ESLint enforces `@typescript-eslint/no-explicit-any: error`. Use `unknown` or specific types — never `any`. The `sonarjs` plugin is also active (cognitive complexity threshold: 15).

## Complexity Thresholds

Enforced by Husky pre-commit and CI:

- Cyclomatic complexity (CCN) ≤ 10
- Function length ≤ 50 lines
- Arguments ≤ 5
- File size ≤ 500 lines (excluding tests, generated code)

```bash
# From repo root
./scripts/check-complexity.sh path/to/file.ts   # Check specific file
./scripts/check-complexity.sh                   # Check all staged files
```

If a function exceeds these limits, **refactor it** into smaller units.

## Architecture (Feature-Sliced Design)

```text
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

## Completion Checklist

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] Page renders without console errors
- [ ] No `any` types introduced
- [ ] Import rules respected (no upward imports)

## Anti-Patterns

| Don't                       | Why                                    | Instead                                                  |
| --------------------------- | -------------------------------------- | -------------------------------------------------------- |
| Import upward across layers | Breaks FSD architecture                | Respect `pages → widgets → features → shared`            |
| Use `any` type              | `no-explicit-any: error` blocks commit | Use `unknown` or specific types, narrow with type guards |
| Write complex functions     | CCN>10 triggers CI failure             | Split into smaller functions                             |
