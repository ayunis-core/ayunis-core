import type { JSONSchema, FromSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

/**
 * Ephemeral tool entity carrying a function definition supplied inline by an
 * external client through the OpenAI-compatible chat completions endpoint.
 * Not persisted; constructed per request.
 */
export class OpenAICompatibilityTool extends Tool {
  constructor(params: {
    name: string;
    description: string;
    parameters: JSONSchema;
  }) {
    super({
      name: params.name,
      description: params.description,
      parameters: params.parameters,
      type: ToolType.OPENAI_COMPAT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): FromSchema<typeof this.parameters> {
    return params as FromSchema<typeof this.parameters>;
  }

  get returnsPii(): boolean {
    return false;
  }
}
