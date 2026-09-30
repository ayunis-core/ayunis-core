import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationNotConfigurableError,
  InvalidServerUrlError,
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
import { CustomMcpIntegration } from 'src/domain/mcp/domain/integrations/custom-mcp-integration.entity';
import {
  type ConfigField,
  normalizeScopes,
  type IntegrationConfigSchema,
} from 'src/domain/mcp/domain/value-objects/integration-config-schema';

@Injectable()
export class UpdateMcpIntegrationUseCase {
  private readonly logger = new Logger(UpdateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
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
    this.validateConfigurationUpdate(integration, command);
    const removedUserFieldKeys = this.removedUserFieldKeys(
      integration,
      command.configSchema,
    );

    await this.applyUpdates(integration, command);
    const saved = await this.repository.save(integration);
    await this.removeDeletedUserConfigValues(saved, removedUserFieldKeys);

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

    this.updateServerUrl(integration, command.serverUrl);

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

    if (
      command.configSchema !== undefined ||
      command.orgConfigValues !== undefined
    ) {
      await this.updateConfiguration(integration, command);
    }
  }

  private async validateConnectionIfNeeded(
    integration: McpIntegration,
    command: UpdateMcpIntegrationCommand,
  ): Promise<McpIntegration> {
    if (
      this.hasConnectionChanges(command) &&
      !(
        integration instanceof SchemaConfiguredMcpIntegration &&
        integration.requiresUserAuthorization
      )
    ) {
      return this.connectionValidationService.validateAndUpdateStatus(
        integration,
      );
    }

    return integration;
  }

  private hasConnectionChanges(command: UpdateMcpIntegrationCommand): boolean {
    return [
      command.serverUrl,
      command.configSchema,
      command.orgConfigValues,
      command.credentials,
      command.authHeaderName,
    ].some((value) => value !== undefined);
  }

  private async updateConfiguration(
    integration: McpIntegration,
    command: UpdateMcpIntegrationCommand,
  ): Promise<void> {
    if (!(integration instanceof SchemaConfiguredMcpIntegration)) {
      throw new McpIntegrationNotConfigurableError(integration.id);
    }

    const targetSchema = command.configSchema
      ? this.completeConfigSchema(
          integration.configSchema,
          command.configSchema,
        )
      : integration.configSchema;
    const mergedValues = await this.configService.mergeForUpdate(
      integration.orgConfigValues,
      command.orgConfigValues ?? {},
      targetSchema.orgFields,
    );

    if (command.configSchema !== undefined) {
      integration.updateConfigSchema(targetSchema);
    }
    integration.updateOrgConfigValues(mergedValues);
  }

  private validateConfigurationUpdate(
    integration: McpIntegration,
    command: UpdateMcpIntegrationCommand,
  ): void {
    if (command.configSchema === undefined) return;
    if (!(integration instanceof CustomMcpIntegration)) {
      throw new McpIntegrationNotConfigurableError(integration.id);
    }

    this.ensureAuthenticationConfigurationUnchanged(
      integration.configSchema,
      this.completeConfigSchema(integration.configSchema, command.configSchema),
      integration,
    );
    const targetSchema = this.completeConfigSchema(
      integration.configSchema,
      command.configSchema,
    );
    this.ensureExistingFieldsStable(
      integration.configSchema,
      targetSchema,
      integration,
    );
    this.configService.validateCustomSchema(
      targetSchema,
      command.orgConfigValues ?? {},
      command.name ?? integration.name,
    );
  }

  private completeConfigSchema(
    current: IntegrationConfigSchema,
    update: NonNullable<UpdateMcpIntegrationCommand['configSchema']>,
  ): IntegrationConfigSchema {
    return {
      ...update,
      authType: update.authType ?? current.authType,
    };
  }

  private removedUserFieldKeys(
    integration: McpIntegration,
    update: UpdateMcpIntegrationCommand['configSchema'],
  ): string[] {
    if (!(integration instanceof SchemaConfiguredMcpIntegration) || !update) {
      return [];
    }
    const nextKeys = new Set(update.userFields.map((field) => field.key));
    return integration.configSchema.userFields
      .map((field) => field.key)
      .filter((key) => !nextKeys.has(key));
  }

  private async removeDeletedUserConfigValues(
    integration: McpIntegration,
    keys: string[],
  ): Promise<void> {
    if (keys.length === 0) return;
    await this.userConfigRepository.removeKeysByIntegrationId(
      integration.id,
      keys,
    );
  }

  private ensureExistingFieldsStable(
    current: IntegrationConfigSchema,
    next: IntegrationConfigSchema,
    integration: CustomMcpIntegration,
  ): void {
    const nextFields = this.indexFieldsByKey(next);
    for (const field of this.fieldsWithScope(current)) {
      const nextField = nextFields.get(field.key);
      if (!nextField) continue;
      if (nextField.type !== field.type || nextField.scope !== field.scope) {
        throw new McpValidationFailedError(
          integration.id,
          integration.name,
          'Changing the scope or value type of an existing configuration field is not supported.',
        );
      }
    }
  }

  private indexFieldsByKey(
    schema: IntegrationConfigSchema,
  ): Map<string, ConfigField & { scope: 'organization' | 'user' }> {
    return new Map(
      this.fieldsWithScope(schema).map((field) => [field.key, field]),
    );
  }

  private fieldsWithScope(
    schema: IntegrationConfigSchema,
  ): (ConfigField & { scope: 'organization' | 'user' })[] {
    return [
      ...schema.orgFields.map((field) => ({
        ...field,
        scope: 'organization' as const,
      })),
      ...schema.userFields.map((field) => ({
        ...field,
        scope: 'user' as const,
      })),
    ];
  }

  private ensureAuthenticationConfigurationUnchanged(
    current: IntegrationConfigSchema,
    next: IntegrationConfigSchema,
    integration: CustomMcpIntegration,
  ): void {
    const currentAuth = JSON.stringify(this.authenticationConfig(current));
    const nextAuth = JSON.stringify(this.authenticationConfig(next));
    if (currentAuth !== nextAuth) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'Changing the authentication method is not supported.',
      );
    }
  }

  private authenticationConfig(schema: IntegrationConfigSchema): object {
    return {
      authType: schema.authType,
      oauth: schema.oauth
        ? {
            clientRegistration: schema.oauth.clientRegistration,
            scopes: normalizeScopes(schema.oauth.scopes),
          }
        : undefined,
    };
  }

  private updateServerUrl(
    integration: McpIntegration,
    serverUrl?: string,
  ): void {
    if (serverUrl === undefined) return;
    if (!(integration instanceof CustomMcpIntegration)) {
      throw new McpIntegrationNotConfigurableError(integration.id);
    }
    if (!this.isValidServerUrl(serverUrl)) {
      throw new InvalidServerUrlError(serverUrl);
    }
    integration.updateServerUrl(serverUrl);
  }

  private isValidServerUrl(serverUrl: string): boolean {
    try {
      return ['http:', 'https:'].includes(new URL(serverUrl).protocol);
    } catch {
      return false;
    }
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
