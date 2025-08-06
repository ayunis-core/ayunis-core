import { Injectable, Logger } from '@nestjs/common';
import { SourceQueryTool } from '../../domain/tools/source-query-tool.entity';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { QuerySourceUseCase } from 'src/domain/sources/application/use-cases/query-source/query-source.use-case';
import { GetSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.query';
import { QuerySourceCommand } from 'src/domain/sources/application/use-cases/query-source/query-source.command';
import { ToolExecutionHandler } from '../ports/execution.handler';

@Injectable()
export class SourceQueryToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(SourceQueryToolHandler.name);

  constructor(
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
    private readonly matchSourceContentChunksUseCase: QuerySourceUseCase,
  ) {
    super();
  }

  async execute(
    tool: SourceQueryTool,
    input: Record<string, unknown>,
  ): Promise<string> {
    this.logger.log('execute', tool, input);
    try {
      const isValid = tool.validateParams(input);
      if (!isValid) {
        this.logger.error('Invalid input', input);
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message:
            'You did not pass valid parameters to the tool. Please check the parameters and try again.',
          exposeToLLM: true,
        });
      }
      const source = await this.getSourceByIdUseCase.execute(
        new GetSourceByIdQuery(input.sourceId as UUID),
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
        new QuerySourceCommand({
          filter: {
            sourceId: source.id,
            userId: input.userId as UUID,
          },
          query: input.query as string,
        }),
      );

      const result = matchedChunks.map((chunk) => {
        return {
          content: chunk.content,
          sourceId: chunk.sourceId,
        };
      });

      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('execute', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}
