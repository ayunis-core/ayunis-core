import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import type { ConfigArray } from 'typescript-eslint';

const config: ConfigArray = tseslint.config(
  {
    ignores: [
      'node_modules',
      'test-results',
      'playwright-report',
      'src/clients/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts', 'src/**/*.ts'],
  },
  {
    files: ['tests/**/*.ts', 'src/**/*.ts'],
    rules: {
      // Flake sources — never wait on wall-clock time or force-click.
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      // Helpers that assert internally count as assertions.
      'playwright/expect-expect': [
        'warn',
        { assertFunctionNames: ['startThread'] },
      ],
      // The UI is i18n'd (German by default) and Chrome auto-translate can
      // rewrite DOM text: text selectors are banned, use testids/roles.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='getByText']",
          message:
            'Text selectors break across locales — use getByTestId or getByRole (add a data-testid to the frontend if missing).',
        },
        {
          selector:
            "CallExpression[callee.property.name='locator'] > Literal[value=/^text=/]",
          message:
            'Text selectors break across locales — use getByTestId or getByRole (add a data-testid to the frontend if missing).',
        },
      ],
    },
  },
);

export default config;
