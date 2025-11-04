import { UUID } from 'crypto';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';

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
   * Finds all MCP integrations for an organization.
   * @param orgId The organization ID
   * @param filter Optional filter to apply to the query
   * @returns Array of integrations
   */
  abstract findAll(
    orgId: UUID,
    filter?: { enabled?: boolean },
  ): Promise<McpIntegration[]>;

  /**
   * Finds an MCP integration by organization ID and predefined slug.
   * Used to check for duplicate predefined integrations (e.g., Locaboo).
   * @param organizationId The organization ID
   * @param slug The predefined integration slug
   * @returns The integration or null if not found
   */
  abstract findByOrgIdAndSlug(
    organizationId: UUID,
    slug: PredefinedMcpIntegrationSlug,
  ): Promise<McpIntegration | null>;

  /**
   * Deletes an MCP integration by its ID.
   * @param id The integration ID
   */
  abstract delete(id: UUID): Promise<void>;
}
