import { createAjv } from 'src/common/validators/ajv.factory';
import { formatAjvErrors } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { UUID } from 'crypto';
import type { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { buildMcpCanonicalName } from 'src/domain/tools/domain/value-objects/mcp-canonical-name';

/**
 * Ephemeral tool entity representing an MCP tool.
 * These tools are not persisted to the database but are dynamically loaded
 * from MCP integrations at conversation start.
 */
export class McpIntegrationTool extends Tool {
  public readonly integrationId: UUID;
  public readonly integrationName: string;
  public readonly originalName: string;
  public readonly integrationLogoUrl: string | null;
  private readonly _returnsPii: boolean;

  constructor(
    mcpTool: McpTool,
    returnsPii: boolean,
    integrationName: string,
    integrationLogoUrl: string | null,
  ) {
    super({
      name: buildMcpCanonicalName('tool', mcpTool.name, mcpTool.integrationId),
      description: `Use the "${mcpTool.name}" tool from MCP integration "${integrationName}".\n${mcpTool.description ?? ''}`,
      parameters: mcpTool.inputSchema,
      type: ToolType.MCP_TOOL,
    });
    this.integrationId = mcpTool.integrationId;
    this.integrationName = integrationName;
    this.originalName = mcpTool.name;
    this.integrationLogoUrl = integrationLogoUrl;
    this._returnsPii = returnsPii;
  }

  // Third-party MCP schemas are runtime data, so no compile-time param type
  // can be derived from them — Record is the honest return type.
  validateParams(params: Record<string, unknown>): Record<string, unknown> {
    const ajv = createAjv({ allErrors: true });
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
      throw new Error(formatAjvErrors(validate.errors ?? []));
    }
    return params;
  }

  get returnsPii(): boolean {
    return this._returnsPii;
  }
}
