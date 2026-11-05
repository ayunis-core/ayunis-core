import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { GetMemoryTool } from 'src/domain/tools/domain/tools/get-memory-tool.entity';
import { FindUserMemoryUseCase } from 'src/domain/memory/application/use-cases/find-user-memory/find-user-memory.use-case';
import { GetMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/get-memory-entry/get-memory-entry.use-case';
import { GetMemoryEntryQuery } from 'src/domain/memory/application/use-cases/get-memory-entry/get-memory-entry.query';
import { MemoryError } from 'src/domain/memory/application/memory.errors';

@Injectable()
export class GetMemoryToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(GetMemoryToolHandler.name);

  constructor(
    private readonly getMemoryEntryUseCase: GetMemoryEntryUseCase,
    private readonly findUserMemoryUseCase: FindUserMemoryUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: GetMemoryTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    const { key } = tool.validateParams(input);
    this.logger.log({ name: tool.name, key }, 'execute');

    const entry = await this.resolveEntry(tool.name, key);
    if (entry) {
      return entry;
    }

    // A miss is an ordinary outcome, not a failure: the model picked a key from
    // the prompt listing and the user may have deleted it since. Telling it
    // which keys exist lets it recover without involving the user.
    return this.describeMiss(key);
  }

  private async resolveEntry(
    toolName: string,
    key: string,
  ): Promise<string | null> {
    try {
      const entry = await this.getMemoryEntryUseCase.execute(
        new GetMemoryEntryQuery(key),
      );
      return entry ? entry.content : null;
    } catch (error) {
      if (error instanceof MemoryError) {
        throw new ToolExecutionFailedError({
          toolName,
          message: error.message,
          exposeToLLM: true,
        });
      }
      throw error;
    }
  }

  private async describeMiss(key: string): Promise<string> {
    const entries = await this.findUserMemoryUseCase.execute();
    const keys = entries.map((entry) => entry.key);

    if (keys.length === 0) {
      return `No memory entry "${key}". Memory is currently empty.`;
    }

    return `No memory entry "${key}". Available keys: ${keys.join(', ')}.`;
  }
}
