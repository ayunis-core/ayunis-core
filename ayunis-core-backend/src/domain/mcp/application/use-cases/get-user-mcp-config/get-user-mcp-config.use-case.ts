import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GetUserMcpConfigQuery } from './get-user-mcp-config.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
} from '../../mcp.errors';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { McpIntegration } from '../../../domain/mcp-integration.entity';

export interface UserMcpConfigResult {
  hasConfig: boolean;
  /** Config values with secret values masked (keys only, values replaced with '***') */
  configValues: Record<string, string>;
}

@Injectable()
export class GetUserMcpConfigUseCase {
  private readonly logger = new Logger(GetUserMcpConfigUseCase.name);

  constructor(
    private readonly integrationRepository: McpIntegrationsRepositoryPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetUserMcpConfigQuery): Promise<UserMcpConfigResult> {
    this.logger.log('execute', { integrationId: query.integrationId });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const orgId = this.contextService.get('orgId');

    const integration = await this.integrationRepository.findById(
      query.integrationId,
    );

    if (!integration) {
      throw new McpIntegrationNotFoundError(query.integrationId);
    }

    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(query.integrationId);
    }

    const config = await this.userConfigRepository.findByIntegrationAndUser(
      query.integrationId,
      userId,
    );

    if (!config) {
      return { hasConfig: false, configValues: {} };
    }

    // Mask only secret fields — return non-secret values as-is
    const secretKeys = this.getSecretKeys(integration);
    const maskedValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.configValues)) {
      maskedValues[key] = secretKeys.has(key) ? '***' : value;
    }

    return { hasConfig: true, configValues: maskedValues };
  }

  private getSecretKeys(integration: McpIntegration): Set<string> {
    if (integration instanceof MarketplaceMcpIntegration) {
      return new Set(
        (integration.configSchema.userFields ?? [])
          .filter((f) => f.type === 'secret')
          .map((f) => f.key),
      );
    }
    return new Set();
  }
}
