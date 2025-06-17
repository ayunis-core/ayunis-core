import { Injectable, Logger } from '@nestjs/common';
import { BaseExecutionHandler } from './base.handler';
import { SourceQueryTool } from '../../domain/tools/source-query-tool.entity';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { MatchSourceContentChunksUseCase } from 'src/domain/sources/application/use-cases/match-source-content-chunks/match-source-content-chunks.use-case';
import { GetSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.query';
import { MatchSourceCommand } from 'src/domain/sources/application/use-cases/match-source-content-chunks/match-source.command';

@Injectable()
export class SourceQueryToolHandler extends BaseExecutionHandler {
  private readonly logger = new Logger(SourceQueryToolHandler.name);

  constructor(
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
    private readonly matchSourceContentChunksUseCase: MatchSourceContentChunksUseCase,
  ) {
    super();
  }

  async execute(
    tool: SourceQueryTool,
    input: Record<string, unknown>,
  ): Promise<string> {
    this.logger.log('execute', tool, input);
    try {
      const validatedInput = tool.validateParams(input);
      const source = await this.getSourceByIdUseCase.execute(
        new GetSourceByIdQuery(validatedInput.sourceId as UUID),
      );
      if (!source) {
        throw new Error('Source not found');
      }

      const matchedChunks = await this.matchSourceContentChunksUseCase.execute(
        new MatchSourceCommand(
          {
            sourceId: source.id,
          },
          validatedInput.query,
        ),
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
