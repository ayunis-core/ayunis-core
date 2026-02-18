import { createAjv } from 'src/common/validators/ajv.factory';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';

/**
 * Ephemeral tool entity representing an MCP prompt retrieval tool.
 * This tool allows LLMs to retrieve prompt templates from MCP integrations.
 * Prompts are predefined conversational templates with structured guidance.
 */
export class McpPromptTool extends Tool {
  constructor() {
    super({
      name: 'retrieve_mcp_prompt',
      description:
        'Retrieve a prompt template from an MCP integration. Prompts are predefined conversational templates that provide structured guidance for specific tasks. Use this when you need reusable prompt patterns from MCP servers.',
      parameters: {
        type: 'object',
        properties: {
          integrationId: {
            type: 'string',
            description:
              'The ID of the MCP integration to retrieve the prompt from',
          },
          promptName: {
            type: 'string',
            description: 'The name of the prompt template to retrieve',
          },
          arguments: {
            type: 'object',
            description: 'Optional arguments for prompt template substitution',
            additionalProperties: true,
          },
        },
        required: ['integrationId', 'promptName'],
      } as JSONSchema,
      type: ToolType.MCP_PROMPT,
    });
  }

  validateParams(
    params: Record<string, any>,
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
    return false;
  }
}
