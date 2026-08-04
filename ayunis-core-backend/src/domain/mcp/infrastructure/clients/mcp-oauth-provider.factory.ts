import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, type UUID } from 'crypto';
import {
  auth,
  type OAuthClientInformationContext,
  type OAuthClientMetadata,
  type OAuthClientProvider,
  type OAuthDiscoveryState,
  type StoredOAuthClientInformation,
  type StoredOAuthTokens,
} from '@modelcontextprotocol/client';
import { McpCredentialEncryptionPort } from '../../application/ports/mcp-credential-encryption.port';
import { McpOAuthClientRegistrationRepositoryPort } from '../../application/ports/mcp-oauth-client-registration.repository.port';
import { McpOAuthPendingSessionRepositoryPort } from '../../application/ports/mcp-oauth-pending-session.repository.port';
import { McpOAuthUserTokenRepositoryPort } from '../../application/ports/mcp-oauth-user-token.repository.port';
import { McpOAuthClientRegistration } from '../../domain/mcp-oauth-client-registration.entity';
import { McpOAuthPendingSession } from '../../domain/mcp-oauth-pending-session.entity';
import { McpOAuthUserToken } from '../../domain/mcp-oauth-user-token.entity';
import type { SchemaConfiguredMcpIntegration } from '../../domain/integrations/schema-configured-mcp-integration.entity';
import type {
  DeleteLockedMcpOAuthUserToken,
  SaveLockedMcpOAuthUserToken,
} from '../../application/ports/mcp-oauth-user-token.repository.port';
import { McpUserAuthorizationRequiredError } from '../../application/mcp.errors';
import { McpOAuthFetchPort } from '../../application/ports/mcp-oauth-fetch.port';

export interface McpOAuthProviderContext {
  integration: SchemaConfiguredMcpIntegration;
  userId: UUID;
  orgId: UUID;
  state?: string;
  pendingSession?: McpOAuthPendingSession;
  lockedToken?: McpOAuthUserToken | null;
  saveLockedToken?: SaveLockedMcpOAuthUserToken;
  deleteLockedToken?: DeleteLockedMcpOAuthUserToken;
}

@Injectable()
export class McpOAuthProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly encryption: McpCredentialEncryptionPort,
    private readonly registrations: McpOAuthClientRegistrationRepositoryPort,
    private readonly tokens: McpOAuthUserTokenRepositoryPort,
    private readonly pendingSessions: McpOAuthPendingSessionRepositoryPort,
    private readonly oauthFetch: McpOAuthFetchPort,
  ) {}

  create(context: McpOAuthProviderContext): DurableMcpOAuthProvider {
    return new DurableMcpOAuthProvider(
      context,
      this.redirectUri(),
      this.clientMetadataUrl(),
      this.encryption,
      this.registrations,
      this.tokens,
      this.pendingSessions,
    );
  }

  async prepareRuntime(
    context: McpOAuthProviderContext,
  ): Promise<DurableMcpOAuthProvider> {
    const refreshFailed = await this.tokens.withLockedToken(
      context.integration.id,
      context.userId,
      async (current, save, deleteLocked) => {
        if (!current?.isExpired() || !current.encryptedRefreshToken) {
          return false;
        }
        let tokenDeleted = false;
        const deleteToken = async (): Promise<void> => {
          if (tokenDeleted) return;
          await deleteLocked();
          tokenDeleted = true;
        };
        const provider = this.create({
          ...context,
          lockedToken: current,
          saveLockedToken: save,
          deleteLockedToken: deleteToken,
        });
        try {
          const result = await auth(provider, {
            serverUrl: context.integration.serverUrl,
            fetchFn: this.oauthFetch.fetch,
          });
          if (result === 'AUTHORIZED') return false;
        } catch {
          // The unusable grant is removed below while its row lock is held.
        }
        await deleteToken();
        return true;
      },
    );
    if (refreshFailed) {
      throw new McpUserAuthorizationRequiredError(
        context.integration.id,
        context.integration.name,
      );
    }
    return this.create(context);
  }

  private redirectUri(): string {
    const baseUrl = this.config.getOrThrow<string>('mcp.frontendBaseUrl');
    this.assertPublicUrl(baseUrl, 'FRONTEND_BASEURL');
    return new URL('/settings/integrations/oauth/callback', baseUrl).toString();
  }

  private clientMetadataUrl(): string | undefined {
    const baseUrl = this.config.getOrThrow<string>('mcp.backendBaseUrl');
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') return undefined;
    return new URL(
      '/api/mcp-integrations/oauth/client-metadata.json',
      url,
    ).toString();
  }

  private assertPublicUrl(value: string, name: string): void {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (url.protocol === 'https:') return;
    if (this.config.get<boolean>('app.isDevelopment') && local) return;
    throw new Error(`${name} must be a public HTTPS URL`);
  }
}

