import { OAuthMcpIntegrationAuth } from './oauth-mcp-integration-auth.entity';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';

describe('OAuthMcpIntegrationAuth', () => {
  it('should expose method metadata', () => {
    const auth = new OAuthMcpIntegrationAuth();

    expect(auth.getMethod()).toBe(McpAuthMethod.OAUTH);
    expect(auth.getAuthHeaderName()).toBe('Authorization');
    expect(auth.hasCredentials()).toBe(false);
  });

  it('should manage client credentials and tokens', () => {
    const auth = new OAuthMcpIntegrationAuth();
    auth.setClientCredentials('client', 'secret');

    expect(auth.clientId).toBe('client');
    expect(auth.clientSecret).toBe('secret');
    expect(auth.hasCredentials()).toBe(true);

    const now = new Date();
    const expiry = new Date(now.getTime() + 60_000);
    auth.updateTokens({
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenExpiresAt: expiry,
    });

    expect(auth.accessToken).toBe('access');
    expect(auth.refreshToken).toBe('refresh');
    expect(auth.tokenExpiresAt).toEqual(expiry);
    expect(auth.isTokenExpired(new Date(expiry.getTime() - 1000))).toBe(false);
    expect(auth.isTokenExpired(new Date(expiry.getTime() + 1000))).toBe(true);

    auth.clearTokens();
    expect(auth.accessToken).toBeUndefined();
    expect(auth.refreshToken).toBeUndefined();
    expect(auth.tokenExpiresAt).toBeUndefined();
  });
});
