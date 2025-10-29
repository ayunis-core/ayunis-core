import { UUID } from 'crypto';
import { McpIntegration } from '../../domain/mcp-integration.entity';

/**
 * Repository port for MCP integration persistence.
 * Defines the contract for storing and retrieving MCP integrations.
 */
export abstract class McpIntegrationsRepositoryPort {
  /**
   * Saves an MCP integration (create or update).
   * @param integration The integration to save
   * @returns The saved integration
   */
  abstract save(integration: McpIntegration): Promise<McpIntegration>;

  /**
   * Finds an MCP integration by its ID.
   * @param id The integration ID
   * @returns The integration or null if not found
   */
  abstract findById(id: UUID): Promise<McpIntegration | null>;

  /**
   * Finds multiple MCP integrations by their IDs.
   * @param ids Array of integration IDs
   * @returns Array of found integrations
   */
  abstract findByIds(ids: UUID[]): Promise<McpIntegration[]>;

  /**
   * Finds all MCP integrations across all organizations.
   * Used for system-wide health checks.
   * @returns Array of all integrations
   */
  abstract findAll(): Promise<McpIntegration[]>;

  /**
   * Finds all MCP integrations for an organization.
   * @param organizationId The organization ID
   * @returns Array of integrations
   */
  abstract findByOrganizationId(
    organizationId: UUID,
  ): Promise<McpIntegration[]>;

  /**
   * Finds all enabled MCP integrations for an organization.
   * @param organizationId The organization ID
   * @returns Array of enabled integrations
   */
  abstract findByOrganizationIdAndEnabled(
    organizationId: UUID,
  ): Promise<McpIntegration[]>;

  /**
   * Deletes an MCP integration by its ID.
   * @param id The integration ID
   */
  abstract delete(id: UUID): Promise<void>;
}
