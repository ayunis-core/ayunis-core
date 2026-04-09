import type { UUID } from 'crypto';

/**
 * Payload signed into the OAuth state JWT during the authorization round-trip.
 *
 * The `codeVerifier` is stored here so that the callback handler can recover it
 * without a server-side session. The JWT is signed with `MCP_OAUTH_STATE_SECRET`
 * (HS256) and has a short TTL (typically 10 minutes).
 */
export interface McpOAuthAuthorizationState {
  integrationId: UUID;
  level: 'org' | 'user';
  orgId: UUID;
  userId: UUID | null;
  codeVerifier: string;
  redirectUri: string;
  returnPath: string | null;
  nonce: string;
}

/**
 * Port for signing and verifying OAuth authorization state tokens.
 *
 * Implementations must produce a tamper-proof, time-limited token that
 * round-trips the {@link McpOAuthAuthorizationState} payload. The canonical
 * adapter uses a HS256 JWT via NestJS `JwtService`.
 */
export abstract class McpOAuthStatePort {
  /**
   * Signs the payload into a compact token string.
   * @param payload The authorization state to sign
   * @param ttlSeconds Time-to-live in seconds before the token expires
   * @returns A signed, opaque token string
   */
  abstract sign(
    payload: McpOAuthAuthorizationState,
    ttlSeconds: number,
  ): string;

  /**
   * Verifies and decodes a previously-signed state token.
   * @param token The token string returned from {@link sign}
   * @returns The decoded authorization state
   * @throws McpOAuthStateInvalidError if the token is expired, malformed, or tampered
   */
  abstract verify(token: string): McpOAuthAuthorizationState;
}
