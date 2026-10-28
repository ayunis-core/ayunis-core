import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { SetUserMcpConfigCommand } from './set-user-mcp-config.command';
import { UserMcpConfigResult } from 'src/domain/mcp/application/use-cases/get-user-mcp-config/get-user-mcp-config.use-case';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { ConfigField } from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import { SECRET_MASK } from 'src/domain/mcp/domain/value-objects/secret-mask.constant';
import { McpConfigService } from 'src/domain/mcp/application/services/mcp-config.service';
import { McpCapabilityCacheService } from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationNotConfigurableError,
  McpNoUserFieldsError,
  McpInvalidConfigKeysError,
  UnexpectedMcpError,
} from 'src/domain/mcp/application/mcp.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';

@Injectable()
export class SetUserMcpConfigUseCase {
  private readonly logger = new Logger(SetUserMcpConfigUseCase.name);

  constructor(
    private readonly integrationRepository: McpIntegrationsRepositoryPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    private readonly contextService: ContextService,
    private readonly configService: McpConfigService,
    private readonly capabilityCache: McpCapabilityCacheService,
    private readonly mcpClientService: McpClientService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(
    command: SetUserMcpConfigCommand,
  ): Promise<UserMcpConfigResult> {
    this.logger.log({ integrationId: command.integrationId }, 'execute');

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const configurableIntegration =
      await this.getConfigurableIntegrationOrThrow(
        command.integrationId,
        orgId,
      );
    const { userFields } = configurableIntegration.configSchema;

    if (userFields.length === 0) {
      throw new McpNoUserFieldsError(command.integrationId);
    }

    this.validateConfigKeys(userFields, command.configValues);

    const existing = await this.userConfigRepository.findByIntegrationAndUser(
      command.integrationId,
      userId,
    );

    const mergedValues = await this.mergeUserConfigValues(
      existing?.configValues ?? {},
      command.configValues,
      userFields,
    );

    this.configService.validateRequiredFields(userFields, mergedValues);

    const saved = await this.saveConfig(
      command.integrationId,
      userId,
      mergedValues,
      existing,
    );

    await this.mcpClientService.invalidateConnections(
      configurableIntegration,
      userId,
    );
    this.capabilityCache.invalidate(command.integrationId, userId);

    return this.maskResult(saved.configValues, userFields);
  }

  private async getConfigurableIntegrationOrThrow(
    integrationId: UUID,
    orgId: UUID,
  ): Promise<SchemaConfiguredMcpIntegration> {
    const integration =
      await this.integrationRepository.findById(integrationId);

    if (!integration) {
      throw new McpIntegrationNotFoundError(integrationId);
    }

    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(integrationId);
    }

    if (!(integration instanceof SchemaConfiguredMcpIntegration)) {
      throw new McpIntegrationNotConfigurableError(integrationId);
    }

    return integration;
  }

  private validateConfigKeys(
    userFields: ConfigField[],
    values: Record<string, string>,
  ): void {
    const allowedKeys = new Set(userFields.map((f) => f.key));
    const invalidKeys = Object.keys(values).filter((k) => !allowedKeys.has(k));

    if (invalidKeys.length > 0) {
      throw new McpInvalidConfigKeysError(invalidKeys);
    }
  }

  /**
   * Merges new config values with existing ones, handling the secret mask sentinel.
   * - If new value is SECRET_MASK → keep existing encrypted value
   * - If new value is provided and not the mask → encrypt (for secrets) or use as-is
   * - If field is missing from new values → keep existing value
   */
  private async mergeUserConfigValues(
    // Values are typed as possibly undefined because record lookups of
    // missing keys yield undefined at runtime.
    existingValues: Record<string, string | undefined>,
    providedValues: Record<string, string | undefined>,
    userFields: ConfigField[],
  ): Promise<Record<string, string>> {
    const merged: Record<string, string> = {};

    for (const field of userFields) {
      const provided = providedValues[field.key];
      const existing = existingValues[field.key];

      if (provided === SECRET_MASK && existing !== undefined) {
        merged[field.key] = existing;
      } else if (provided === SECRET_MASK) {
        // SECRET_MASK with no existing value — skip, don't store the mask literal
      } else if (provided !== undefined) {
        merged[field.key] =
          field.type === 'secret'
            ? await this.configService
                .encryptSecretFields([field], { [field.key]: provided })
                .then((r) => r[field.key])
            : provided;
      } else if (existing !== undefined) {
        merged[field.key] = existing;
      }
    }

    return merged;
  }

  private async saveConfig(
    integrationId: UUID,
    userId: UUID,
    encryptedValues: Record<string, string>,
    existing: McpIntegrationUserConfig | null,
  ): Promise<McpIntegrationUserConfig> {
    if (existing) {
      existing.updateConfigValues(encryptedValues);
      return this.userConfigRepository.save(existing);
    }

    const userConfig = new McpIntegrationUserConfig({
      integrationId,
      userId,
      configValues: encryptedValues,
    });

    return this.userConfigRepository.save(userConfig);
  }

  private maskResult(
    configValues: Record<string, string>,
    userFields: ConfigField[],
  ): UserMcpConfigResult {
    const secretKeys = new Set(
      userFields.filter((f) => f.type === 'secret').map((f) => f.key),
    );

    const maskedValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(configValues)) {
      maskedValues[key] = secretKeys.has(key) ? SECRET_MASK : value;
    }

    return { hasConfig: true, configValues: maskedValues };
  }
}
