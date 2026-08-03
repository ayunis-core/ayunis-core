import { describe, expect, it } from 'vitest';
import {
  canDisconnectOAuth,
  resolveIntegrationOAuthAction,
} from './resolve-integration-oauth-action';

const oauthSchema = {
  authType: 'OAUTH',
  oauth: { clientRegistration: 'automatic' as const },
  userFields: [],
};

describe('resolveIntegrationOAuthAction', () => {
  it('connects an OAuth-only integration', () => {
    expect(
      resolveIntegrationOAuthAction({
        configSchema: oauthSchema,
        userAuthorized: false,
      }),
    ).toBe('connect');
  });

  it('collects user fields before connecting a combined integration', () => {
    expect(
      resolveIntegrationOAuthAction({
        configSchema: {
          ...oauthSchema,
          userFields: [
            {
              key: 'tenant',
              label: 'Tenant',
              type: 'text',
              headerName: 'X-Tenant',
              required: true,
            },
          ],
        },
        userAuthorized: false,
      }),
    ).toBe('configureThenConnect');
  });

  it('reconnects and allows disconnecting an authorized integration', () => {
    const integration = {
      configSchema: oauthSchema,
      userAuthorized: true,
    };
    expect(resolveIntegrationOAuthAction(integration)).toBe('reconnect');
    expect(canDisconnectOAuth(integration)).toBe(true);
  });
});
