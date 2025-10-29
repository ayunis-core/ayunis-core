import Ajv from 'ajv';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { UUID } from 'crypto';
import { McpResource } from 'src/domain/mcp/domain/mcp-resource.entity';

const mcpResourceToolParameters = {
  type: 'object' as const,
  properties: {
    resourceUri: { type: 'string' as const },
  },
  required: ['resourceUri'],
} as const satisfies JSONSchema;

type McpResourceToolParameters = FromSchema<typeof mcpResourceToolParameters>;

function getDescription(mcpResource: McpResource): string {
  return `Retrieve this resource from the MCP integration: ${mcpResource.name}.\nDescription: ${mcpResource.description ?? ''}\nURI: ${mcpResource.uri}\nArguments: ${mcpResource.arguments?.map((arg) => `${arg.name}: ${arg.description}`).join(', ')}`;
}

/**
 * Ephemeral tool entity representing an MCP resource retrieval tool.
 * This tool allows LLMs to retrieve resources from MCP integrations.
 * CSV resources are automatically imported as data sources.
 */
export class McpIntegrationResource extends Tool {
  public readonly integrationId: UUID;
  constructor(mcpResource: McpResource) {
    super({
      name: mcpResource.name,
      description: getDescription(mcpResource),
      parameters: mcpResourceToolParameters,
      type: ToolType.MCP_RESOURCE,
    });
    this.integrationId = mcpResource.integrationId;
  }

  validateParams(params: Record<string, any>): McpResourceToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as McpResourceToolParameters;
  }
}
