import { Injectable, Logger } from '@nestjs/common';
import { SourceQueryTool } from '../../domain/tools/source-query-tool.entity';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { GetTextSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { QueryTextSourceUseCase } from 'src/domain/sources/application/use-cases/query-text-source/query-text-source.use-case';
import { GetTextSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.query';
import { QueryTextSourceCommand } from 'src/domain/sources/application/use-cases/query-text-source/query-text-source.command';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { handleEmbeddingError } from '../utils/embedding-error.utils';

@Injectable()
export class SourceQueryToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(SourceQueryToolHandler.name);

  constructor(
    private readonly getSourceByIdUseCase: GetTextSourceByIdUseCase,
    private readonly matchSourceContentChunksUseCase: QueryTextSourceUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: SourceQueryTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { orgId } = context;
    this.logger.log('execute', tool, input);
    try {
      const validatedInput = tool.validateParams(input);
      const source = await this.getSourceByIdUseCase.execute(
        new GetTextSourceByIdQuery(validatedInput.sourceId as UUID),
      );
      if (!source) {
        this.logger.error('Source not found', input);
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: 'Source not found',
          exposeToLLM: true,
        });
      }

      const matchedChunks = await this.matchSourceContentChunksUseCase.execute(
        new QueryTextSourceCommand({
          orgId,
          filter: {
            sourceId: source.id,
            userId: input.userId as UUID,
          },
          query: validatedInput.query,
        }),
      );

      const result = matchedChunks.map((chunk) => {
        return {
          content: chunk.content,
          startLine: (chunk.meta.startLine as number | undefined) ?? null,
          endLine: (chunk.meta.endLine as number | undefined) ?? null,
          fileName: (chunk.meta.fileName as string | undefined) ?? null,
          url: (chunk.meta.url as string | undefined) ?? null,
        };
      });

      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('execute', error);
      handleEmbeddingError(error, tool.name);
    }
  }
}
