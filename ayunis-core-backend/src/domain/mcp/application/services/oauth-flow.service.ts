import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, type UUID } from 'crypto';
import {
  exchangeAuthorization,
  refreshAuthorization,
} from '@modelcontextprotocol/sdk/client/auth.js';
import { McpOAuthStatePort } from '../ports/mcp-oauth-state.port';
import { McpIntegrationOAuthTokenRepositoryPort } from '../ports/mcp-integration-oauth-token.repository.port';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { McpIntegrationsRepositoryPort } from '../ports/mcp-integrations.repository.port';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { McpIntegrationOAuthToken } from '../../domain/mcp-integration-oauth-token.entity';
import {
  McpInvalidConfigSchemaError,
  McpOAuthClientNotConfiguredError,
  McpOAuthAuthorizationRequiredError,
  McpOAuthStateInvalidError,
  McpOAuthExchangeFailedError,
  McpIntegrationNotFoundError,
} from '../mcp.errors';
import type { IntegrationConfigSchema } from '../../domain/value-objects/integration-config-schema';

/**
 * Orchestrates the OAuth 2.1 + PKCE authorization flow for MCP integrations.
 *
 * Delegates PKCE generation, state JWT signing, and SDK-level token exchange
 * to the appropriate ports / libraries. Never hand-rolls OAuth protocol logic.
 */
@Injectable()
export class OAuthFlowService {
  private readonly logger = new Logger(OAuthFlowService.name);

