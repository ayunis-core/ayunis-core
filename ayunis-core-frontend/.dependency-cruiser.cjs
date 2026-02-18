/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ═══════════════════════════════════════════════════════════════════════════
    // FEATURE-SLICED DESIGN — Layer hierarchy (top to bottom):
    // app → pages → layouts → widgets → features → shared
    // Each layer can only import from layers BELOW it.
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────────
    // SHARED — Base layer, cannot import anything above
    // ─────────────────────────────────────────────────────────────────────────────
    {
      name: 'shared-no-features',
      comment: 'shared/ cannot import from features/',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/features/' },
    },
    {
      name: 'shared-no-widgets',
      comment: 'shared/ cannot import from widgets/',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/widgets/' },
    },
    {
      name: 'shared-no-layouts',
      comment: 'shared/ cannot import from layouts/',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/layouts/' },
    },
    {
      name: 'shared-no-pages',
      comment: 'shared/ cannot import from pages/',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/pages/' },
    },
    {
      name: 'shared-no-app',
      comment: 'shared/ cannot import from app/',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/app/' },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // FEATURES — Can only import from shared
    // ─────────────────────────────────────────────────────────────────────────────
    {
      name: 'features-no-widgets',
      comment: 'features/ cannot import from widgets/',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/widgets/' },
    },
    {
      name: 'features-no-layouts',
      comment: 'features/ cannot import from layouts/',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/layouts/' },
    },
    {
      name: 'features-no-pages',
      comment: 'features/ cannot import from pages/',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/pages/' },
    },
    {
      name: 'features-no-app',
      comment: 'features/ cannot import from app/',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/app/' },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // WIDGETS — Can import from features and shared only
    // ─────────────────────────────────────────────────────────────────────────────
    {
      name: 'widgets-no-layouts',
      comment: 'widgets/ cannot import from layouts/',
      severity: 'error',
      from: { path: '^src/widgets/' },
      to: { path: '^src/layouts/' },
    },
    {
      name: 'widgets-no-pages',
      comment: 'widgets/ cannot import from pages/',
      severity: 'error',
      from: { path: '^src/widgets/' },
      to: { path: '^src/pages/' },
    },
    {
      name: 'widgets-no-app',
      comment: 'widgets/ cannot import from app/',
      severity: 'error',
      from: { path: '^src/widgets/' },
      to: { path: '^src/app/' },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // LAYOUTS — Can import from widgets, features, and shared only
    // ─────────────────────────────────────────────────────────────────────────────
    {
      name: 'layouts-no-pages',
      comment: 'layouts/ cannot import from pages/',
      severity: 'error',
      from: { path: '^src/layouts/' },
      to: { path: '^src/pages/' },
    },
    {
      name: 'layouts-no-app',
      comment: 'layouts/ cannot import from app/',
      severity: 'error',
      from: { path: '^src/layouts/' },
      to: { path: '^src/app/' },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // PAGES — Can import from layouts, widgets, features, and shared only
    // ─────────────────────────────────────────────────────────────────────────────
    {
      name: 'pages-no-app',
      comment: 'pages/ cannot import from app/',
      severity: 'error',
      from: { path: '^src/pages/' },
      to: { path: '^src/app/' },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CROSS-WIDGET IMPORTS — Widgets importing other widgets
    // This is a warning for now since it's sometimes needed (e.g., tooltip-if)
    // Consider extracting shared logic to features/ or shared/
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'widget-imports-widget',
      comment: 'Widgets importing other widgets - consider extracting to features/shared',
      severity: 'warn',
      from: { path: '^src/widgets/([^/]+)/' },
      to: { 
        path: '^src/widgets/',
        pathNot: '^src/widgets/$1/',  // Allow same-widget imports
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // GENERAL RULES
    // ═══════════════════════════════════════════════════════════════════════════
    {
      name: 'no-circular-dependencies',
      comment: 'Circular dependencies indicate poor module design',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
  ],

  options: {
    doNotFollow: {
      path: ['node_modules'],
    },
    exclude: {
      path: [
        // Test files
        '\\.test\\.(ts|tsx)$',
        '\\.spec\\.(ts|tsx)$',
        // Generated files
        'routeTree\\.gen\\.ts$',
        'src/shared/api/generated/',
        // Storybook
        '\\.stories\\.(ts|tsx)$',
      ],
    },
    includeOnly: {
      path: '^src/',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
