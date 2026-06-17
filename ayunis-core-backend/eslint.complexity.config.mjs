// @ts-check
// Dedicated complexity gate used by the Complexity Check CI workflow.
//
// This is intentionally separate from eslint.config.mjs:
//   - eslint.config.mjs keeps `complexity` / `max-lines-per-function` at `warn`
//     so the repo-wide backlog stays visible without failing CI lint, and the
//     pre-commit `--max-warnings=0` run gates changed files locally.
//   - This config promotes the SAME thresholds to `error` so CI can block PRs
//     whose changed files exceed them — a safety net for commits made with
//     `--no-verify` (the AST-accurate replacement for the old lizard CI step).
//
// Only the two complexity rules are enabled here, so the gate stays scoped to
// complexity (it will not fail on unrelated lint rules). These are core ESLint
// rules that operate purely on syntax, so a lightweight parser (no type
// information / projectService) is enough and keeps the check fast.
//
// `max-params` is deliberately omitted: NestJS DI constructors legitimately
// need >5 injected dependencies (it stays a non-blocking `warn` in
// eslint.config.mjs).
//
// The `ignores` list mirrors the exclusion set the old lizard check applied and
// the override in eslint.config.mjs. Keep the two in sync.
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/generated/**',
      '**/*.entity.ts',
      '**/*.record.ts',
      '**/db/migrations/**',
      '**/email-templates/**',
      '**/*.command.ts',
      '**/*.query.ts',
      '**/*.db-query.ts',
      '**/*.event.ts',
      '**/unicode-sanitizer.ts',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.e2e-spec.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    // Register the plugins referenced by inline `eslint-disable` directives in
    // the source (so they resolve and don't raise "rule definition not found"),
    // but enable none of their rules — only the two core complexity rules below.
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      sonarjs,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    linterOptions: {
      // Disable directives for the (intentionally unenabled) rules above would
      // otherwise be flagged as "unused"; that noise is irrelevant to the gate.
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      complexity: ['error', 10],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
    },
  },
];
