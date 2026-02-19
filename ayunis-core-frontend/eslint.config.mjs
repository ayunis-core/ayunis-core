// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      '.dependency-cruiser.cjs',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'src/app/routeTree.gen.ts',
      'src/shared/api/generated/**',
      'src/shared/scripts/**',
      'vite.config.js',
      '*.config.js',
      '*.config.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.{ts,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Promoted from off/warn → error
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',

      // New rules (error)
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      'eqeqeq': 'error',
      'unused-imports/no-unused-imports': 'error',

      // New rules (warn)
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-import-type-side-effects': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Kept as-is
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Sonarjs tuning
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/prefer-read-only-props': 'warn',
      'sonarjs/no-small-switch': 'warn',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/no-selector-parameter': 'warn',
      'sonarjs/void-use': 'warn',
      'sonarjs/todo-tag': 'warn',
      'sonarjs/function-return-type': 'warn',
      'sonarjs/different-types-comparison': 'warn',
      'sonarjs/no-redundant-jump': 'warn',
      'sonarjs/no-misleading-array-reverse': 'warn',
      'sonarjs/redundant-type-aliases': 'warn',
      'sonarjs/no-nested-functions': 'warn',
      'sonarjs/no-hardcoded-passwords': 'warn',
      'sonarjs/prefer-regexp-exec': 'warn',
    },
  },
  // Relaxed rules for test files
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
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
    },
  },
);
