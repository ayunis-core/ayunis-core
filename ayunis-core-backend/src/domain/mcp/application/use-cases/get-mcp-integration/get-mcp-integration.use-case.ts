import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetMcpIntegrationQuery } from './get-mcp-integration.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';

@Injectable()
export class GetMcpIntegrationUseCase {
  private readonly logger = new Logger(GetMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(query: GetMcpIntegrationQuery): Promise<McpIntegration> {
    this.logger.log('getMcpIntegration', { id: query.integrationId });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const integration = await this.repository.findById(query.integrationId);
    if (!integration) {
      throw new McpIntegrationNotFoundError(query.integrationId);
    }

    // Verify organization access
    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(query.integrationId);
    }

    return integration;
  }
}
