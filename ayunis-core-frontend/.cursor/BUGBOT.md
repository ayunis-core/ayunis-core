# React Frontend Bugbot Policy

- All data exchange to the backend must go through auto generated endpoints from orval. If a PR introduces manual API calls using fetch or axios directly instead of the generated client, flag this as an issue
- If something is used more than once and
  - it is a UI component: Move it to widgets
  - it is stateful functionality without UI: Move it to features as hook
  - it is stateless functionality without UI: Move it to lib
- Avoid unnecessary prop drilling. Components should be self contained where possible. If a PR passes data through multiple intermediate components that don't use it themselves, flag this as an issue
- Framework-level UI primitives (button, dialog, form, input, card, tabs, badge, etc.) must come from the `@ayunis/ui` workspace package in `packages/ui/`. If a PR duplicates or reimplements functionality already exported by that package, flag this as an issue
- Never install third-party UI component libraries (e.g. Material UI, Ant Design, Chakra UI, Mantine) when equivalent components exist in `@ayunis/ui`. If a new dependency provides UI primitives that overlap with the existing library, flag this as an issue
- Custom components in features, widgets, or pages must compose primitives through public `@ayunis/ui` subpaths, such as `@ayunis/ui/components/button`, rather than importing from `packages/ui/src/` or rebuilding common patterns with raw HTML and inline Tailwind. If raw `<button>`, `<input>`, or `<dialog>` elements are used where an Ayunis UI component exists, flag this as an issue
- **CRITICAL**: Files inside `packages/ui/src/components/` are application-independent design-system primitives managed through `packages/ui/components.json` and the `@ayunis` registry. If a PR adds feature-specific logic, business dependencies, or one-off styling to these files, flag this as an issue and request a wrapper in the relevant frontend `ui/` directory. Generic, intentional design-system changes and registry syncs are allowed
- Developers must not pass custom Tailwind classes to Ayunis UI components to override their built-in styling. Components should be used as-is with the variants and props they expose. If a PR adds custom classes (via `className`) that override or conflict with the component's own styles, flag this as an issue — the correct approach is to use an existing variant or propose a generic variant in the UI package
- When styling custom (non-library) components, always use the `cn()` utility from `@ayunis/ui/lib/cn` to merge class names. If conditional class names are concatenated manually with template literals or string concatenation instead of `cn()`, flag this as an issue
- Ayunis UI components use `data-slot` attributes for identification. If a PR removes or changes existing `data-slot` values, flag this as an issue — it may break styling or testing selectors
- Imports outside the current directory must use the `@/…` alias. Relative paths are only for same-directory siblings (`./thing`). If you see a `../` import anywhere in the diff, flag it — the alias form is `@/` plus the path from `ayunis-core-frontend/src`
