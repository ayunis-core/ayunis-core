import type { UUID } from 'crypto';
import type { Tool } from 'src/domain/tools/domain/tool.entity';

export interface ToolExecutionContext {
  orgId: UUID;
  threadId: UUID;
}

export abstract class ToolExecutionHandler {
  abstract execute(params: {
    tool: Tool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string>;
}
