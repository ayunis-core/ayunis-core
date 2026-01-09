# Styles Directory

## CSS Architecture

This directory contains the theme-based CSS architecture:

```
styles/
├── AGENTS.md             # This file
├── main.css              # Main stylesheet - imports theme and app-specific styles
└── themes/
    └── core.css          # Core theme from private shadcn registry
```

### ⚠️ CRITICAL: Do Not Modify `themes/core.css`

**The file `themes/core.css` is sourced from our private shadcn registry and must NEVER be modified directly.**

This file contains:

- CSS custom properties (`:root` and `.dark` variables)
- Color tokens (background, foreground, primary, secondary, etc.)
- Radius tokens
- Sidebar theme variables
- Tailwind theme inline configuration (`@theme inline`)
- Base layer styles (`@layer base`)

Any modifications to this file will be overwritten when syncing with the registry and may cause inconsistencies across the design system.

### Where to Add Custom Styles

- **Application-specific styles**: Add to `main.css`
- **Component-specific styles**: Use Tailwind utility classes directly in components
- **Theme overrides**: If you need to override theme values for a specific component, use CSS custom properties scoping or Tailwind's utility classes

### main.css Structure

The `main.css` file should:

1. Import Tailwind CSS
2. Import the theme from `./themes/core.css`
3. Import any plugins (e.g., `tailwindcss-animate`)
4. Define custom variants
5. Contain app-specific global styles (e.g., prose styles for markdown)

Example structure:

```css
@import 'tailwindcss';
@import './themes/core.css';

@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

/* App-specific styles below */
```