export class DurableMcpOAuthProvider implements OAuthClientProvider {
  private authorizationUrl?: URL;
  private verifier?: string;
  private discovery?: OAuthDiscoveryState;

  constructor(
    private readonly context: McpOAuthProviderContext,
    public readonly redirectUrl: string,
    public readonly clientMetadataUrl: string | undefined,
    private readonly encryption: McpCredentialEncryptionPort,
    private readonly registrations: McpOAuthClientRegistrationRepositoryPort,
    private readonly tokenRepository: McpOAuthUserTokenRepositoryPort,
    private readonly pendingSessions: McpOAuthPendingSessionRepositoryPort,
  ) {}

  get clientMetadata(): OAuthClientMetadata {
    const scope =
      this.context.integration.configSchema.oauth?.scopes?.join(' ');
    return {
      redirect_uris: [this.redirectUrl],
      client_name: 'Ayunis Core',
      client_uri: new URL(this.redirectUrl).origin,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      scope: scope || undefined,
    };
  }

  state(): string {
    if (!this.context.state) throw new Error('OAuth state is unavailable');
    return this.context.state;
  }

  async clientInformation(
    ctx?: OAuthClientInformationContext,
  ): Promise<StoredOAuthClientInformation | undefined> {
    if (!ctx?.issuer) return undefined;
    let registration = await this.registrations.findByIntegrationAndIssuer(
      this.context.integration.id,
      ctx.issuer,
    );
    registration ??= await this.registrations.bindUnboundToIssuer(
      this.context.integration.id,
      ctx.issuer,
    );
    registration ??= await this.registrations.findByIntegrationAndIssuer(
      this.context.integration.id,
      ctx.issuer,
    );
    if (!registration) {
      if (
        this.context.integration.configSchema.oauth?.clientRegistration ===
        'static'
      ) {
        throw new Error(
          'Static OAuth client is not registered for the discovered issuer',
        );
      }
      return undefined;
    }
    return {
      client_id: registration.clientId,
      client_secret: registration.encryptedClientSecret
        ? await this.encryption.decrypt(registration.encryptedClientSecret)
        : undefined,
      client_secret_expires_at: registration.clientSecretExpiresAt
        ? Math.floor(registration.clientSecretExpiresAt.getTime() / 1000)
        : undefined,
      issuer: ctx.issuer,
    };
  }

  async saveClientInformation(
    client: StoredOAuthClientInformation,
    ctx?: OAuthClientInformationContext,
  ): Promise<void> {
    const issuer = ctx?.issuer ?? client.issuer;
    if (!issuer) throw new Error('OAuth client issuer is unavailable');
    const existing = await this.resolveRegistrationForSave(issuer);
    const encryptedClientSecret = await this.encryptOptional(
      client.client_secret,
    );
    await this.registrations.save(
      new McpOAuthClientRegistration({
        id: existing?.id,
        integrationId: this.context.integration.id,
        issuer,
        registrationMode: this.clientRegistrationMode() ?? 'automatic',
        clientId: client.client_id,
        encryptedClientSecret,
        clientSecretExpiresAt: this.fromEpochSeconds(
          client.client_secret_expires_at,
        ),
        discoveryMetadata: this.discovery as unknown as
          Record<string, unknown> | undefined,
        createdAt: existing?.createdAt,
      }),
    );
  }

  async tokens(
    ctx?: OAuthClientInformationContext,
  ): Promise<StoredOAuthTokens | undefined> {
    const stored =
      this.context.lockedToken ??
      (await this.tokenRepository.findByIntegrationAndUser(
        this.context.integration.id,
        this.context.userId,
      ));
    if (!stored || (ctx?.issuer && stored.issuer !== ctx.issuer))
      return undefined;
    const secondsRemaining = stored.expiresAt
      ? Math.max(
          0,
          Math.floor((stored.expiresAt.getTime() - Date.now()) / 1000),
        )
      : undefined;
    return {
      access_token: await this.encryption.decrypt(stored.encryptedAccessToken),
      refresh_token: stored.encryptedRefreshToken
        ? await this.encryption.decrypt(stored.encryptedRefreshToken)
        : undefined,
      token_type: stored.tokenType ?? 'Bearer',
      expires_in: secondsRemaining,
      scope: stored.scopes.length ? stored.scopes.join(' ') : undefined,
      issuer: stored.issuer,
    };
  }

