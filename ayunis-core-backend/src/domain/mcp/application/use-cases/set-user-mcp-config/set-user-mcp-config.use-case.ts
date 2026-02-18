import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { SetUserMcpConfigCommand } from './set-user-mcp-config.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationUserConfig } from '../../../domain/mcp-integration-user-config.entity';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { ConfigField } from '../../../domain/value-objects/integration-config-schema';
import {
  McpIntegrationNotFoundError,
  McpNotMarketplaceIntegrationError,
  McpNoUserFieldsError,
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
  ): Promise<McpIntegrationUserConfig> {
    this.logger.log('execute', { integrationId: command.integrationId });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const integration = await this.integrationRepository.findById(
      command.integrationId,
    );

    if (!integration) {
      throw new McpIntegrationNotFoundError(command.integrationId);
    }

    if (!integration.isMarketplace()) {
      throw new McpNotMarketplaceIntegrationError(command.integrationId);
    }

    const marketplaceIntegration = integration as MarketplaceMcpIntegration;
    const { userFields } = marketplaceIntegration.configSchema;

    if (!userFields || userFields.length === 0) {
      throw new McpNoUserFieldsError(command.integrationId);
    }

    const encryptedValues = await this.encryptSecretFields(
      userFields,
      command.configValues,
    );

    const existing = await this.userConfigRepository.findByIntegrationAndUser(
      command.integrationId,
      userId,
    );

    if (existing) {
      existing.updateConfigValues(encryptedValues);
      return this.userConfigRepository.save(existing);
    }

    const userConfig = new McpIntegrationUserConfig({
      integrationId: command.integrationId,
      userId,
      configValues: encryptedValues,
    });

    return this.userConfigRepository.save(userConfig);
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
