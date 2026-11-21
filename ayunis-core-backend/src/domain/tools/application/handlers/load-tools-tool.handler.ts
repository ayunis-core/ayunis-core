import { Injectable, Logger } from '@nestjs/common';
import { AddLoadedCapabilitiesToThreadCommand } from 'src/domain/threads/application/use-cases/add-loaded-capabilities-to-thread/add-loaded-capabilities-to-thread.command';
import { AddLoadedCapabilitiesToThreadUseCase } from 'src/domain/threads/application/use-cases/add-loaded-capabilities-to-thread/add-loaded-capabilities-to-thread.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import {
  type LoadableToolGroup,
  LoadToolsTool,
} from 'src/domain/tools/domain/tools/load-tools-tool.entity';

/**
 * Stores the requested tool groups as loaded capabilities of the thread. The
 * run refreshes after the call and reads them from the thread, so they must be
 * stored before the result is returned.
 */
@Injectable()
export class LoadToolsToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(LoadToolsToolHandler.name);

  constructor(
    private readonly addLoadedCapabilitiesToThreadUseCase: AddLoadedCapabilitiesToThreadUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: LoadToolsTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log({ name: tool.name, input }, 'execute');
    const groups = this.requestedGroups(tool, input);
    await this.addLoadedCapabilitiesToThreadUseCase.execute(
      new AddLoadedCapabilitiesToThreadCommand(
        context.threadId,
        groups.map((group) => group.id),
      ),
    );
    const loaded = groups
      .map((group) => `${group.id} (${group.toolNames.join(', ')})`)
      .join('; ');
    return `Loaded ${loaded}. These tools are available now.`;
  }

  private requestedGroups(
    tool: LoadToolsTool,
    input: Record<string, unknown>,
  ): LoadableToolGroup[] {
    try {
      return tool.groupsFor(tool.validateParams(input));
    } catch (error) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Invalid parameters',
        exposeToLLM: true,
      });
    }
  }
}
