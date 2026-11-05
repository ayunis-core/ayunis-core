import { Injectable, Logger } from '@nestjs/common';
import { SourceQueryTool } from 'src/domain/tools/domain/tools/source-query-tool.entity';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { QueryTextSourceUseCase } from 'src/domain/sources/application/use-cases/query-text-source/query-text-source.use-case';
import { QueryTextSourceCommand } from 'src/domain/sources/application/use-cases/query-text-source/query-text-source.command';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { handleEmbeddingError } from 'src/domain/tools/application/utils/embedding-error.utils';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceNotFoundError } from 'src/domain/sources/application/sources.errors';

@Injectable()
export class SourceQueryToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(SourceQueryToolHandler.name);

  constructor(private readonly queryTextSourceUseCase: QueryTextSourceUseCase) {
    super();
  }

  async execute(params: {
    tool: SourceQueryTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { orgId } = context;
    this.logger.log({ name: tool.name, input: input }, 'execute');
    try {
      const validatedInput = tool.validateParams(input);
      const results = await this.queryTextSourceUseCase.execute(
        new QueryTextSourceCommand({
          orgId,
          sourceIds: validatedInput.sourceIds as UUID[],
          queries: validatedInput.queries,
        }),
      );

      const formatted = results.map(({ chunk, ...result }) => ({
        chunkId: chunk.id,
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        citable: result.sourceCreatedBy !== SourceCreator.SYSTEM,
        content: chunk.content,
        startLine: (chunk.meta.startLine as number | undefined) ?? null,
        endLine: (chunk.meta.endLine as number | undefined) ?? null,
        fileName: (chunk.meta.fileName as string | undefined) ?? null,
        url: (chunk.meta.url as string | undefined) ?? null,
        matchedQueries: result.matchedQueries,
      }));

      return JSON.stringify(formatted);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error({ err: error }, 'execute');
      if (error instanceof SourceNotFoundError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `${error.message}. It may have been deleted; search the remaining files without it.`,
          exposeToLLM: true,
        });
      }
      handleEmbeddingError(error, tool.name);
    }
  }
}