  constructor(
    private readonly stateAdapter: McpOAuthStatePort,
    private readonly tokenRepository: McpIntegrationOAuthTokenRepositoryPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly integrationRepository: McpIntegrationsRepositoryPort,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Builds the OAuth authorization URL that the user should be redirected to.
   * Generates a PKCE verifier, signs it (alongside integration metadata) into
   * a state JWT, and constructs the full authorization URL with all required
   * OAuth 2.1 parameters.
   */
  buildAuthorizationUrl(
    integration: McpIntegration,
    level: 'org' | 'user',
    orgId: UUID,
    userIdOrNull: UUID | null,
  ): { url: string } {
    const configSchema = this.getOAuthConfigOrThrow(integration);

    if (!integration.oauthClientId) {
      throw new McpOAuthClientNotConfiguredError();
    }

    const backendBaseUrl = this.configService.getOrThrow<string>(
      'app.backend.baseUrl',
    );
    const redirectUri = `${backendBaseUrl}/mcp-integrations/oauth/callback`;

    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const stateToken = this.stateAdapter.sign(
      {
        integrationId: integration.id,
        level,
        orgId,
        userId: userIdOrNull,
        codeVerifier,
        redirectUri,
        nonce: randomBytes(16).toString('base64url'),
      },
      600,
    );

    const url = new URL(configSchema.oauth!.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', integration.oauthClientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', configSchema.oauth!.scopes.join(' '));
    url.searchParams.set('state', stateToken);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return { url: url.toString() };
  }

  /**
   * Handles the OAuth callback: verifies the state JWT, exchanges the
   * authorization code for tokens via the MCP SDK, encrypts and persists
   * the tokens, and returns identifying info for the controller redirect.
   */
  async handleCallback(
    code: string,
    stateToken: string,
  ): Promise<{
    integrationId: UUID;
    level: 'org' | 'user';
    userId: UUID | null;
  }> {
    const state = this.verifyStateOrThrow(stateToken);

    const integration = await this.integrationRepository.findById(
      state.integrationId,
    );
    if (!integration) {
      throw new McpIntegrationNotFoundError(state.integrationId);
    }

    const configSchema = this.getOAuthConfigOrThrow(integration);
    const decryptedClientSecret = await this.decryptClientSecret(integration);

    let tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    try {
      tokens = await exchangeAuthorization(configSchema.oauth!.tokenUrl, {
        metadata: {
          token_endpoint: new URL(configSchema.oauth!.tokenUrl),
        } as never,
        clientInformation: {
          client_id: integration.oauthClientId!,
          client_secret: decryptedClientSecret,
        },
        authorizationCode: code,
        codeVerifier: state.codeVerifier,
        redirectUri: state.redirectUri,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown exchange error';
      throw new McpOAuthExchangeFailedError(reason);
    }

    await this.upsertTokens(integration.id, state.userId, tokens);

    return {
      integrationId: state.integrationId,
      level: state.level,
      userId: state.userId,
    };
  }

  /**
   * Returns a valid (non-expired) plaintext access token for the given
   * integration and user. If the token is expired and a refresh token is
   * available, performs a lazy refresh. Otherwise throws
   * `McpOAuthAuthorizationRequiredError`.
   */
  async getValidAccessToken(
    integration: McpIntegration,
    userIdOrNull: UUID | null,
  ): Promise<string> {
    const tokenRow = await this.tokenRepository.findByIntegrationAndUser(
      integration.id,
      userIdOrNull,
    );

    if (!tokenRow) {
      throw new McpOAuthAuthorizationRequiredError(integration.id);
    }

    if (!tokenRow.isExpired()) {
      return this.credentialEncryption.decrypt(tokenRow.accessTokenEncrypted);
    }

    return this.refreshOrRequireAuth(integration, tokenRow);
  }

  /**
   * Deletes the OAuth token for the given integration and user (or org-level).
   */
  async revoke(integrationId: UUID, userIdOrNull: UUID | null): Promise<void> {
    await this.tokenRepository.deleteByIntegrationAndUser(
      integrationId,
      userIdOrNull,
    );
  }

  /**
   * Returns the authorization status for the given integration and user
   * without decrypting or returning any token values.
   */
  async getStatus(
    integrationId: UUID,
    userIdOrNull: UUID | null,
  ): Promise<{
    authorized: boolean;
    expiresAt: Date | null;
    scope: string | null;
  }> {
    const tokenRow = await this.tokenRepository.findByIntegrationAndUser(
      integrationId,
      userIdOrNull,
    );

    if (!tokenRow) {
      return { authorized: false, expiresAt: null, scope: null };
    }

    return {
      authorized: true,
      expiresAt: tokenRow.tokenExpiresAt ?? null,
      scope: tokenRow.scope ?? null,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────

  getOAuthConfigOrThrow(integration: McpIntegration): IntegrationConfigSchema {
    const configSchema = this.extractConfigSchema(integration);
    if (!configSchema?.oauth) {
      throw new McpInvalidConfigSchemaError(
        'Integration does not have OAuth configured',
      );
    }
    return configSchema;
  }

  extractConfigSchema(
    integration: McpIntegration,
  ): IntegrationConfigSchema | undefined {
    // Both MarketplaceMcpIntegration and SelfDefinedMcpIntegration expose
    // `configSchema` — use a structural check to avoid importing both.
    if ('configSchema' in integration) {
      return (
        integration as unknown as { configSchema: IntegrationConfigSchema }
      ).configSchema;
    }
    return undefined;
  }

  private verifyStateOrThrow(stateToken: string) {
    try {
      return this.stateAdapter.verify(stateToken);
    } catch {
      throw new McpOAuthStateInvalidError();
    }
  }

  private async decryptClientSecret(
    integration: McpIntegration,
  ): Promise<string> {
    if (!integration.oauthClientSecretEncrypted) {
      throw new McpOAuthClientNotConfiguredError();
    }
    return this.credentialEncryption.decrypt(
      integration.oauthClientSecretEncrypted,
    );
  }

  private async upsertTokens(
    integrationId: UUID,
    userIdOrNull: UUID | null,
    tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    },
  ): Promise<void> {
    const accessTokenEncrypted = await this.credentialEncryption.encrypt(
      tokens.access_token,
    );
    const refreshTokenEncrypted = tokens.refresh_token
      ? await this.credentialEncryption.encrypt(tokens.refresh_token)
      : undefined;
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    const existing = await this.tokenRepository.findByIntegrationAndUser(
      integrationId,
      userIdOrNull,
    );

    if (existing) {
      existing.updateTokens({
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt,
        scope: tokens.scope,
      });
      await this.tokenRepository.save(existing);
    } else {
      const token = new McpIntegrationOAuthToken({
        integrationId,
        userId: userIdOrNull,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt,
        scope: tokens.scope,
      });
      await this.tokenRepository.save(token);
    }
  }

  private async refreshOrRequireAuth(
    integration: McpIntegration,
    tokenRow: McpIntegrationOAuthToken,
  ): Promise<string> {
    if (!tokenRow.refreshTokenEncrypted) {
      await this.tokenRepository.deleteByIntegrationAndUser(
        integration.id,
        tokenRow.userId,
      );
      throw new McpOAuthAuthorizationRequiredError(integration.id);
    }

    const configSchema = this.getOAuthConfigOrThrow(integration);

    try {
      const decryptedRefreshToken = await this.credentialEncryption.decrypt(
        tokenRow.refreshTokenEncrypted,
      );
      const decryptedClientSecret = await this.decryptClientSecret(integration);

      const newTokens = await refreshAuthorization(
        configSchema.oauth!.tokenUrl,
        {
          metadata: {
            token_endpoint: new URL(configSchema.oauth!.tokenUrl),
          } as never,
          clientInformation: {
            client_id: integration.oauthClientId!,
            client_secret: decryptedClientSecret,
          },
          refreshToken: decryptedRefreshToken,
        },
      );

      await this.upsertTokens(integration.id, tokenRow.userId, newTokens);

      return newTokens.access_token;
    } catch (error) {
      this.logger.warn('OAuth refresh failed, requiring re-authorization', {
        integrationId: integration.id,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.tokenRepository.deleteByIntegrationAndUser(
        integration.id,
        tokenRow.userId,
      );
      throw new McpOAuthAuthorizationRequiredError(integration.id);
    }
  }
}
