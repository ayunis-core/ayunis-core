import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { UnexpectedMcpError } from '../../mcp.errors';

/**
 * Use case for listing all MCP integrations belonging to the user's organization.
 * Returns both predefined and custom integrations.
 */
@Injectable()
export class ListOrgMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListOrgMcpIntegrationsUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Executes the use case to list all integrations for the organization.
   * @returns Array of MCP integrations (empty array if none)
   * @throws UnauthorizedException if user is not authenticated
   * @throws UnexpectedMcpError if an unexpected error occurs
   */
  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(): Promise<McpIntegration[]> {
    this.logger.log('listOrgMcpIntegrations');

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return await this.repository.findAll(orgId);
  }
}
