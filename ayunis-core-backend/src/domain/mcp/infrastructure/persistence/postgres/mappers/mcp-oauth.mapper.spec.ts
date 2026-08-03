import { randomUUID } from 'crypto';
import { McpOAuthClientRegistration } from '../../../../domain/mcp-oauth-client-registration.entity';
import { McpOAuthPendingSession } from '../../../../domain/mcp-oauth-pending-session.entity';
import { McpOAuthUserToken } from '../../../../domain/mcp-oauth-user-token.entity';
import { McpOAuthClientRegistrationMapper } from './mcp-oauth-client-registration.mapper';
import { McpOAuthPendingSessionMapper } from './mcp-oauth-pending-session.mapper';
import { McpOAuthUserTokenMapper } from './mcp-oauth-user-token.mapper';

describe('MCP OAuth persistence mappers', () => {
  const now = new Date('2026-08-03T10:00:00.000Z');

  it('round-trips a client registration', () => {
    const entity = new McpOAuthClientRegistration({
      integrationId: randomUUID(),
      issuer: 'https://login.example.gov',
      registrationMode: 'automatic',
      clientId: 'ayunis-client',
      encryptedClientSecret: 'encrypted-secret',
      clientSecretExpiresAt: new Date('2027-08-03T10:00:00.000Z'),
      discoveryMetadata: { token_endpoint: 'https://login.example.gov/token' },
      createdAt: now,
      updatedAt: now,
    });

    expect(
      McpOAuthClientRegistrationMapper.toDomain(
        McpOAuthClientRegistrationMapper.toRecord(entity),
      ),
    ).toEqual(entity);
  });

  it('round-trips a user token', () => {
    const entity = new McpOAuthUserToken({
      integrationId: randomUUID(),
      userId: randomUUID(),
      issuer: 'https://login.example.gov',
      encryptedAccessToken: 'encrypted-access',
      encryptedRefreshToken: 'encrypted-refresh',
      expiresAt: new Date('2026-08-03T11:00:00.000Z'),
      tokenType: 'Bearer',
      scopes: ['openid', 'profile'],
      createdAt: now,
      updatedAt: now,
    });

    expect(
      McpOAuthUserTokenMapper.toDomain(
        McpOAuthUserTokenMapper.toRecord(entity),
      ),
    ).toEqual(entity);
  });

  it('round-trips a pending session', () => {
    const entity = new McpOAuthPendingSession({
      stateHash: 'hashed-state',
      encryptedCodeVerifier: 'encrypted-verifier',
      redirectUri: 'https://core.example.gov/api/mcp/oauth/callback',
      integrationId: randomUUID(),
      orgId: randomUUID(),
      userId: randomUUID(),
      issuer: 'https://login.example.gov',
      expiresAt: new Date('2026-08-03T10:05:00.000Z'),
      consumedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(
      McpOAuthPendingSessionMapper.toDomain(
        McpOAuthPendingSessionMapper.toRecord(entity),
      ),
    ).toEqual(entity);
  });
});
