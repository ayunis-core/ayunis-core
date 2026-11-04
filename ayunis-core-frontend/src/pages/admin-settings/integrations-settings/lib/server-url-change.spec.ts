import { describe, expect, it } from 'vitest';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import { describeServerUrlChange } from './server-url-change';

function integration(oauth?: {
  clientRegistration: 'automatic' | 'static';
}): McpIntegration {
  return {
    serverUrl: 'https://projekte.stadt.de/mcp',
    configSchema: oauth
      ? { authType: 'OAUTH', orgFields: [], userFields: [], oauth }
      : { authType: 'NO_AUTH', orgFields: [], userFields: [] },
  } as unknown as McpIntegration;
}

describe('describeServerUrlChange', () => {
  it('reports no change for the same URL with surrounding whitespace', () => {
    expect(
      describeServerUrlChange(
        integration({ clientRegistration: 'static' }),
        ' https://projekte.stadt.de/mcp ',
      ),
    ).toEqual({
      changed: false,
      signsOutUsers: false,
      requiresNewOAuthClient: false,
    });
  });

  it('does not sign anyone out without OAuth', () => {
    expect(
      describeServerUrlChange(integration(), 'https://neu.stadt.de/mcp'),
    ).toEqual({
      changed: true,
      signsOutUsers: false,
      requiresNewOAuthClient: false,
    });
  });

  it('signs users out with automatic OAuth', () => {
    expect(
      describeServerUrlChange(
        integration({ clientRegistration: 'automatic' }),
        'https://neu.stadt.de/mcp',
      ),
    ).toEqual({
      changed: true,
      signsOutUsers: true,
      requiresNewOAuthClient: false,
    });
  });

  it('requires a new client with static OAuth', () => {
    expect(
      describeServerUrlChange(
        integration({ clientRegistration: 'static' }),
        'https://neu.stadt.de/mcp',
      ),
    ).toEqual({
      changed: true,
      signsOutUsers: true,
      requiresNewOAuthClient: true,
    });
  });
});
