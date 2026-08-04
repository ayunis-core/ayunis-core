import { randomUUID } from 'crypto';
import { McpOAuthUserToken } from './mcp-oauth-user-token.entity';

describe('McpOAuthUserToken', () => {
  it('normalizes token scopes and reports expiry against a reference time', () => {
    const token = new McpOAuthUserToken({
      integrationId: randomUUID(),
      userId: randomUUID(),
      issuer: 'https://login.example.gov',
      encryptedAccessToken: 'encrypted-access',
      encryptedRefreshToken: 'encrypted-refresh',
      expiresAt: new Date('2026-08-03T10:00:00.000Z'),
      tokenType: 'Bearer',
      scopes: [' openid ', 'profile', 'openid', ''],
    });

    expect(token.scopes).toEqual(['openid', 'profile']);
    expect(token.isExpired(new Date('2026-08-03T10:00:00.000Z'))).toBe(true);
  });
});
