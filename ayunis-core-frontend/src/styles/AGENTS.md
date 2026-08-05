# Styles Directory

## CSS Architecture

This directory owns application-specific global styles. Framework-level tokens, variants, plugins, and base styles live in the `@ayunis/ui` workspace package.

```text
ayunis-core-frontend/src/styles/
├── AGENTS.md          # This file
├── main.css           # Imports Tailwind, UI package styles, and app globals
├── interactions.css   # Shared application interaction styles
├── scroll-region.css  # Application scroll-region styles
└── scrollbar.css      # Application scrollbar styles

packages/ui/src/styles.css  # Design tokens and framework-level base styles
```

## Keep Package and Application Styles Separate

- Add application-specific global styles to `main.css` or a focused stylesheet imported by it.
- Keep component-specific styling in components with Tailwind utilities.
- Do not add feature-specific selectors or overrides to `packages/ui/src/styles.css`.
- Changes to `packages/ui/src/styles.css` must be intentional, application-independent design-system changes. Its token and registry configuration is owned by `packages/ui/components.json`.

## main.css Structure

`main.css` must import Tailwind first, followed by the UI package stylesheet and the application stylesheets:

```css
@import 'tailwindcss';
@import '@ayunis/ui/styles.css';
@import './scroll-region.css';
@import './interactions.css';
@import './scrollbar.css';

/* Application-specific global styles below */
```

Do not duplicate the UI package's theme tokens, `@plugin`, `@custom-variant`, or base layer in the frontend stylesheet.
