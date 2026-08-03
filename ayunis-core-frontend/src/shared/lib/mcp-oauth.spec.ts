import { describe, expect, it } from 'vitest';
import {
  getOAuthCallbackUri,
  hasOAuthConfiguration,
  parseOAuthScopes,
} from './mcp-oauth';

describe('MCP OAuth helpers', () => {
  it('normalizes and deduplicates fallback scopes', () => {
    expect(
      parseOAuthScopes(' documents:read, users:read  documents:read '),
    ).toEqual(['documents:read', 'users:read']);
  });

  it('omits empty fallback scopes', () => {
    expect(parseOAuthScopes(' ,  ')).toBeUndefined();
  });

  it('recognizes OAuth schemas', () => {
    expect(
      hasOAuthConfiguration({
        authType: 'OAUTH',
        oauth: { clientRegistration: 'automatic' },
      }),
    ).toBe(true);
    expect(hasOAuthConfiguration({ authType: 'CUSTOM' })).toBe(false);
  });

  it('builds the exact callback URI from a frontend origin', () => {
    expect(getOAuthCallbackUri('https://core.example.org/')).toBe(
      'https://core.example.org/settings/integrations/oauth/callback',
    );
  });
});
