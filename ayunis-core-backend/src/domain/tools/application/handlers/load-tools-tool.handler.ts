import { Injectable } from '@nestjs/common';
import { LoadToolsTool } from 'src/domain/tools/domain/tools/load-tools-tool.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';

@Injectable()
export class LoadToolsToolHandler extends ToolExecutionHandler {
  execute(params: {
    tool: Tool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    if (!(params.tool instanceof LoadToolsTool)) {
      throw new Error('Invalid load_tools handler input');
    }
    const { toolNames } = params.tool.validateParams(params.input);
    return Promise.resolve(JSON.stringify({ loadedToolNames: toolNames }));
  }
}
