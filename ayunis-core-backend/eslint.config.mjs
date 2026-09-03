// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'eslint.complexity.config.mjs',
      '.dependency-cruiser.cjs',
      'jest.setup.js',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'orval.config.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
  },
  {
    rules: {
      // Promoted to error (were off or warn)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',

      // New rules (error)
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        {
          allowDefaultCaseForExhaustiveSwitch: true,
          requireDefaultForNonUnion: false,
        },
      ],
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      eqeqeq: 'error',
      'unused-imports/no-unused-imports': 'error',

      // Complexity gate (AST-accurate replacement for the old lizard tool).
      // Thresholds mirror the previous lizard config. Kept at `warn` so the
      // existing repo-wide backlog stays visible (editor + `pnpm lint`) without
      // failing CI lint, while the pre-commit `--max-warnings=0` staged run
      // turns them into a blocking gate on changed files only — same
      // enforcement scope as lizard, but without its TS segmentation bug.
      // `max-params` is intentionally NOT gated on changed files (it is
      // suppressed in the pre-commit run): NestJS DI constructors legitimately
      // need >5 injected dependencies. It stays `warn` purely for visibility.
      complexity: ['warn', 10],
      'max-lines-per-function': [
        'warn',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['warn', 5],

      // Rules set to warn (many existing violations — tighten later)
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      // Only flag `||` on non-primitive operands, where `??` is genuinely the
      // intended nullish coalescing. Primitive falsy-defaults (e.g.
      // `process.env.PORT || 3000`) are intentional and `??` would change behavior.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'warn',
        { ignorePrimitives: true },
      ],
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      // Absolute imports only. `./sibling` stays fine; parent traversal does not.
      // `warn` keeps the pre-existing backlog visible without failing repo-wide
      // lint, while the pre-commit `--max-warnings=0` staged run blocks it on
      // changed files.
      '@typescript-eslint/no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['..', '../*', '../**'],
              message:
                "Use the absolute 'src/...' path instead of a relative import.",
            },
          ],
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Sonarjs overrides — warn for noisy/false-positive-prone rules
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/todo-tag': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/function-return-type': 'warn',
      'sonarjs/no-clear-text-protocols': 'warn',
      'sonarjs/different-types-comparison': 'warn',
      'sonarjs/no-small-switch': 'warn',
      'sonarjs/prefer-regexp-exec': 'warn',
      'sonarjs/content-length': 'warn',
      'sonarjs/constructor-for-side-effects': 'warn',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/slow-regex': 'warn',
      'sonarjs/no-control-regex': 'warn',
      'sonarjs/no-alphabetical-sort': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/use-type-alias': 'warn',
      'sonarjs/redundant-type-aliases': 'warn',
      'sonarjs/no-undefined-argument': 'warn',
      'sonarjs/duplicates-in-character-class': 'warn',
      'sonarjs/no-hardcoded-passwords': 'warn',
    },
  },
  {
    files: ['src/**/*.ts'],
    // Pino is an implementation detail of the logging boundary. Application
    // code logs through `Logger` from @nestjs/common, which bootstrap points
    // at the Pino adapter via installNestLogger.
    ignores: ['src/common/logger/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'nestjs-pino',
              message:
                'Use Logger from @nestjs/common. nestjs-pino belongs to src/common/logger.',
            },
          ],
          patterns: [
            {
              group: ['pino', 'pino/*', 'pino-http', 'pino-pretty'],
              message: 'Pino configuration belongs in src/common/logger.',
            },
          ],
        },
      ],
      // Nest treats a logger call's last argument as the context, so
      // `logger.log('msg', { id })` silently drops the metadata instead of
      // emitting structured fields.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression:matches([callee.object.name=/[Ll]ogger$/], [callee.object.property.name=/[Ll]ogger$/])[callee.property.name=/^(log|warn|error|debug|verbose|fatal)$/][arguments.0.type='Literal'][arguments.1.type='ObjectExpression']",
          message:
            'Pass log metadata as the first argument: logger.log({ id }, "message").',
        },
      ],
    },
  },
  // Relaxed rules for test files
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'no-console': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      // Tests legitimately have long setup blocks and many params.
      complexity: 'off',
      'max-lines-per-function': 'off',
      'max-params': 'off',
    },
  },
  // Files excluded from the complexity gate. Mirrors the exclusion set the old
  // lizard check applied: generated API clients, TypeORM entities/records
  // (decorator-heavy), DB migrations (auto-generated, long up()/down()), MJML
  // email templates (long template strings), CQRS data carriers
  // (command/query/event constructors with many params), raw SQL query builders,
  // and the unicode sanitizer (long flat `.replace()` chains).
  {
    files: [
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
    ],
    rules: {
      complexity: 'off',
      'max-lines-per-function': 'off',
      'max-params': 'off',
    },
  },
);