  async saveTokens(
    tokens: StoredOAuthTokens,
    ctx?: OAuthClientInformationContext,
  ): Promise<void> {
    const issuer = ctx?.issuer ?? tokens.issuer;
    if (!issuer) throw new Error('OAuth token issuer is unavailable');
    const current = await this.currentTokenForSave();
    const encryptedRefreshToken =
      (await this.encryptOptional(tokens.refresh_token)) ??
      current?.encryptedRefreshToken;
    const token = new McpOAuthUserToken({
      id: current?.id,
      integrationId: this.context.integration.id,
      userId: this.context.userId,
      issuer,
      encryptedAccessToken: await this.encryption.encrypt(tokens.access_token),
      encryptedRefreshToken,
      expiresAt:
        tokens.expires_in !== undefined
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
      tokenType: tokens.token_type,
      scopes: tokens.scope?.split(/\s+/),
      createdAt: current?.createdAt,
    });
    await this.persistToken(token);
  }

  async redirectToAuthorization(url: URL): Promise<void> {
    this.authorizationUrl = url;
    await this.persistPendingSession();
  }

  saveCodeVerifier(codeVerifier: string): void {
    this.verifier = codeVerifier;
  }

  async codeVerifier(): Promise<string> {
    if (this.context.pendingSession) {
      return this.encryption.decrypt(
        this.context.pendingSession.encryptedCodeVerifier,
      );
    }
    if (!this.verifier) throw new Error('OAuth code verifier is unavailable');
    return this.verifier;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    this.discovery = state;
    const issuer =
      state.authorizationServerMetadata?.issuer ?? state.authorizationServerUrl;
    let existing = await this.registrations.findByIntegrationAndIssuer(
      this.context.integration.id,
      issuer,
    );
    if (
      !existing &&
      this.context.integration.configSchema.oauth?.clientRegistration ===
        'static'
    ) {
      existing = await this.registrations.bindUnboundToIssuer(
        this.context.integration.id,
        issuer,
      );
    }
    if (existing) {
      existing.discoveryMetadata = state as unknown as Record<string, unknown>;
      await this.registrations.save(existing);
    }
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    if (this.context.pendingSession) {
      const registration = await this.registrations.findByIntegrationAndIssuer(
        this.context.integration.id,
        this.context.pendingSession.issuer,
      );
      return registration?.discoveryMetadata as OAuthDiscoveryState | undefined;
    }
    return this.discovery;
  }

  async invalidateCredentials(
    scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery',
  ): Promise<void> {
    if (scope === 'tokens' || scope === 'all') {
      await this.deleteTokens();
    }
  }

  getAuthorizationUrl(): URL | undefined {
    return this.authorizationUrl;
  }

  private async resolveRegistrationForSave(
    issuer: string,
  ): Promise<McpOAuthClientRegistration | null> {
    const existing = await this.registrations.findByIntegrationAndIssuer(
      this.context.integration.id,
      issuer,
    );
    if (existing || this.clientRegistrationMode() !== 'static') return existing;
    return this.registrations.bindUnboundToIssuer(
      this.context.integration.id,
      issuer,
    );
  }

  private clientRegistrationMode(): 'automatic' | 'static' | undefined {
    return this.context.integration.configSchema.oauth?.clientRegistration;
  }

  private async encryptOptional(value?: string): Promise<string | undefined> {
    return value ? this.encryption.encrypt(value) : undefined;
  }

  private fromEpochSeconds(value?: number): Date | undefined {
    return value ? new Date(value * 1000) : undefined;
  }

  private async currentTokenForSave(): Promise<McpOAuthUserToken | null> {
    if (this.context.saveLockedToken) return this.context.lockedToken ?? null;
    return this.tokenRepository.findByIntegrationAndUser(
      this.context.integration.id,
      this.context.userId,
    );
  }

  private async persistToken(token: McpOAuthUserToken): Promise<void> {
    if (this.context.saveLockedToken) {
      await this.context.saveLockedToken(token);
      return;
    }
    await this.tokenRepository.save(token);
  }

  private async deleteTokens(): Promise<void> {
    if (this.context.deleteLockedToken) {
      await this.context.deleteLockedToken();
      return;
    }
    await this.tokenRepository.delete(
      this.context.integration.id,
      this.context.userId,
    );
  }

  private async persistPendingSession(): Promise<void> {
    const state = this.context.state;
    const verifier = this.verifier;
    const discovery = this.discovery;
    if (!state || !verifier || !discovery) {
      throw new Error('OAuth authorization session is incomplete');
    }
    const issuer =
      discovery.authorizationServerMetadata?.issuer ??
      discovery.authorizationServerUrl;
    await this.pendingSessions.save(
      new McpOAuthPendingSession({
        stateHash: createHash('sha256').update(state).digest('hex'),
        encryptedCodeVerifier: await this.encryption.encrypt(verifier),
        redirectUri: this.redirectUrl,
        integrationId: this.context.integration.id,
        orgId: this.context.orgId,
        userId: this.context.userId,
        issuer,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }),
    );
  }
}
