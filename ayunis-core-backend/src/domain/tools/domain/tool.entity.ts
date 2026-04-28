import type { JSONSchema, FromSchema } from 'json-schema-to-ts';
import type { ToolType } from './value-objects/tool-type.enum';

/**
 * The fields every LLM-facing tool exposes — name, description, and a
 * JSON-schema for arguments. `Tool` (persisted, factory-created) and
 * `InlineToolDefinition` (transport-layer, supplied per-request by external
 * callers like the OpenAI-compat endpoint) both satisfy this shape.
 *
 * Provider message converters take `ToolSchema` so they can serialize either
 * source uniformly without needing the rest of the `Tool` API surface
 * (`type`, `validateParams`, `returnsPii`).
 */
export interface ToolSchema {
  readonly name: string;
  readonly description: string;
  readonly parameters: JSONSchema;
}

export abstract class Tool implements ToolSchema {
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
    params: Record<string, unknown>,
  ): FromSchema<typeof this.parameters>;

  /**
   * Indicates whether this tool may return PII in its results.
   * Used to determine if anonymization is needed for tool outputs in anonymous mode.
   */
  abstract get returnsPii(): boolean;
}
