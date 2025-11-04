import { Injectable, Logger } from '@nestjs/common';
import {
  PredefinedMcpIntegrationConfig,
  PredefinedMcpIntegrationRegistry,
} from '../../registries/predefined-mcp-integration-registry.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedMcpError } from '../../mcp.errors';

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
      this.logger.error('Unexpected error listing predefined configs', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
