import { Tool } from '../../domain/tool.entity';

export abstract class BaseExecutionHandler {
  abstract execute(tool: Tool, input: Record<string, unknown>): Promise<string>;
}
