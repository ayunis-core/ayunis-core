import { Tool } from 'src/domain/tools/domain/tool.entity';

export abstract class ToolExecutionHandler {
  abstract execute(tool: Tool, input: Record<string, any>): Promise<string>;
}
