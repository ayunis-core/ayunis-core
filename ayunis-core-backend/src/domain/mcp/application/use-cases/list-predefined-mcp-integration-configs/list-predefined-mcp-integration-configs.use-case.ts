import { Injectable, Logger } from '@nestjs/common';
import { PredefinedMcpIntegrationRegistry } from 'src/domain/mcp/application/registries/predefined-mcp-integration-registry.service';
import { PredefinedMcpIntegrationConfig } from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';

/**
 * Use case for listing all available predefined MCP integration configurations.
 * This query returns public registry information and does not require authentication.
 */
@Injectable()
export class ListPredefinedMcpIntegrationConfigsUseCase {
  private readonly logger = new Logger(
    ListPredefinedMcpIntegrationConfigsUseCase.name,
  );

  constructor(
    private readonly registryService: PredefinedMcpIntegrationRegistry,
  ) {}

  execute(): PredefinedMcpIntegrationConfig[] {
    this.logger.log('listPredefinedMcpIntegrationConfigs');

    try {
      return this.registryService.getAllConfigs();
    } catch (error) {
      // Re-throw application errors
      if (error instanceof ApplicationError) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error listing predefined configs',
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
