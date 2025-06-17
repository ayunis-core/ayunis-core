import { Tool } from '../../../domain/tool.entity';

export class ExecuteToolCommand {
  constructor(
    public readonly tool: Tool,
    public readonly input: Record<string, any>,
  ) {}
}
