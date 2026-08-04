import { describe, expect, it } from 'vitest';
import { isUserIntegrationVisible } from './is-user-integration-visible';

describe('isUserIntegrationVisible', () => {
  it('includes an OAuth-only integration', () => {
    expect(
      isUserIntegrationVisible({
        configSchema: {
          authType: 'OAUTH',
          oauth: { clientRegistration: 'automatic' },
          userFields: [],
        },
      }),
    ).toBe(true);
  });

  it('includes integrations with editable user fields', () => {
    expect(
      isUserIntegrationVisible({
        configSchema: {
          authType: 'CUSTOM',
          userFields: [
            {
              key: 'token',
              label: 'Token',
              type: 'secret',
              headerName: 'X-Token',
              required: true,
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('excludes integrations with only fixed user fields', () => {
    expect(
      isUserIntegrationVisible({
        configSchema: {
          authType: 'CUSTOM',
          userFields: [
            {
              key: 'fixed',
              label: 'Fixed',
              type: 'text',
              headerName: 'X-Fixed',
              required: true,
              value: 'provided-by-marketplace',
            },
          ],
        },
      }),
    ).toBe(false);
  });
});
