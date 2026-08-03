import { randomUUID } from 'crypto';
import { McpOAuthPendingSession } from './mcp-oauth-pending-session.entity';

describe('McpOAuthPendingSession', () => {
  it('tracks expiry and consumption independently', () => {
    const session = new McpOAuthPendingSession({
      stateHash: 'hashed-state',
      encryptedCodeVerifier: 'encrypted-verifier',
      redirectUri: 'https://core.example.gov/api/mcp/oauth/callback',
      integrationId: randomUUID(),
      orgId: randomUUID(),
      userId: randomUUID(),
      issuer: 'https://login.example.gov',
      expiresAt: new Date('2026-08-03T10:05:00.000Z'),
    });

    expect(session.isExpired(new Date('2026-08-03T10:05:00.000Z'))).toBe(true);
    expect(session.isConsumed).toBe(false);

    session.consume(new Date('2026-08-03T10:01:00.000Z'));

    expect(session.isConsumed).toBe(true);
  });
});
