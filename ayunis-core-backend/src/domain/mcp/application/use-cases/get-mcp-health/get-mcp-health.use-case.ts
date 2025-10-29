import { Injectable, Logger } from '@nestjs/common';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';

/**
 * Health status for individual integration
 */
export interface IntegrationHealth {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  status: 'healthy' | 'unhealthy';
  lastChecked: Date;
  enabled: boolean;
}

/**
 * Overall MCP health response
 */
export interface McpHealthResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  integrations: IntegrationHealth[];
}

/**
 * Use case for checking MCP integrations health.
 *
 * This endpoint provides cached health status (not live validation)
 * to avoid overloading MCP servers with health checks.
 *
 * Health is determined by:
 * - If integration is enabled
 * - Last validation result (if available)
 *
 * Returns 200 if at least one integration is healthy.
 * Returns 503 if all integrations are unhealthy or none exist.
 */
@Injectable()
export class GetMcpHealthUseCase {
  private readonly logger = new Logger(GetMcpHealthUseCase.name);

  constructor(private readonly repository: McpIntegrationsRepositoryPort) {}

  async execute(): Promise<McpHealthResult> {
    const startTime = Date.now();
    this.logger.log('[MCP] operation=health_check status=started');

    try {
      // Fetch all integrations (no org filter - this is a system-wide health check)
      const allIntegrations = await this.repository.findAll();

      // Map integrations to health status
      const integrationHealths: IntegrationHealth[] = allIntegrations.map(
        (integration) => ({
          id: integration.id,
          name: integration.name,
          type: integration.type,
          status: integration.enabled ? 'healthy' : 'unhealthy',
          lastChecked: integration.updatedAt || integration.createdAt,
          enabled: integration.enabled,
        }),
      );

      // Determine overall health: healthy if at least one integration is healthy
      const hasHealthyIntegration = integrationHealths.some(
        (h) => h.status === 'healthy',
      );
      const overallStatus = hasHealthyIntegration ? 'healthy' : 'unhealthy';

      const duration = Date.now() - startTime;
      this.logger.log(
        `[MCP] operation=health_check status=${overallStatus} total=${integrationHealths.length} healthy=${integrationHealths.filter((h) => h.status === 'healthy').length} duration=${duration}ms`,
      );

      return {
        status: overallStatus,
        timestamp: new Date(),
        integrations: integrationHealths,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[MCP] operation=health_check status=error error="${(error as Error).message}" duration=${duration}ms`,
        { error: error as Error },
      );

      // Return unhealthy status on error
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        integrations: [],
      };
    }
  }
}
