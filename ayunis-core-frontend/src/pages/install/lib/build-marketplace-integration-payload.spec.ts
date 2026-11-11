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

  it('sends the trimmed server URL the customer entered', () => {
    expect(
      buildMarketplaceIntegrationPayload(
        'openproject',
        {},
        { authType: 'NO_AUTH' },
        { clientId: '', clientSecret: '' },
        '  https://projekte.stadt.de/mcp  ',
      ),
    ).toEqual({
      identifier: 'openproject',
      orgConfigValues: {},
      serverUrl: 'https://projekte.stadt.de/mcp',
    });
  });

  it('sends the server URL together with static OAuth client credentials', () => {
    expect(
      buildMarketplaceIntegrationPayload(
        'openproject',
        {},
        {
          authType: 'OAUTH',
          oauth: { clientRegistration: 'static', scopes: ['mcp'] },
        },
        { clientId: 'client-id', clientSecret: 'secret' },
        'https://projekte.stadt.de/mcp',
      ),
    ).toEqual({
      identifier: 'openproject',
      orgConfigValues: {},
      serverUrl: 'https://projekte.stadt.de/mcp',
      oauthClient: { clientId: 'client-id', clientSecret: 'secret' },
    });
  });

  it('omits the server URL when the marketplace fixes it', () => {
    expect(
      buildMarketplaceIntegrationPayload(
        'oparl',
        {},
        { authType: 'NO_AUTH' },
        { clientId: '', clientSecret: '' },
      ),
    ).toEqual({ identifier: 'oparl', orgConfigValues: {} });
  });
});
