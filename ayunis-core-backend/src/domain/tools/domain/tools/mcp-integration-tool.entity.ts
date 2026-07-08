import { createAjv } from 'src/common/validators/ajv.factory';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import type { UUID } from 'crypto';
import type { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { sanitizeMcpToolName } from './mcp-tool-name.util';

/**
 * Ephemeral tool entity representing an MCP tool.
 * These tools are not persisted to the database but are dynamically loaded
 * from MCP integrations at conversation start.
 */
export class McpIntegrationTool extends Tool {
  public readonly integrationId: UUID;
  /** Original MCP server tool name — `name` is sanitized for LLM providers. */
  public readonly mcpToolName: string;
  public readonly integrationName: string;
  public readonly integrationLogoUrl: string | null;
  private readonly _returnsPii: boolean;

  constructor(
    mcpTool: McpTool,
    returnsPii: boolean,
    integrationName: string,
    integrationLogoUrl: string | null,
  ) {
    super({
      name: sanitizeMcpToolName(mcpTool.name),
      description: mcpTool.description ?? '',
      parameters: mcpTool.inputSchema,
      type: ToolType.MCP_TOOL,
    });
    this.integrationId = mcpTool.integrationId;
    this.mcpToolName = mcpTool.name;
    this.integrationName = integrationName;
    this.integrationLogoUrl = integrationLogoUrl;
    this._returnsPii = returnsPii;
  }

  // Third-party MCP schemas are runtime data, so no compile-time param type
  // can be derived from them — Record is the honest return type.
  validateParams(params: Record<string, unknown>): Record<string, unknown> {
    const ajv = createAjv();
    let validate: ReturnType<typeof ajv.compile>;
    try {
      validate = ajv.compile(this.parameters);
    } catch {
      // Third-party MCP schemas may use dialects ajv rejects (e.g. draft-04
      // boolean exclusiveMinimum). The server validates its own inputs, so
      // skip local validation rather than blocking execution.
      return params;
    }
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params;
  }

  get returnsPii(): boolean {
    return this._returnsPii;
  }
}
