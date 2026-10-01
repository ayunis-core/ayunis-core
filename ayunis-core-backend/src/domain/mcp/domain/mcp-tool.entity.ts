import type { UUID } from 'crypto';
import type { McpToolAnnotations } from 'src/domain/mcp/domain/mcp-tool-annotations';

/**
 * Ephemeral entity representing an MCP tool.
 * These entities are not persisted to the database but are fetched from MCP servers.
 */
export class McpTool {
  public readonly name: string;
  public readonly description?: string;
  public readonly inputSchema: Record<string, unknown>;
  public readonly integrationId: UUID;
  public readonly annotations: McpToolAnnotations | null;

  constructor(
    name: string,
    description: string | undefined,
    inputSchema: Record<string, unknown>,
    integrationId: UUID,
    annotations: McpToolAnnotations | null = null,
  ) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.integrationId = integrationId;
    this.annotations = annotations;
  }

  get isReadOnly(): boolean {
    return this.annotations?.readOnlyHint === true;
  }
}
