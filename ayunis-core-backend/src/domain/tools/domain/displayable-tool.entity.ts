import { JSONSchema } from 'json-schema-to-ts';
import { Tool } from './tool.entity';
import { ToolType } from './value-objects/tool-type.enum';

export abstract class DisplayableTool extends Tool {
  isDisplayable: boolean = true;

  constructor(params: {
    name: string;
    description: string;
    parameters: JSONSchema;
    type: ToolType;
  }) {
    super(params);
  }
}
