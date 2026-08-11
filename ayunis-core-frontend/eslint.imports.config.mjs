// @ts-check
// Dedicated import-convention gate used by the Import Check CI workflow.
// Frontend counterpart of ayunis-core-backend/eslint.imports.config.mjs — see
// that file for why the rule sits at `warn` in eslint.config.mjs and `error`
// here. The only difference is the alias prefix: `@/…` rather than `src/…`.
import tseslint from 'typescript-eslint';
import noRelativeParentImports from '../eslint-rules/no-relative-parent-imports.mjs';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/generated/**',
      '**/routeTree.gen.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      ayunis: {
        rules: { 'no-relative-parent-imports': noRelativeParentImports },
      },
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'ayunis/no-relative-parent-imports': ['error', { prefix: '@' }],
    },
  },
];
