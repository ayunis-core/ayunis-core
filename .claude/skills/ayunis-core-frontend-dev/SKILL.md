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
pnpm run build                 # Must succeed
pnpm run lint                  # Must pass
```

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

## Shared shadcn UI — Never Modify

**Never edit the shared shadcn components in `src/shared/ui/shadcn/` yourself.** These are managed via the shadcn registry (`components.json`) and are shared design-system primitives. Editing them by hand causes drift from the registry and breaks every consumer.

- To add or update a shadcn component, use the shadcn CLI (`pnpm dlx shadcn@latest add <component>`) — do not hand-write or hand-patch files under `src/shared/ui/shadcn/`.
- If a component's behavior or styling needs to change for a feature, **wrap or compose it** in your own component (in the relevant `ui/` directory or `src/shared/ui/` outside `shadcn/`) rather than modifying the primitive.
- If you believe a shared shadcn primitive genuinely must change, **stop and ask the user** — do not make the change on your own.

### Page module internals

Each page module can have these subdirectories:

```text
src/pages/<page-name>/
├── ui/       # Components — state, hooks, JSX only
├── api/      # Mutation hooks (one per operation)
├── model/    # Types, constants, schemas
└── lib/      # Pure helper functions (formatting, URL building, data transforms)
```

Keep `ui/` components focused on component logic. Extract pure functions that don't depend on React state or hooks into `lib/`.

## API Client

After backend API changes, regenerate the client:

```bash
pnpm run openapi:update  # Regenerates src/shared/api/generated/
```

**Never edit generated code manually** — it will be overwritten.

## Hook Pattern

One hook per operation, encapsulating mutation logic. Use `showSuccess`/`showError` from `@/shared/lib/toast` for user feedback, and `extractErrorData` from `@/shared/api/extract-error-data` for structured error handling.

For hooks that back a form (create/update dialogs), load the **frontend-form-pattern** skill — it covers form types, structure, and the full end-to-end validation pattern including backend DTO validation, field-level error display, and i18n.

## Verifying in the Browser

Use your harness's browser tooling to check the page renders and the console is clean. A render failure shows the React dev-server error overlay — the element `#webpack-dev-server-client-overlay` must not exist. The frontend URL depends on the dev slot (see `dev-environment`); seeded login credentials are in `seed-database`.

## Completion Checklist

- [ ] `pnpm run build` succeeds
- [ ] `pnpm run lint` passes
- [ ] Page renders without console errors
- [ ] No `any` types introduced
- [ ] Import rules respected (no upward imports)
- [ ] No hand-edits to `src/shared/ui/shadcn/`
