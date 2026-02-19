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
      '.dependency-cruiser.cjs',
      'jest.setup.js',
      'src/config/env-register.js',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
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

      // Rules set to warn (many existing violations — tighten later)
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
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
    },
  },
);
