import { UUID } from 'crypto';
import { Tool } from 'src/domain/tools/domain/tool.entity';

export abstract class ToolExecutionHandler {
  abstract execute(params: {
    tool: Tool;
    input: Record<string, any>;
    orgId: UUID;
  }): Promise<string>;
}
