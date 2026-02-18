import { UUID } from 'crypto';

/**
 * Ephemeral entity representing an MCP tool.
 * These entities are not persisted to the database but are fetched from MCP servers.
 */
export class McpTool {
  public readonly name: string;
  public readonly description?: string;
  public readonly inputSchema: Record<string, unknown>;
  public readonly integrationId: UUID;

  constructor(
    name: string,
    description: string | undefined,
    inputSchema: Record<string, unknown>,
    integrationId: UUID,
  ) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.integrationId = integrationId;
  }
}
