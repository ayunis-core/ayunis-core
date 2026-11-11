import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  trackOAuthIntegrationConnected,
  trackProbedIntegrationConnection,
  trackUserCredentialsConnection,
} from './openpanel-integrations';

const { request, client } = vi.hoisted(() => ({
  request: vi.fn(),
  client: {
    current: null as { track: ReturnType<typeof vi.fn> } | null,
  },
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('./openpanel', () => ({
  get openPanel() {
    return client.current;
  },
}));

const oauthSchema = {
  authType: 'OAUTH',
  oauth: { clientRegistration: 'automatic' },
};

function sentEvents() {
  return client.current?.track.mock.calls;
}

beforeEach(() => {
  client.current = { track: vi.fn().mockResolvedValue(undefined) };
});

afterEach(() => {
  vi.resetAllMocks();
});

describe(trackProbedIntegrationConnection.name, () => {
  it('sends the marketplace slug once the probe connected the integration', () => {
    trackProbedIntegrationConnection({
      marketplaceIdentifier: 'oparl',
      connectionStatus: 'connected',
    });

    expect(sentEvents()).toEqual([
      ['integration_connected', { marketplace_slug: 'oparl' }],
    ]);
  });

  it('sends null instead of anything identifying a custom integration', () => {
    trackProbedIntegrationConnection({ connectionStatus: 'connected' });

    expect(sentEvents()).toEqual([
      ['integration_connected', { marketplace_slug: null }],
    ]);
  });

  it('sends nothing when the probe failed', () => {
    trackProbedIntegrationConnection({
      marketplaceIdentifier: 'oparl',
      connectionStatus: 'error',
    });

    expect(sentEvents()).toEqual([]);
  });
});

describe(trackUserCredentialsConnection.name, () => {
  it('sends for saved credentials the integration requires', () => {
    trackUserCredentialsConnection({
      marketplaceIdentifier: 'oparl',
      userAuthorizationRequired: true,
      configSchema: { authType: 'NO_AUTH' },
    });

    expect(sentEvents()).toEqual([
      ['integration_connected', { marketplace_slug: 'oparl' }],
    ]);
  });

  it('sends nothing for optional user settings or an integration that still needs OAuth', () => {
    trackUserCredentialsConnection({
      marketplaceIdentifier: 'oparl',
      userAuthorizationRequired: false,
      configSchema: { authType: 'NO_AUTH' },
    });
    trackUserCredentialsConnection({
      marketplaceIdentifier: 'oparl',
      userAuthorizationRequired: true,
      configSchema: oauthSchema,
    });

    expect(sentEvents()).toEqual([]);
  });
});

describe(trackOAuthIntegrationConnected.name, () => {
  async function completeOAuthFor(integrationId: string) {
    trackOAuthIntegrationConnected(new QueryClient(), integrationId);
    await vi.waitFor(() => expect(request).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it("sends the connected integration's marketplace slug", async () => {
    request.mockResolvedValue([
      { id: 'integration-1', marketplaceIdentifier: 'oparl' },
      { id: 'integration-2' },
    ]);

    await completeOAuthFor('integration-1');

    expect(sentEvents()).toEqual([
      ['integration_connected', { marketplace_slug: 'oparl' }],
    ]);
  });

  it('sends nothing for an integration the user list does not contain', async () => {
    request.mockResolvedValue([
      { id: 'integration-1', marketplaceIdentifier: 'oparl' },
    ]);

    await completeOAuthFor('integration-2');

    expect(sentEvents()).toEqual([]);
  });

  it('makes no lookup request when OpenPanel is unconfigured', () => {
    client.current = null;

    trackOAuthIntegrationConnected(new QueryClient(), 'integration-1');

    expect(request).not.toHaveBeenCalled();
  });
});
