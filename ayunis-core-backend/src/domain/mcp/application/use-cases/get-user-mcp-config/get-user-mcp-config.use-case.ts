import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { GetUserMcpConfigQuery } from './get-user-mcp-config.query';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationNotConfigurableError,
} from 'src/domain/mcp/application/mcp.errors';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { SECRET_MASK } from 'src/domain/mcp/domain/value-objects/secret-mask.constant';

export interface UserMcpConfigResult {
  hasConfig: boolean;
  /** Config values with secret values masked (keys only, values replaced with SECRET_MASK) */
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
    this.logger.log({ integrationId: query.integrationId }, 'execute');

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const integration = await this.integrationRepository.findById(
      query.integrationId,
    );

    if (!integration) {
      throw new McpIntegrationNotFoundError(query.integrationId);
    }

    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(query.integrationId);
    }

    if (!(integration instanceof SchemaConfiguredMcpIntegration)) {
      throw new McpIntegrationNotConfigurableError(query.integrationId);
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
      maskedValues[key] = secretKeys.has(key) ? SECRET_MASK : value;
    }

    return { hasConfig: true, configValues: maskedValues };
  }

  private getSecretKeys(
    integration: SchemaConfiguredMcpIntegration,
  ): Set<string> {
    return new Set(
      integration.configSchema.userFields
        .filter((field) => field.type === 'secret')
        .map((field) => field.key),
    );
  }
}
