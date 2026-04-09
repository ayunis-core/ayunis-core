import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { McpOAuthAuthorizationState } from '../../application/ports/mcp-oauth-state.port';
import { McpOAuthStatePort } from '../../application/ports/mcp-oauth-state.port';
import { McpOAuthStateInvalidError } from '../../application/mcp.errors';

/**
 * JWT-based implementation of {@link McpOAuthStatePort}.
 *
 * Signs the OAuth authorization state into a HS256 JWT using the
 * `MCP_OAUTH_STATE_SECRET` key configured in the module's JwtModule.
 * The token carries the full {@link McpOAuthAuthorizationState} as its
 * payload, including the PKCE `codeVerifier`, so no server-side session
 * is needed for the OAuth callback.
 */
@Injectable()
export class JwtOAuthStateAdapter extends McpOAuthStatePort {
  private readonly logger = new Logger(JwtOAuthStateAdapter.name);

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  sign(payload: McpOAuthAuthorizationState, ttlSeconds: number): string {
    this.logger.log('sign', {
      integrationId: payload.integrationId,
      level: payload.level,
    });

    return this.jwtService.sign({ ...payload }, { expiresIn: ttlSeconds });
  }

  verify(token: string): McpOAuthAuthorizationState {
    this.logger.log('verify');

    try {
      const decoded = this.jwtService.verify<McpOAuthAuthorizationState>(token);

      // Explicitly pick domain fields to strip standard JWT claims (iat, exp, etc.)
      // that JwtService.verify() adds to the decoded object. If new fields are added
      // to McpOAuthAuthorizationState, they must be added here too.
      return {
        integrationId: decoded.integrationId,
        level: decoded.level,
        orgId: decoded.orgId,
        userId: decoded.userId,
        codeVerifier: decoded.codeVerifier,
        redirectUri: decoded.redirectUri,
        returnPath: decoded.returnPath,
        nonce: decoded.nonce,
      };
    } catch (error: unknown) {
      this.logger.warn('OAuth state token verification failed', {
        error,
      });

      throw new McpOAuthStateInvalidError();
    }
  }
}
