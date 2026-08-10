import { Injectable } from '@nestjs/common';
import { SchemaConfiguredMcpIntegration } from '../../domain/integrations/schema-configured-mcp-integration.entity';
import { McpOAuthClientRegistration } from '../../domain/mcp-oauth-client-registration.entity';
import { McpValidationFailedError } from '../mcp.errors';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { McpOAuthClientRegistrationRepositoryPort } from '../ports/mcp-oauth-client-registration.repository.port';
import { McpOAuthPendingSessionRepositoryPort } from '../ports/mcp-oauth-pending-session.repository.port';
import { McpOAuthUserTokenRepositoryPort } from '../ports/mcp-oauth-user-token.repository.port';
import { McpCapabilityCacheService } from './mcp-capability-cache.service';
import { McpClientService } from './mcp-client.service';

export interface McpOAuthStaticClientInput {
  clientId: string;
  clientSecret?: string;
}

@Injectable()
export class McpOAuthClientConfigurationService {
  constructor(
    private readonly encryption: McpCredentialEncryptionPort,
    private readonly registrations: McpOAuthClientRegistrationRepositoryPort,
    private readonly tokens: McpOAuthUserTokenRepositoryPort,
    private readonly pendingSessions: McpOAuthPendingSessionRepositoryPort,
    private readonly capabilityCache: McpCapabilityCacheService,
    private readonly mcpClientService: McpClientService,
  ) {}

  async initialize(
    integration: SchemaConfiguredMcpIntegration,
    client?: McpOAuthStaticClientInput,
  ): Promise<void> {
    this.validate(integration, client);
    const oauth = integration.configSchema.oauth;
    if (!oauth || oauth.clientRegistration === 'automatic') return;

    const clientId = client?.clientId.trim();
    if (!clientId) {
      this.rejectClient(
        integration,
        'Static OAuth client information is required.',
      );
    }
    const encryptedClientSecret = client?.clientSecret?.trim()
      ? await this.encryption.encrypt(client.clientSecret.trim())
      : undefined;
    const existing = await this.registrations.findUnboundByIntegration(
      integration.id,
    );
    const replacement = await this.registrations.save(
      new McpOAuthClientRegistration({
        id: existing?.id,
        integrationId: integration.id,
        issuer: null,
        registrationMode: 'static',
        clientId,
        encryptedClientSecret,
        createdAt: existing?.createdAt,
      }),
    );
    await this.clearExistingAuthorization(integration, replacement.id);
  }

  validate(
    integration: SchemaConfiguredMcpIntegration,
    client?: McpOAuthStaticClientInput,
  ): void {
    const oauth = integration.configSchema.oauth;
    if (!oauth) {
      if (client) this.rejectClient(integration, 'OAuth is not enabled.');
      return;
    }
    if (oauth.clientRegistration === 'automatic') {
      if (client) {
        this.rejectClient(
          integration,
          'Static client credentials are not accepted in automatic mode.',
        );
      }
      return;
    }
    if (!client?.clientId.trim()) {
      this.rejectClient(
        integration,
        'Static OAuth client information is required.',
      );
    }
  }

  isStaticClientConfigured(
    integration: SchemaConfiguredMcpIntegration,
  ): Promise<boolean> {
    if (integration.configSchema.oauth?.clientRegistration !== 'static') {
      return Promise.resolve(false);
    }
    return this.registrations.hasStaticRegistration(integration.id);
  }

  private async clearExistingAuthorization(
    integration: SchemaConfiguredMcpIntegration,
    replacementId: McpOAuthClientRegistration['id'],
  ): Promise<void> {
    await this.mcpClientService.invalidateConnections(integration);
    await this.pendingSessions.deleteByIntegration(integration.id);
    await this.tokens.deleteByIntegration(integration.id);
    await this.registrations.deleteByIntegrationExcept(
      integration.id,
      replacementId,
    );
    this.capabilityCache.invalidate(integration.id);
  }

  private rejectClient(
    integration: SchemaConfiguredMcpIntegration,
    reason: string,
  ): never {
    throw new McpValidationFailedError(
      integration.id,
      integration.name,
      reason,
      'oauthClient',
    );
  }
}
