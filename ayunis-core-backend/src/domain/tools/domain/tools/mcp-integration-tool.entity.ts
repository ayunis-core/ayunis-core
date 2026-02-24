import { createAjv } from 'src/common/validators/ajv.factory';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema } from 'json-schema-to-ts';
import type { UUID } from 'crypto';
import type { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';

/**
 * Ephemeral tool entity representing an MCP tool.
 * These tools are not persisted to the database but are dynamically loaded
 * from MCP integrations at conversation start.
 */
export class McpIntegrationTool extends Tool {
  public readonly integrationId: UUID;
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
      name: mcpTool.name,
      description: mcpTool.description ?? '',
      parameters: mcpTool.inputSchema,
      type: ToolType.MCP_TOOL,
    });
    this.integrationId = mcpTool.integrationId;
    this.integrationName = integrationName;
    this.integrationLogoUrl = integrationLogoUrl;
    this._returnsPii = returnsPii;
  }

  validateParams(
    params: Record<string, unknown>,
  ): FromSchema<typeof this.parameters> {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as FromSchema<typeof this.parameters>;
  }

  get returnsPii(): boolean {
    return this._returnsPii;
  }
}
