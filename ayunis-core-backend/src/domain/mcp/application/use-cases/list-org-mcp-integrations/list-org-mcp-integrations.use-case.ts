import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedMcpError } from '../../mcp.errors';

/**
 * Use case for listing all MCP integrations belonging to the user's organization.
 * Returns both predefined and custom integrations.
 */
@Injectable()
export class ListOrgMcpIntegrationsUseCase {
  constructor(
    @InjectPinoLogger(ListOrgMcpIntegrationsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Executes the use case to list all integrations for the organization.
   * @returns Array of MCP integrations (empty array if none)
   * @throws UnauthorizedException if user is not authenticated
   * @throws UnexpectedMcpError if an unexpected error occurs
   */
  async execute(): Promise<McpIntegration[]> {
    this.logger.info('listOrgMcpIntegrations');

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      return await this.repository.findAll(orgId);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error listing integrations',
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
