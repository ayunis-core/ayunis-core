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

### Check demonstrated conventions before deciding placement

The FSD rules above are the theory; **this repo's actual conventions are the tie-breaker.** Before deciding where a slice or component lives — feature vs widget vs page, which page a route maps to, whether something is "shared enough" to promote a layer — grep how comparable cases are already structured and follow that, rather than reasoning from FSD principles alone.

- The abstract heuristics ("used in ≥2 pages → widget", "used from more than one slice → promote") are necessary but not sufficient. They routinely disagree with how the codebase actually draws its boundaries when viewed across the whole repo instead of a single branch.
- Concrete convention that has bitten before: **pages map one slice per route** — e.g. a list route and its detail route are separate page slices (`skills.index` vs `skill.$id`), not one page reused across two routes. Check the route files and `src/pages/` before assuming a shared placement.
- When a colocated placement (feature/page) and a "promote to shared/widget" placement both look defensible, the existing convention wins. Look at the `Reference Pages` in the `new-page` skill and grep sibling slices before moving code.
- Do not double down on a theory-driven placement after pushback — re-check the convention first. See "Confirm placement before mutating a stacked PR chain" below.

### Confirm placement before mutating a stacked PR chain

Do not execute structural moves and amend commits across a stacked-PR chain (e.g. `gt modify` a parent, then check out and amend the child) off a *preliminary* placement conclusion. Settle the placement against repo conventions first, then move — reverting a wrong move across stacked branches means restoring exact pre-session SHAs from the reflog.

## Shared shadcn UI — Never Modify

**Never edit the shared shadcn components in `src/shared/ui/shadcn/` yourself.** These are managed via the shadcn registry (`components.json`) and are shared design-system primitives. Editing them by hand causes drift from the registry and breaks every consumer.

- To add or update a shadcn component, use the shadcn CLI (`pnpm dlx shadcn@latest add <component>`) — do not hand-write or hand-patch files under `src/shared/ui/shadcn/`.
- If a component's behavior or styling needs to change for a feature, **wrap or compose it** in your own component (in the relevant `ui/` directory or `src/shared/ui/` outside `shadcn/`) rather than modifying the primitive.
- If you believe a shared shadcn primitive genuinely must change, **stop and ask the user** — do not make the change on your own.

### Reach for existing primitives and tokens

Compose the existing design system before hand-rolling layout, and use design tokens instead of raw Tailwind color scales:

- **Look for a composite primitive first.** For an icon-plus-label row (banners, result cards, list rows) use the `Item` family — `Item` / `ItemMedia variant="icon"` / `ItemContent` — rather than assembling a bare `flex` container yourself. Check `src/shared/ui/` for an existing icon component before adding your own.
- **Use semantic color tokens, never hardcoded palette classes.** `text-brand`, `text-muted-foreground`, etc. — not `text-amber-500`, `text-blue-600`, or other raw Tailwind color scales, which break theming and dark mode.

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
