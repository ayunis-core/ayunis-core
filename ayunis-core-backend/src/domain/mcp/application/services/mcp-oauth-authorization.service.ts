import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { UUID } from 'crypto';
import {
  auth,
  discoverOAuthProtectedResourceMetadata,
} from '@modelcontextprotocol/client';
import { ContextService } from 'src/common/context/services/context.service';
import { SchemaConfiguredMcpIntegration } from '../../domain/integrations/schema-configured-mcp-integration.entity';
import { McpOAuthProviderFactory } from '../../infrastructure/clients/mcp-oauth-provider.factory';
import { McpCapabilityCacheService } from './mcp-capability-cache.service';
import { ValidateIntegrationAccessService } from './validate-integration-access.service';
import { McpOAuthPendingSessionRepositoryPort } from '../ports/mcp-oauth-pending-session.repository.port';
import { McpOAuthUserTokenRepositoryPort } from '../ports/mcp-oauth-user-token.repository.port';
import { McpOAuthClientRegistrationRepositoryPort } from '../ports/mcp-oauth-client-registration.repository.port';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { McpOAuthFetchPort } from '../ports/mcp-oauth-fetch.port';

export interface CompleteMcpOAuthInput {
  state: string;
  code?: string;
  iss?: string;
  error?: string;
}

@Injectable()
export class McpOAuthAuthorizationService {
  constructor(
    private readonly access: ValidateIntegrationAccessService,
    private readonly context: ContextService,
    private readonly providerFactory: McpOAuthProviderFactory,
    private readonly pendingSessions: McpOAuthPendingSessionRepositoryPort,
    private readonly tokens: McpOAuthUserTokenRepositoryPort,
    private readonly registrations: McpOAuthClientRegistrationRepositoryPort,
    private readonly encryption: McpCredentialEncryptionPort,
    private readonly capabilityCache: McpCapabilityCacheService,
    private readonly oauthFetch: McpOAuthFetchPort,
  ) {}

  async authorize(integrationId: UUID): Promise<{ authorizationUrl: string }> {
    const integration = this.requireOAuthIntegration(
      await this.access.validate(integrationId),
    );
    await this.requireProtectedResourceMetadata(integration.serverUrl);
    const identity = this.requireIdentity();
    const provider = this.providerFactory.create({
      integration,
      ...identity,
      state: randomBytes(32).toString('base64url'),
    });
    const scope = integration.configSchema.oauth?.scopes?.join(' ');
    const result = await auth(provider, {
      serverUrl: integration.serverUrl,
      scope: scope || undefined,
      fetchFn: this.oauthFetch.fetch,
    });
    const authorizationUrl = provider.getAuthorizationUrl();
    if (result !== 'REDIRECT' || !authorizationUrl) {
      throw new BadRequestException('OAuth authorization could not be started');
    }
    return { authorizationUrl: authorizationUrl.toString() };
  }

  async complete(
    input: CompleteMcpOAuthInput,
  ): Promise<{ integrationId: UUID }> {
    const stateHash = createHash('sha256').update(input.state).digest('hex');
    const pending = await this.pendingSessions.consumeByStateHash(
      stateHash,
      new Date(),
    );
    if (!pending || pending.isExpired()) this.rejectCallback();
    const identity = this.requireIdentity();
    if (
      pending.userId !== identity.userId ||
      pending.orgId !== identity.orgId
    ) {
      this.rejectCallback();
    }
    if (input.iss && input.iss !== pending.issuer) this.rejectCallback();
    if (input.error || !input.code) this.rejectCallback();
    const integration = this.requireOAuthIntegration(
      await this.access.validate(pending.integrationId),
    );
    const provider = this.providerFactory.create({
      integration,
      ...identity,
      pendingSession: pending,
    });
    const result = await auth(provider, {
      serverUrl: integration.serverUrl,
      authorizationCode: input.code,
      iss: pending.issuer,
      fetchFn: this.oauthFetch.fetch,
    });
    if (result !== 'AUTHORIZED') this.rejectCallback();
    this.capabilityCache.invalidate(integration.id, identity.userId);
    return { integrationId: integration.id };
  }

  async disconnect(integrationId: UUID): Promise<void> {
    this.requireOAuthIntegration(await this.access.validate(integrationId));
    const { userId } = this.requireIdentity();
    await this.revokeQuietly(integrationId, userId);
    await this.tokens.delete(integrationId, userId);
    this.capabilityCache.invalidate(integrationId, userId);
  }

  private async revokeQuietly(
    integrationId: UUID,
    userId: UUID,
  ): Promise<void> {
    try {
      const token = await this.tokens.findByIntegrationAndUser(
        integrationId,
        userId,
      );
      if (!token) return;
      const registration = await this.registrations.findByIntegrationAndIssuer(
        integrationId,
        token.issuer,
      );
      const metadata = registration?.discoveryMetadata?.[
        'authorizationServerMetadata'
      ] as Record<string, unknown> | undefined;
      const endpoint = metadata?.['revocation_endpoint'];
      if (typeof endpoint !== 'string') return;
      const body = new URLSearchParams({
        token: await this.encryption.decrypt(token.encryptedAccessToken),
        token_type_hint: 'access_token',
      });
      const headers: Record<string, string> = {
        'content-type': 'application/x-www-form-urlencoded',
      };
      if (registration?.encryptedClientSecret) {
        const secret = await this.encryption.decrypt(
          registration.encryptedClientSecret,
        );
        headers['authorization'] = `Basic ${Buffer.from(
          `${registration.clientId}:${secret}`,
        ).toString('base64')}`;
      } else if (registration) {
        body.set('client_id', registration.clientId);
      }
      await this.oauthFetch.fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });
    } catch {
      return;
    }
  }

  private requireOAuthIntegration(
    integration: object,
  ): SchemaConfiguredMcpIntegration {
    if (
      !(integration instanceof SchemaConfiguredMcpIntegration) ||
      !integration.configSchema.oauth
    ) {
      throw new BadRequestException('Integration does not support OAuth');
    }
    return integration;
  }

  private requireIdentity(): { userId: UUID; orgId: UUID } {
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId)
      throw new BadRequestException('Invalid OAuth session');
    return { userId, orgId };
  }

  private rejectCallback(): never {
    throw new BadRequestException('OAuth authorization could not be completed');
  }

  private async requireProtectedResourceMetadata(
    serverUrl: string,
  ): Promise<void> {
    const metadata = await discoverOAuthProtectedResourceMetadata(
      serverUrl,
      undefined,
      this.oauthFetch.fetch,
    );
    // The SDK declaration is non-nullable, but its documented 404 path returns undefined.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!metadata) {
      throw new BadRequestException(
        'MCP protected-resource metadata is required for OAuth',
      );
    }
  }
}
