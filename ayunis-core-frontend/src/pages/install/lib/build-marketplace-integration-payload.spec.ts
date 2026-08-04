import { describe, expect, it } from 'vitest';
import { buildMarketplaceIntegrationPayload } from './build-marketplace-integration-payload';

describe('buildMarketplaceIntegrationPayload', () => {
  it('adds static OAuth client credentials without an empty secret', () => {
    expect(
      buildMarketplaceIntegrationPayload(
        'documents',
        { tenant: 'council' },
        {
          authType: 'OAUTH',
          oauth: { clientRegistration: 'static', scopes: ['documents:read'] },
        },
        { clientId: ' client-id ', clientSecret: ' ' },
      ),
    ).toEqual({
      identifier: 'documents',
      orgConfigValues: { tenant: 'council' },
      oauthClient: { clientId: 'client-id' },
    });
  });

  it('does not send client credentials for automatic registration', () => {
    expect(
      buildMarketplaceIntegrationPayload(
        'documents',
        {},
        {
          authType: 'OAUTH',
          oauth: { clientRegistration: 'automatic' },
        },
        { clientId: 'ignored', clientSecret: 'ignored' },
      ),
    ).toEqual({ identifier: 'documents', orgConfigValues: {} });
  });
});
