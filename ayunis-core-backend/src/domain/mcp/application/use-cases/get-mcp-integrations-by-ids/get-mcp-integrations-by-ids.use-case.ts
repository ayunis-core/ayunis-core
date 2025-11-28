import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GetMcpIntegrationsByIdsQuery } from './get-mcp-integrations-by-ids.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { UnexpectedMcpError } from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Use case for fetching multiple MCP integrations by their IDs in a single query.
 * Used by other modules (e.g., agents) to efficiently fetch integration details.
 */
@Injectable()
export class GetMcpIntegrationsByIdsUseCase {
  private readonly logger = new Logger(GetMcpIntegrationsByIdsUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Fetches multiple MCP integrations by their IDs.
   * Only returns integrations belonging to the user's organization.
   * @param query Query containing the integration IDs
   * @returns Array of McpIntegration entities (missing/unauthorized IDs omitted)
   */
  async execute(
    query: GetMcpIntegrationsByIdsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log('getMcpIntegrationsByIds', {
      count: query.integrationIds.length,
    });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      if (query.integrationIds.length === 0) {
        return [];
      }

      const integrations = await this.repository.findByIds(
        query.integrationIds,
      );

      // Filter to only return integrations belonging to user's organization
      return integrations.filter((integration) => integration.orgId === orgId);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error getting integrations by IDs', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
