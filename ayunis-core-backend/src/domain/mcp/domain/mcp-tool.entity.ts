import type { UUID } from 'crypto';

/**
 * Ephemeral entity representing an MCP tool.
 * These entities are not persisted to the database but are fetched from MCP servers.
 */
export class McpTool {
  public readonly name: string;
  public readonly description?: string;
  public readonly inputSchema: Record<string, unknown>;
  public readonly integrationId: UUID;
  /** Top-level input fields the server declared as files via `_meta["openai/fileParams"]`. */
  public readonly fileParams: readonly string[];

  constructor(
    name: string,
    description: string | undefined,
    inputSchema: Record<string, unknown>,
    integrationId: UUID,
    fileParams: readonly string[] = [],
  ) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.integrationId = integrationId;
    this.fileParams = fileParams;
  }
}
