import type { UUID } from 'crypto';
import type { McpIntegrationUserConfig } from '../../domain/mcp-integration-user-config.entity';

/**
 * Repository port for MCP integration user-level configuration.
 * Manages per-user config values for marketplace integrations.
 */
export abstract class McpIntegrationUserConfigRepositoryPort {
  /**
   * Saves a user config (create or update).
   */
  abstract save(
    config: McpIntegrationUserConfig,
  ): Promise<McpIntegrationUserConfig>;

  /**
   * Finds user config by integration ID and user ID.
   */
  abstract findByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID,
  ): Promise<McpIntegrationUserConfig | null>;

  /**
   * Deletes all user configs for a given integration.
   * Used when an integration is deleted.
   */
  abstract deleteByIntegrationId(integrationId: UUID): Promise<void>;
}
