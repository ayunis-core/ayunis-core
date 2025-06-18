import { JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

export class CustomTool extends Tool {
  constructor(params: {
    name: string;
    description: string;
    parameters: JSONSchema;
  }) {
    super({
      name: params.name,
      description: params.description,
      parameters: params.parameters,
      type: ToolType.CUSTOM,
    });
  }

  validateParams(): never {
    throw new Error('Custom tool parameters are not validated');
  }
}
