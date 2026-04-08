import type { UUID } from 'crypto';
import type { McpIntegrationOAuthToken } from '../../domain/mcp-integration-oauth-token.entity';

/**
 * Repository port for MCP integration OAuth token persistence.
 * Defines the contract for storing and retrieving OAuth tokens
 * that are scoped to an integration and optionally a user.
 */
export abstract class McpIntegrationOAuthTokenRepositoryPort {
  /**
   * Finds an OAuth token by integration and user.
   * Pass `null` for userId to find the org-level token.
   * @param integrationId The integration ID
   * @param userId The user ID, or null for org-level tokens
   * @returns The token or null if not found
   */
  abstract findByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID | null,
  ): Promise<McpIntegrationOAuthToken | null>;

  /**
   * Saves an OAuth token (create or update).
   * @param token The token entity to save
   * @returns The saved token
   */
  abstract save(
    token: McpIntegrationOAuthToken,
  ): Promise<McpIntegrationOAuthToken>;

  /**
   * Deletes the OAuth token for a specific integration and user.
   * Pass `null` for userId to delete the org-level token.
   * @param integrationId The integration ID
   * @param userId The user ID, or null for org-level tokens
   */
  abstract deleteByIntegrationAndUser(
    integrationId: UUID,
    userId: UUID | null,
  ): Promise<void>;

  /**
   * Deletes all OAuth tokens for an integration (both org-level and per-user).
   * Used during integration deletion for belt-and-suspenders cleanup
   * alongside the FK CASCADE.
   * @param integrationId The integration ID
   */
  abstract deleteAllByIntegration(integrationId: UUID): Promise<void>;
}
