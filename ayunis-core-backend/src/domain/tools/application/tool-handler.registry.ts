import { Inject, Injectable, Logger } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolExecutionHandler } from './ports/execution.handler';
import { ToolHandlerNotFoundError } from './tools.errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructor types vary; used only for instanceof matching
export type ToolConstructor = abstract new (...args: any[]) => Tool;

export type ToolHandlerEntry = readonly [ToolConstructor, ToolExecutionHandler];

export const TOOL_HANDLER_ENTRIES = Symbol('TOOL_HANDLER_ENTRIES');

@Injectable()
export class ToolHandlerRegistry {
  private readonly logger = new Logger(ToolHandlerRegistry.name);

  constructor(
    @Inject(TOOL_HANDLER_ENTRIES)
    private readonly entries: readonly ToolHandlerEntry[],
  ) {}

  getHandler(tool: Tool): ToolExecutionHandler {
    this.logger.log({ name: tool.name }, 'Getting handler for tool');

    const entry = this.entries.find(([ctor]) => tool instanceof ctor);
    if (entry) {
      return entry[1];
    }

    throw new ToolHandlerNotFoundError({ toolType: tool.name });
  }
}
