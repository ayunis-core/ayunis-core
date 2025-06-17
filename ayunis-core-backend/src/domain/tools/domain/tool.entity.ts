import { JSONSchema, FromSchema } from 'json-schema-to-ts';
import { ToolType } from './value-objects/tool-type.enum';

export abstract class Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  type: ToolType;

  constructor(params: {
    name: string;
    description: string;
    parameters: JSONSchema;
    type: ToolType;
  }) {
    this.name = params.name;
    this.description = params.description;
    this.parameters = params.parameters;
    this.type = params.type;
  }

  abstract validateParams(
    params: Record<string, any>,
  ): FromSchema<typeof this.parameters>;
}
