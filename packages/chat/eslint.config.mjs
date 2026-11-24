import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: ['@/*', '**/ayunis-core-frontend/**', '../*'] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Identifier[name=/(outlook|excel|powerpoint|wordPane|officePane|webChat|visitorChat|embeddedChat)/i]',
          message: 'Configure chat through host capabilities and slots.',
        },
        {
          selector:
            'Literal[value=/^(web|outlook|excel|powerpoint|word|office|visitor|embedded)($|[ _.:-])/i]',
          message: 'Keep surface names in the host configuration.',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
);
