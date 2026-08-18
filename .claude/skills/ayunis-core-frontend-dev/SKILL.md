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

**User-facing change?** The definition of done includes e2e coverage — load
the `e2e` skill: add/update the journey spec in `ayunis-core-e2e/` and run it
green before submitting. Add `data-testid`s to touched components in the same
PR (`<feature>-<element>`, kebab-case) — text selectors are banned because
the UI is i18n'd.

**Visible UI change?** After the product PR exists, add temporary PR media by
loading the `pr-media` skill and publishing scenes to `pr-media/pr-<number>`.
This is required unless the user explicitly says not to add PR media. Do not
commit media scenes to the product branch.

## Architecture (Feature-Sliced Design)

```text
packages/ui/  # Framework-level UI primitives, tokens, and utilities

ayunis-core-frontend/src/
├── pages/      # Route components (compose widgets/features)
├── widgets/    # Reusable composites (used in ≥2 pages)
├── features/   # Self-contained business logic
└── shared/     # App-wide infrastructure and app-aware UI
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

## Shared UI Package — Registry-Managed Primitives

Framework-level primitives live in the repository-root `packages/ui/` workspace and are imported through `@ayunis/ui` subpaths. App-aware shared components remain in `ayunis-core-frontend/src/shared/ui/`.

- Run shadcn registry commands from `packages/ui/`, whose `components.json` owns the aliases and registry configuration: `cd ../packages/ui && pnpm dlx shadcn@latest add <component>`.
- Do not patch `packages/ui/src/components/` for a feature-specific use case. Wrap or compose the primitive in the relevant frontend `ui/` directory or `src/shared/ui/` instead.
- Changes inside `packages/ui/` must remain application-independent and be intentional design-system work. If a primitive genuinely needs a new generic capability, confirm that scope with the user before changing it.
- Every newly introduced `packages/ui/src/components/<name>.tsx` component must include a colocated `<name>.stories.tsx`. Cover its representative default state and meaningful generic variants, states, or interactions; compound components should be demonstrated as a usable composition.
- Import primitives from their public subpaths, such as `@ayunis/ui/components/button`, and `cn` from `@ayunis/ui/lib/cn`. Do not reach into `packages/ui/src/` from the frontend.

### Reach for existing primitives and tokens

Compose the existing design system before hand-rolling layout, and use design tokens instead of raw Tailwind color scales:

- **Look for a composite primitive first.** For an icon-plus-label row (banners, result cards, list rows) use the `Item` family — `Item` / `ItemMedia variant="icon"` / `ItemContent` — rather than assembling a bare `flex` container yourself. Check `@ayunis/ui` for a framework primitive and `src/shared/ui/` for an app-aware component before adding your own.
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
- [ ] UI primitives use public `@ayunis/ui` subpaths
- [ ] New `packages/ui` components include representative Storybook stories
- [ ] No feature-specific behavior added to `packages/ui/`
