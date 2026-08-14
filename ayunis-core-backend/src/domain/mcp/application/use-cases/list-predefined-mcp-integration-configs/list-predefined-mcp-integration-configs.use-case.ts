import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
import { PredefinedMcpIntegrationConfig } from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedMcpError } from '../../mcp.errors';

/**
 * Use case for listing all available predefined MCP integration configurations.
 * This query returns public registry information and does not require authentication.
 */
@Injectable()
export class ListPredefinedMcpIntegrationConfigsUseCase {
  constructor(
    @InjectPinoLogger(ListPredefinedMcpIntegrationConfigsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly registryService: PredefinedMcpIntegrationRegistry,
  ) {}

  execute(): PredefinedMcpIntegrationConfig[] {
    this.logger.info('listPredefinedMcpIntegrationConfigs');

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
