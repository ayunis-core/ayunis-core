import type { Tool } from '../../../domain/tool.entity';
import type { ToolExecutionContext } from '../../ports/execution.handler';

export class ExecuteToolCommand {
  constructor(
    public readonly tool: Tool,
    public readonly input: Record<string, any>,
    public readonly context: ToolExecutionContext,
  ) {}
}
