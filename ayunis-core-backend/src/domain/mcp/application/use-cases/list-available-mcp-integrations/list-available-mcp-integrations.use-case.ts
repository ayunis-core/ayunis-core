import {
  Injectable,
  Optional,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { McpOAuthUserTokenRepositoryPort } from 'src/domain/mcp/application/ports/mcp-oauth-user-token.repository.port';

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
    @Optional()
    private readonly oauthTokens?: McpOAuthUserTokenRepositoryPort,
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

      return Promise.all(
        integrations.map(async (integration) => ({
          integration,
          userAuthorized: await this.resolveUserAuthorized(
            integration,
            userConfigValues,
            userId,
          ),
        })),
      );
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
        'Unexpected error listing available integrations',
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  /**
   * Loads the user's stored config values keyed by integration ID, for the
   * schema-configured integrations in the list. Returns an empty map when there is
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

    const configurableIds = integrations
      .filter(
        (integration) => integration instanceof SchemaConfiguredMcpIntegration,
      )
      .map((i) => i.id);
    if (configurableIds.length === 0) {
      return result;
    }

    const configs = await this.userConfigRepository.findByIntegrationIdsAndUser(
      configurableIds,
      userId,
    );
    for (const config of configs) {
      result.set(config.integrationId, config.configValues);
    }
    return result;
  }

  private async resolveUserAuthorized(
    integration: McpIntegration,
    userConfigValues: Map<UUID, Record<string, string>>,
    userId?: UUID,
  ): Promise<boolean> {
    if (!(integration instanceof SchemaConfiguredMcpIntegration)) {
      return true;
    }
    const fieldsAuthorized = integration.isUserAuthorized(
      userConfigValues.get(integration.id) ?? null,
    );
    if (!fieldsAuthorized || !integration.configSchema.oauth) {
      return fieldsAuthorized;
    }
    if (!userId || !this.oauthTokens) return false;
    const token = await this.oauthTokens.findByIntegrationAndUser(
      integration.id,
      userId,
    );
    return Boolean(
      token && (!token.isExpired() || token.encryptedRefreshToken),
    );
  }
}
