import type { McpOAuthUserToken } from 'src/domain/mcp/domain/mcp-oauth-user-token.entity';
import { McpConnectionObservationRepositoryPort } from 'src/domain/mcp/application/ports/mcp-connection-observation.repository.port';
import type {
  McpConnectionObservation,
  McpConnectionFailure,
} from 'src/domain/mcp/domain/mcp-connection-observation';
import type { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import { mcpConnectionRevision } from 'src/domain/mcp/application/services/mcp-connection-revision';
import { Injectable, Optional, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import { McpOAuthUserTokenRepositoryPort } from 'src/domain/mcp/application/ports/mcp-oauth-user-token.repository.port';

/**
 * An enabled integration paired with whether the current user has satisfied
 * its per-user authorization requirement (always true when none is required).
 */
export interface AvailableMcpIntegration {
  integration: McpIntegration;
  userAuthorized: boolean;
  userConnectionFailure?: McpConnectionFailure;
  userConnectionCheckedAt?: Date;
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
    private readonly observations: McpConnectionObservationRepositoryPort,
    @Optional()
    private readonly oauthTokens?: McpOAuthUserTokenRepositoryPort,
  ) {}

  /**
   * Executes the use case to list all available (enabled) integrations for the organization.
   * @returns Array of enabled integrations with per-user authorization status
   * @throws UnauthorizedAccessError if user is not authenticated
   * @throws UnexpectedMcpError if an unexpected error occurs
   */
  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(): Promise<AvailableMcpIntegration[]> {
    this.logger.log('listAvailableMcpIntegrations');
    const orgId = getRequiredOrgId(this.contextService);
    const integrations = await this.repository.findAll(orgId, {
      enabled: true,
    });
    const userId = this.contextService.get('userId');
    const userConfigValues = await this.loadUserConfigValues(
      integrations,
      userId,
    );
    const observations = userId
      ? await this.observations.findForUser(
          integrations.map((i) => i.id),
          userId,
        )
      : [];
    const byIntegration = new Map(
      observations.map((value) => [value.integrationId, value]),
    );
    const tokens = await this.loadTokens(integrations, userId);
    return integrations.map((integration) =>
      this.resolveUserState(
        integration,
        userConfigValues.get(integration.id) ?? null,
        tokens.get(integration.id) ?? null,
        byIntegration.get(integration.id),
      ),
    );
  }

  /**
   * Loads the user's stored config values keyed by integration ID, for the
   * schema-configured integrations in the list. Returns an empty map when there is
   * no user context.
   */
  private async loadUserConfigValues(
    integrations: McpIntegration[],
    userId?: UUID,
  ): Promise<Map<UUID, McpIntegrationUserConfig>> {
    const result = new Map<UUID, McpIntegrationUserConfig>();
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
      result.set(config.integrationId, config);
    }
    return result;
  }

  private resolveUserState(
    integration: McpIntegration,
    config: McpIntegrationUserConfig | null,
    token: McpOAuthUserToken | null,
    observation: McpConnectionObservation | undefined,
  ): AvailableMcpIntegration {
    const userAuthorized = this.isAuthorized(integration, config, token);
    const revision = mcpConnectionRevision(integration, config, token);
    return {
      integration,
      userAuthorized,
      ...this.connectionHealth(observation, revision),
    };
  }

  private async loadTokens(
    integrations: McpIntegration[],
    userId?: UUID,
  ): Promise<Map<UUID, McpOAuthUserToken>> {
    if (!userId || !this.oauthTokens) return new Map();
    const ids = integrations
      .filter(
        (integration) =>
          integration instanceof SchemaConfiguredMcpIntegration &&
          integration.configSchema.oauth,
      )
      .map((integration) => integration.id);
    if (ids.length === 0) return new Map();
    const tokens = await this.oauthTokens.findByIntegrationIdsAndUser(
      ids,
      userId,
    );
    return new Map(tokens.map((token) => [token.integrationId, token]));
  }

  private isAuthorized(
    integration: McpIntegration,
    config: McpIntegrationUserConfig | null,
    token: McpOAuthUserToken | null,
  ): boolean {
    if (!(integration instanceof SchemaConfiguredMcpIntegration)) return true;
    if (!integration.isUserAuthorized(config?.configValues ?? null))
      return false;
    if (!integration.configSchema.oauth) return true;
    return Boolean(
      token && (!token.isExpired() || token.encryptedRefreshToken),
    );
  }

  private connectionHealth(
    observation: McpConnectionObservation | undefined,
    revision: string,
  ): Partial<AvailableMcpIntegration> {
    if (!observation?.failure || observation.revision !== revision) return {};
    return {
      userConnectionFailure: observation.failure,
      userConnectionCheckedAt: observation.checkedAt,
    };
  }
}
