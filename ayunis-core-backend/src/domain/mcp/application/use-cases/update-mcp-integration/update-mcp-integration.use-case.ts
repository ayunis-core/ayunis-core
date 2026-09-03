import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationNotConfigurableError,
  UnexpectedMcpError,
} from 'src/domain/mcp/application/mcp.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { McpCredentialEncryptionPort } from 'src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { McpAuthMethod } from 'src/domain/mcp/domain/value-objects/mcp-auth-method.enum';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/custom-header-mcp-integration-auth.entity';
import { McpValidationFailedError } from 'src/domain/mcp/application/mcp.errors';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { McpConfigService } from 'src/domain/mcp/application/services/mcp-config.service';
import { ConnectionValidationService } from 'src/domain/mcp/application/services/connection-validation.service';
import { McpCapabilityCacheService } from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import { McpOAuthClientConfigurationService } from 'src/domain/mcp/application/services/mcp-oauth-client-configuration.service';
import { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';

@Injectable()
export class UpdateMcpIntegrationUseCase {
  private readonly logger = new Logger(UpdateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly configService: McpConfigService,
    private readonly connectionValidationService: ConnectionValidationService,
    private readonly capabilityCache: McpCapabilityCacheService,
    private readonly oauthClientConfiguration: McpOAuthClientConfigurationService,
    private readonly mcpClientService: McpClientService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(command: UpdateMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log({ id: command.integrationId }, 'updateMcpIntegration');

    const integration = await this.getAuthorizedIntegration(
      command.integrationId as UUID,
    );

    const oauthIntegration = this.validateOAuthClientUpdate(
      integration,
      command.oauthClient,
    );

    await this.applyUpdates(integration, command);
    const saved = await this.repository.save(integration);

    if (oauthIntegration && command.oauthClient) {
      await this.oauthClientConfiguration.initialize(
        oauthIntegration,
        command.oauthClient,
      );
    }

    // Invalidate as soon as the new config is committed — the connection
    // validation below can take tens of seconds, while pooled sessions and
    // discoveries must stop using the previous configuration immediately.
    await this.mcpClientService.invalidateConnections(saved);
    this.capabilityCache.invalidate(command.integrationId as UUID);

    return this.validateConnectionIfNeeded(saved, command);
  }

  private validateOAuthClientUpdate(
    integration: McpIntegration,
    oauthClient: UpdateMcpIntegrationCommand['oauthClient'],
  ): SchemaConfiguredMcpIntegration | undefined {
    if (oauthClient === undefined) return undefined;
    if (!(integration instanceof SchemaConfiguredMcpIntegration)) {
      throw new McpIntegrationNotConfigurableError(integration.id);
    }
    this.oauthClientConfiguration.validate(integration, oauthClient);
    return integration;
  }

  private async getAuthorizedIntegration(
    integrationId: UUID,
  ): Promise<McpIntegration> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new McpIntegrationNotFoundError(integrationId);
    }

    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(integrationId);
    }

    return integration;
  }

  // Update fields (only if provided)
  private async applyUpdates(
    integration: McpIntegration,
    command: UpdateMcpIntegrationCommand,
  ): Promise<void> {
    if (command.name !== undefined) {
      integration.updateName(command.name);
    }

    if (command.returnsPii !== undefined) {
      integration.updateReturnsPii(command.returnsPii);
    }

    if (
      command.credentials !== undefined ||
      command.authHeaderName !== undefined
    ) {
      await this.rotateCredentials(
        integration,
        command.credentials,
        command.authHeaderName,
      );
    }

    if (command.orgConfigValues !== undefined) {
      await this.updateOrgConfigValues(integration, command.orgConfigValues);
    }
  }

  private async validateConnectionIfNeeded(
    integration: McpIntegration,
    command: UpdateMcpIntegrationCommand,
  ): Promise<McpIntegration> {
    if (
      command.orgConfigValues !== undefined &&
      !(
        integration instanceof SchemaConfiguredMcpIntegration &&
        integration.configSchema.oauth
      )
    ) {
      return this.connectionValidationService.validateAndUpdateStatus(
        integration,
      );
    }

    return integration;
  }

  private async updateOrgConfigValues(
    integration: McpIntegration,
    orgConfigValues: Record<string, string>,
  ): Promise<void> {
    if (!(integration instanceof SchemaConfiguredMcpIntegration)) {
      throw new McpIntegrationNotConfigurableError(integration.id);
    }

    const mergedValues = await this.configService.mergeForUpdate(
      integration.orgConfigValues,
      orgConfigValues,
      integration.configSchema.orgFields,
    );

    integration.updateOrgConfigValues(mergedValues);
  }

  private async rotateCredentials(
    integration: McpIntegration,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    const authMethod = integration.auth.getMethod();

    switch (authMethod) {
      case McpAuthMethod.NO_AUTH: {
        if (credentials !== undefined || authHeaderName !== undefined) {
          throw new McpValidationFailedError(
            integration.id,
            integration.name,
            'This integration does not support authentication credentials.',
          );
        }
        return;
      }
      case McpAuthMethod.BEARER_TOKEN:
        return this.rotateBearerToken(integration, credentials, authHeaderName);
      case McpAuthMethod.CUSTOM_HEADER:
        return this.rotateCustomHeader(
          integration,
          credentials,
          authHeaderName,
        );
      case McpAuthMethod.OAUTH: {
        if (credentials !== undefined || authHeaderName !== undefined) {
          throw new McpValidationFailedError(
            integration.id,
            integration.name,
            `Credential rotation is not supported for auth method ${authMethod}.`,
          );
        }
        return;
      }
    }
  }

  private async rotateBearerToken(
    integration: McpIntegration,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    if (authHeaderName !== undefined) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'Bearer token integrations always use the Authorization header.',
      );
    }

    if (credentials === undefined) {
      return;
    }

    const encryptedToken = await this.credentialEncryption.encrypt(credentials);
    (integration.auth as BearerMcpIntegrationAuth).setToken(encryptedToken);
  }

  private async rotateCustomHeader(
    integration: McpIntegration,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    const customAuth = integration.auth as CustomHeaderMcpIntegrationAuth;

    if (credentials !== undefined) {
      const encryptedSecret =
        await this.credentialEncryption.encrypt(credentials);
      const headerNameToUse = authHeaderName ?? customAuth.getAuthHeaderName();
      customAuth.setSecret(encryptedSecret, headerNameToUse);
      return;
    }

    if (authHeaderName === undefined) {
      return;
    }

    const currentSecret = customAuth.secret;
    if (!currentSecret) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'Credentials must be configured before updating the header name.',
      );
    }

    customAuth.setSecret(currentSecret, authHeaderName);
  }
}
