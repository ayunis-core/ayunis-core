// @ts-check
// Dedicated import-convention gate used by the Import Check CI workflow.
//
// Mirrors the arrangement eslint.complexity.config.mjs uses:
//   - eslint.config.mjs keeps `ayunis/no-relative-parent-imports` at `warn` so
//     the repo-wide backlog of `../` imports stays visible without failing
//     `pnpm lint`, and the pre-commit `--fix` run rewrites them on changed
//     files automatically.
//   - This config promotes the SAME rule to `error` so CI can block PRs whose
//     changed files still carry parent-relative imports — a safety net for
//     commits made with `--no-verify` or `PRECOMMIT_NO_FIX=1`.
//
// Only the one rule is enabled here, so the gate stays scoped to imports and
// will not fail on unrelated lint findings. The rule is pure syntax plus path
// arithmetic, so a lightweight parser (no type information) keeps it fast.
//
// Generated code is excluded because its imports are not ours to style. Keep
// this ignores list in sync with the equivalent entries in eslint.config.mjs.
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
      '**/db/migrations/**',
      '**/email-templates/**',
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
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'ayunis/no-relative-parent-imports': ['error', { prefix: 'src' }],
    },
  },
];
