import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GetUserMcpConfigQuery } from './get-user-mcp-config.query';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';

export interface UserMcpConfigResult {
  hasConfig: boolean;
  /** Config values with secret values masked (keys only, values replaced with '***') */
  configValues: Record<string, string>;
}

@Injectable()
export class GetUserMcpConfigUseCase {
  private readonly logger = new Logger(GetUserMcpConfigUseCase.name);

  constructor(
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetUserMcpConfigQuery): Promise<UserMcpConfigResult> {
    this.logger.log('execute', { integrationId: query.integrationId });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const config = await this.userConfigRepository.findByIntegrationAndUser(
      query.integrationId,
      userId,
    );

    if (!config) {
      return { hasConfig: false, configValues: {} };
    }

    // Return keys with masked values — never expose secrets
    const maskedValues: Record<string, string> = {};
    for (const key of Object.keys(config.configValues)) {
      maskedValues[key] = '***';
    }

    return { hasConfig: true, configValues: maskedValues };
  }
}
