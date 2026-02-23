import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { SetUserMcpConfigCommand } from './set-user-mcp-config.command';
import { UserMcpConfigResult } from '../get-user-mcp-config/get-user-mcp-config.use-case';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationUserConfig } from '../../../domain/mcp-integration-user-config.entity';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { ConfigField } from '../../../domain/value-objects/integration-config-schema';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpNotMarketplaceIntegrationError,
  McpNoUserFieldsError,
  McpInvalidConfigKeysError,
} from '../../mcp.errors';

@Injectable()
export class SetUserMcpConfigUseCase {
  private readonly logger = new Logger(SetUserMcpConfigUseCase.name);

  constructor(
    private readonly integrationRepository: McpIntegrationsRepositoryPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: SetUserMcpConfigCommand,
  ): Promise<UserMcpConfigResult> {
    this.logger.log('execute', { integrationId: command.integrationId });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const orgId = this.contextService.get('orgId');

    const integration = await this.integrationRepository.findById(
      command.integrationId,
    );

    if (!integration) {
      throw new McpIntegrationNotFoundError(command.integrationId);
    }

    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(command.integrationId);
    }

    if (!integration.isMarketplace()) {
      throw new McpNotMarketplaceIntegrationError(command.integrationId);
    }

    const marketplaceIntegration = integration as MarketplaceMcpIntegration;
    const { userFields } = marketplaceIntegration.configSchema;

    if (!userFields || userFields.length === 0) {
      throw new McpNoUserFieldsError(command.integrationId);
    }

    this.validateConfigKeys(userFields, command.configValues);

    const encryptedValues = await this.encryptSecretFields(
      userFields,
      command.configValues,
    );

    const saved = await this.saveConfig(
      command.integrationId,
      userId,
      encryptedValues,
    );

    return this.maskResult(saved.configValues, userFields);
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

  private async saveConfig(
    integrationId: UUID,
    userId: UUID,
    encryptedValues: Record<string, string>,
  ): Promise<McpIntegrationUserConfig> {
    const existing = await this.userConfigRepository.findByIntegrationAndUser(
      integrationId,
      userId,
    );

    if (existing) {
      const mergedValues = { ...existing.configValues, ...encryptedValues };
      existing.updateConfigValues(mergedValues);
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
      maskedValues[key] = secretKeys.has(key) ? '***' : value;
    }

    return { hasConfig: true, configValues: maskedValues };
  }

  private async encryptSecretFields(
    userFields: ConfigField[],
    values: Record<string, string>,
  ): Promise<Record<string, string>> {
    const encrypted = { ...values };
    const secretKeys = new Set(
      userFields.filter((f) => f.type === 'secret').map((f) => f.key),
    );

    for (const key of Object.keys(encrypted)) {
      if (secretKeys.has(key)) {
        encrypted[key] = await this.credentialEncryption.encrypt(
          encrypted[key],
        );
      }
    }
    return encrypted;
  }
}
