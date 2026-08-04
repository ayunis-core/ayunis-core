import { randomUUID } from 'crypto';
import { McpOAuthClientRegistration } from './mcp-oauth-client-registration.entity';

describe('McpOAuthClientRegistration', () => {
  it('preserves issuer-bound registration details and discovery metadata', () => {
    const integrationId = randomUUID();
    const expiresAt = new Date('2027-01-01T00:00:00.000Z');
    const registration = new McpOAuthClientRegistration({
      integrationId,
      issuer: 'https://login.example.gov',
      registrationMode: 'automatic',
      clientId: 'ayunis-mcp-client',
      encryptedClientSecret: 'encrypted-secret',
      clientSecretExpiresAt: expiresAt,
      discoveryMetadata: {
        token_endpoint: 'https://login.example.gov/oauth/token',
      },
    });

    expect(registration.integrationId).toBe(integrationId);
    expect(registration.clientSecretExpiresAt).toEqual(expiresAt);
    expect(registration.discoveryMetadata).toEqual({
      token_endpoint: 'https://login.example.gov/oauth/token',
    });
  });
});
