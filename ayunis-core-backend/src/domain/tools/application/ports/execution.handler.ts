import { UUID } from 'crypto';
import { Tool } from 'src/domain/tools/domain/tool.entity';

export interface ToolExecutionContext {
  orgId: UUID;
  threadId: UUID;
}

export abstract class ToolExecutionHandler {
  abstract execute(params: {
    tool: Tool;
    input: Record<string, any>;
    context: ToolExecutionContext;
  }): Promise<string>;
}
