import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedMcpError } from '../../mcp.errors';

/**
 * An enabled integration paired with whether the current user has satisfied
 * its per-user authorization requirement (always true when none is required).
 */
export interface AvailableMcpIntegration {
  integration: McpIntegration;
  userAuthorized: boolean;
}

/**
 * Use case for listing all available (enabled) MCP integrations for the organization.
 * Returns only enabled integrations that can be assigned to agents, annotated
 * with the current user's per-user authorization status.
 */
@Injectable()
export class ListAvailableMcpIntegrationsUseCase {
  private readonly logger = new Logger(
    ListAvailableMcpIntegrationsUseCase.name,
  );

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Executes the use case to list all available (enabled) integrations for the organization.
   * @returns Array of enabled integrations with per-user authorization status
   * @throws UnauthorizedException if user is not authenticated
   * @throws UnexpectedMcpError if an unexpected error occurs
   */
  async execute(): Promise<AvailableMcpIntegration[]> {
    this.logger.log('listAvailableMcpIntegrations');

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integrations = await this.repository.findAll(orgId, {
        enabled: true,
      });

      const userId = this.contextService.get('userId');
      const userConfigValues = await this.loadUserConfigValues(
        integrations,
        userId,
      );

      return integrations.map((integration) => ({
        integration,
        userAuthorized: this.resolveUserAuthorized(
          integration,
          userConfigValues,
        ),
      }));
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

  /**
   * Loads the user's stored config values keyed by integration ID, for the
   * marketplace integrations in the list. Returns an empty map when there is
   * no user context.
   */
  private async loadUserConfigValues(
    integrations: McpIntegration[],
    userId?: UUID,
  ): Promise<Map<UUID, Record<string, string>>> {
    const result = new Map<UUID, Record<string, string>>();
    if (!userId) {
      return result;
    }

    const marketplaceIds = integrations
      .filter((i) => i instanceof MarketplaceMcpIntegration)
      .map((i) => i.id);
    if (marketplaceIds.length === 0) {
      return result;
    }

    const configs = await this.userConfigRepository.findByIntegrationIdsAndUser(
      marketplaceIds,
      userId,
    );
    for (const config of configs) {
      result.set(config.integrationId, config.configValues);
    }
    return result;
  }

  private resolveUserAuthorized(
    integration: McpIntegration,
    userConfigValues: Map<UUID, Record<string, string>>,
  ): boolean {
    if (!(integration instanceof MarketplaceMcpIntegration)) {
      return true;
    }
    return integration.isUserAuthorized(
      userConfigValues.get(integration.id) ?? null,
    );
  }
}
