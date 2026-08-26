# @ayunis/ui

Private workspace package containing Ayunis design-system primitives, theme
tokens, and the shadcn configuration. Application and domain components remain
in `ayunis-core-frontend`.

## Usage

```tsx
import { Button } from '@ayunis/ui/components/button';
```

The frontend imports `@ayunis/ui/styles.css` once from its main stylesheet.

## Adding shadcn components

Run the shadcn CLI from this package so generated primitives remain inside the
design-system boundary:

```bash
pnpm dlx shadcn@latest add button
```

Components generated into `src/components` are exported automatically.

## Storybook

From the repository root, run Storybook in the background with:

```bash
./storybook up
./storybook status
./storybook logs
./storybook down
```

Use `STORYBOOK_PORT=<port>` to override the default port (`6006`).

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm deps:check
pnpm storybook:build
```
