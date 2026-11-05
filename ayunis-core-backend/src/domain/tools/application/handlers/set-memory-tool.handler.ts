import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { SetMemoryTool } from 'src/domain/tools/domain/tools/set-memory-tool.entity';
import { UpsertMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/upsert-memory-entry/upsert-memory-entry.use-case';
import { UpsertMemoryEntryCommand } from 'src/domain/memory/application/use-cases/upsert-memory-entry/upsert-memory-entry.command';
import { DeleteMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/delete-memory-entry/delete-memory-entry.use-case';
import { DeleteMemoryEntryCommand } from 'src/domain/memory/application/use-cases/delete-memory-entry/delete-memory-entry.command';
import { MemoryError } from 'src/domain/memory/application/memory.errors';
import { isReservedMemoryKey } from 'src/domain/memory/domain/memory.constants';

@Injectable()
export class SetMemoryToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(SetMemoryToolHandler.name);

  constructor(
    private readonly upsertMemoryEntryUseCase: UpsertMemoryEntryUseCase,
    private readonly deleteMemoryEntryUseCase: DeleteMemoryEntryUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: SetMemoryTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    const { key, content, description } = tool.validateParams(input);
    this.logger.log(
      { name: tool.name, key, contentLength: content.length },
      'execute',
    );

    try {
      return content.trim().length === 0
        ? await this.remove(key)
        : await this.store(key, content, description);
    } catch (error) {
      if (error instanceof MemoryError) {
        // The model can fix an invalid key, over-long content or a full store
        // on its own, so the reason has to reach it.
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: error.message,
          exposeToLLM: true,
        });
      }
      throw error;
    }
  }

  private async store(
    key: string,
    content: string,
    description: string | undefined,
  ): Promise<string> {
    const entry = await this.upsertMemoryEntryUseCase.execute(
      new UpsertMemoryEntryCommand(key, content, description),
    );

    return `Stored memory "${entry.key}".`;
  }

  private async remove(key: string): Promise<string> {
    await this.deleteMemoryEntryUseCase.execute(
      new DeleteMemoryEntryCommand(key),
    );

    return isReservedMemoryKey(key)
      ? `Cleared memory "${key}". The key stays available.`
      : `Removed memory "${key}".`;
  }
}
