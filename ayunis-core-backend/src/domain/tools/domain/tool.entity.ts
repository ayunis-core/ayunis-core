import type { JSONSchema, FromSchema } from 'json-schema-to-ts';
import type { ToolType } from './value-objects/tool-type.enum';

export abstract class Tool {
  name: string;
  description: string;
  /**
   * Extended description with detailed usage instructions for the system prompt.
   * This is NOT sent to the LLM tool schema - it's only used in the system prompt
   * to provide guidance on when and how to use the tool.
   */
  descriptionLong?: string;
  parameters: JSONSchema;
  type: ToolType;

  constructor(params: {
    name: string;
    description: string;
    descriptionLong?: string;
    parameters: JSONSchema;
    type: ToolType;
  }) {
    this.name = params.name;
    this.description = params.description;
    this.descriptionLong = params.descriptionLong;
    this.parameters = params.parameters;
    this.type = params.type;
  }

  abstract validateParams(
    params: Record<string, any>,
  ): FromSchema<typeof this.parameters>;

  /**
   * Indicates whether this tool may return PII in its results.
   * Used to determine if anonymization is needed for tool outputs in anonymous mode.
   */
  abstract get returnsPii(): boolean;
}
