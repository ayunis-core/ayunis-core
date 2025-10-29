import Ajv from 'ajv';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import { FromSchema } from 'json-schema-to-ts';
import { UUID } from 'crypto';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';

/**
 * Ephemeral tool entity representing an MCP tool.
 * These tools are not persisted to the database but are dynamically loaded
 * from MCP integrations at conversation start.
 */
export class McpIntegrationTool extends Tool {
  public readonly integrationId: UUID;

  constructor(mcpTool: McpTool) {
    super({
      name: mcpTool.name,
      description: mcpTool.description ?? '',
      parameters: mcpTool.inputSchema,
      type: ToolType.MCP_TOOL,
    });
    this.integrationId = mcpTool.integrationId;
  }

  validateParams(
    params: Record<string, any>,
  ): FromSchema<typeof this.parameters> {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as FromSchema<typeof this.parameters>;
  }
}
