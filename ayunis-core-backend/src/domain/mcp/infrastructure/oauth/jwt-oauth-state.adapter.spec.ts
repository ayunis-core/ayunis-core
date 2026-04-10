import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type { McpOAuthAuthorizationState } from '../../application/ports/mcp-oauth-state.port';
import { JwtOAuthStateAdapter } from './jwt-oauth-state.adapter';
import { McpOAuthStateInvalidError } from '../../application/mcp.errors';

describe('JwtOAuthStateAdapter', () => {
  const secret = 'test-secret-for-oauth-state-signing';
  let adapter: JwtOAuthStateAdapter;

  const buildPayload = (): McpOAuthAuthorizationState => ({
    integrationId: randomUUID(),
    level: 'org',
    orgId: randomUUID(),
    userId: null,
    codeVerifier: 'test-code-verifier-abc123',
    redirectUri: 'http://localhost:3000/api/mcp-integrations/oauth/callback',
    returnPath: '/settings/integrations?tab=mcp',
    nonce: 'test-nonce-xyz',
  });

  beforeEach(() => {
    const jwtService = new JwtService({ secret });
    adapter = new JwtOAuthStateAdapter(jwtService);
  });

  it('should round-trip sign and verify a payload', () => {
    const payload = buildPayload();
    const token = adapter.sign(payload, 600);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format

    const decoded = adapter.verify(token);

    expect(decoded).toEqual(payload);
  });

  it('should round-trip a user-level payload with non-null userId', () => {
    const payload: McpOAuthAuthorizationState = {
      ...buildPayload(),
      level: 'user',
      userId: randomUUID(),
    };

    const token = adapter.sign(payload, 600);
    const decoded = adapter.verify(token);

    expect(decoded).toEqual(payload);
  });

  it('should throw McpOAuthStateInvalidError on expired token', async () => {
    const payload = buildPayload();

    // Sign with a 1-second TTL
    const jwtService = new JwtService({ secret });
    const shortLivedAdapter = new JwtOAuthStateAdapter(jwtService);
    const token = shortLivedAdapter.sign(payload, 1);

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(() => shortLivedAdapter.verify(token)).toThrow(
      McpOAuthStateInvalidError,
    );
  });

  it('should throw McpOAuthStateInvalidError on tampered token', () => {
    const payload = buildPayload();
    const token = adapter.sign(payload, 600);

    // Tamper with the payload section
    const parts = token.split('.');
    parts[1] = parts[1] + 'TAMPERED';
    const tamperedToken = parts.join('.');

    expect(() => adapter.verify(tamperedToken)).toThrow(
      McpOAuthStateInvalidError,
    );
  });

  it('should throw McpOAuthStateInvalidError on token signed with different secret', () => {
    const payload = buildPayload();

    const otherJwtService = new JwtService({ secret: 'different-secret' });
    const otherAdapter = new JwtOAuthStateAdapter(otherJwtService);
    const token = otherAdapter.sign(payload, 600);

    expect(() => adapter.verify(token)).toThrow(McpOAuthStateInvalidError);
  });

  it('should throw McpOAuthStateInvalidError on malformed token', () => {
    expect(() => adapter.verify('not-a-jwt')).toThrow(
      McpOAuthStateInvalidError,
    );
  });
});
