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
            ':matches(Identifier, JSXIdentifier)[name=/^(web|outlook|excel|powerpoint|office|visitor|embedded)$/i]',
          message: 'Configure chat through host capabilities and slots.',
        },
        {
          // Keep this case-sensitive: /i would make [A-Z] match lowercase.
          selector:
            ':matches(Identifier, JSXIdentifier)[name=/(^|[_$])(outlook|excel|power[Pp]oint|office|visitor|embedded)([_$]|[A-Z])|(Outlook|Excel|PowerPoint|Office|Visitor|Embedded)($|[_$]|[A-Z])|(^|[_$])(OUTLOOK|EXCEL|POWERPOINT|OFFICE|VISITOR|EMBEDDED)($|[_$])/]',
          message: 'Configure chat through host capabilities and slots.',
        },
        {
          selector:
            ':matches(Identifier, JSXIdentifier)[name=/(web|word)(Pane|Host|Chat|Surface|App|Client)/i]',
          message: 'Configure chat through host capabilities and slots.',
        },
        {
          selector:
            'Literal[value=/^(web|outlook|excel|powerpoint|word|office|visitor|embedded)($|[ _.:-])/i]',
          message: 'Keep surface names in the host configuration.',
        },
        {
          selector:
            'TemplateElement[value.raw=/^(web|outlook|excel|powerpoint|word|office|visitor|embedded)($|[ _.:-])/i]',
          message: 'Keep surface names in the host configuration.',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
);
