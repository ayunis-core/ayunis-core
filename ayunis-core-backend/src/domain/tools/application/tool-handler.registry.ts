import { Inject, Injectable, Logger } from '@nestjs/common';
import { Tool } from '../domain/tool.entity';
import { ToolExecutionHandler } from './ports/execution.handler';
import { ToolHandlerNotFoundError } from './tools.errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructor types vary; used only as Map keys for instanceof matching
export type ToolConstructor = abstract new (...args: any[]) => Tool;

export type ToolHandlerEntry = [ToolConstructor, ToolExecutionHandler];

export const TOOL_HANDLER_ENTRIES = Symbol('TOOL_HANDLER_ENTRIES');

@Injectable()
export class ToolHandlerRegistry {
  private readonly logger = new Logger(ToolHandlerRegistry.name);

  constructor(
    @Inject(TOOL_HANDLER_ENTRIES)
    private readonly handlers: readonly ToolHandlerEntry[],
  ) {}

  getHandler(tool: Tool): ToolExecutionHandler {
    this.logger.log(`Getting handler for tool: ${tool.name}`);

    const entry = this.handlers.find(([ctor]) => tool instanceof ctor);
    if (entry) {
      return entry[1];
    }

    throw new ToolHandlerNotFoundError({ toolType: tool.name });
  }
}
