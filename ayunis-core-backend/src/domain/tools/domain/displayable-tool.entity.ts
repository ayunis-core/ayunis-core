import type { JSONSchema } from 'json-schema-to-ts';
import { Tool } from './tool.entity';
import type { ToolType } from './value-objects/tool-type.enum';

export abstract class DisplayableTool extends Tool {
  isDisplayable: boolean = true;

  /**
   * When true, the backend executes this tool (side effects) before returning
   * the displayable tool result to the LLM. Subclasses opt in by overriding.
   */
  isExecutable: boolean = false;

  constructor(params: {
    name: string;
    description: string;
    descriptionLong?: string;
    parameters: JSONSchema;
    type: ToolType;
  }) {
    super(params);
  }
}
