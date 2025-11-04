import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedMcpError } from '../../mcp.errors';

/**
 * Use case for listing all available (enabled) MCP integrations for the organization.
 * Returns only enabled integrations that can be assigned to agents.
 */
@Injectable()
export class ListAvailableMcpIntegrationsUseCase {
  private readonly logger = new Logger(
    ListAvailableMcpIntegrationsUseCase.name,
  );

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Executes the use case to list all available (enabled) integrations for the organization.
   * @returns Array of enabled MCP integrations (empty array if none)
   * @throws UnauthorizedException if user is not authenticated
   * @throws UnexpectedMcpError if an unexpected error occurs
   */
  async execute(): Promise<McpIntegration[]> {
    this.logger.log('listAvailableMcpIntegrations');

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Get only enabled integrations
      return await this.repository.findAll(orgId, { enabled: true });
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error listing available integrations', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
