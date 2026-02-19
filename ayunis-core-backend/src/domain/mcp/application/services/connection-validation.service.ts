import { Injectable } from '@nestjs/common';
import { ValidateMcpIntegrationUseCase } from '../use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import { McpIntegrationsRepositoryPort } from '../ports/mcp-integrations.repository.port';
import { McpIntegration } from '../../domain/mcp-integration.entity';

/**
 * Validates an MCP integration's connection and persists the resulting status.
 * Never throws — captures all errors as connection status updates.
 */
@Injectable()
export class ConnectionValidationService {
  constructor(
    private readonly validateUseCase: ValidateMcpIntegrationUseCase,
    private readonly repository: McpIntegrationsRepositoryPort,
  ) {}

  async validateAndUpdateStatus(
    integration: McpIntegration,
  ): Promise<McpIntegration> {
    try {
      const result = await this.validateUseCase.execute({
        integrationId: integration.id,
      });

      if (result.isValid) {
        integration.updateConnectionStatus('healthy', undefined);
      } else {
        integration.updateConnectionStatus(
          'unhealthy',
          result.errorMessage ?? 'Validation failed',
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Validation failed: ${error.message}`
          : 'Validation failed: Unknown error';
      integration.updateConnectionStatus('unhealthy', errorMessage);
    }

    return this.repository.save(integration);
  }
}
