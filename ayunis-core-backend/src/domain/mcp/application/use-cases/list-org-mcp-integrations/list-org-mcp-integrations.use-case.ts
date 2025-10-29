import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { ListOrgMcpIntegrationsQuery } from './list-org-mcp-integrations.query';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { ApplicationError } from 'src/common/errors/base.error';
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
   * @param query The query (no parameters needed)
   * @returns Array of MCP integrations (empty array if none)
   * @throws UnauthorizedException if user is not authenticated
   * @throws UnexpectedMcpError if an unexpected error occurs
   */
  async execute(query: ListOrgMcpIntegrationsQuery): Promise<McpIntegration[]> {
    this.logger.log('listOrgMcpIntegrations');

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      return await this.repository.findByOrganizationId(orgId);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error listing integrations', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
