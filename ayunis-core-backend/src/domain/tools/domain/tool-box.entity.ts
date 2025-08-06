import { Tool } from './tool.entity';
import { ToolBoxType } from './value-objects/tool-box-types.enum';

export class ToolBox {
  constructor(
    public readonly type: ToolBoxType,
    public readonly tools: Tool[],
  ) {}
}
