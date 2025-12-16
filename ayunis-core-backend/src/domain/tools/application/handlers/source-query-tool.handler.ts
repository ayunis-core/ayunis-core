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
import {
  ModelNotFoundByIdError,
  ModelError,
} from 'src/domain/models/application/models.errors';
import {
  EmbeddingsProviderNotFoundError,
  NoEmbeddingsProviderAvailableError,
  EmbeddingsError,
} from 'src/domain/rag/embeddings/application/embeddings.errors';

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
        };
      });

      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('execute', error);

      // Handle specific model and embedding errors with user-friendly messages
      if (error instanceof ModelNotFoundByIdError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message:
            'No embedding model is available for your organization. Please contact your administrator to enable an embedding model.',
          exposeToLLM: true,
          metadata: {
            error: error.message,
          },
        });
      }

      if (error instanceof EmbeddingsProviderNotFoundError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message:
            'The embedding provider is not configured. Please contact your administrator to set up the embedding provider.',
          exposeToLLM: true,
          metadata: {
            error: error.message,
          },
        });
      }

      if (error instanceof NoEmbeddingsProviderAvailableError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message:
            'The embedding provider is not available. Please check the configuration or contact your administrator.',
          exposeToLLM: true,
          metadata: {
            error: error.message,
          },
        });
      }

      if (error instanceof ModelError || error instanceof EmbeddingsError) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message:
            'There is an issue with the embedding model configuration. Please contact your administrator.',
          exposeToLLM: true,
          metadata: {
            error: error.message,
          },
        });
      }

      // Check for vector dimension mismatch errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('different vector dimensions')) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message:
            'This source was indexed with a different embedding model than is currently configured. Please contact your administrator to ensure consistent embedding model usage.',
          exposeToLLM: true,
          metadata: {
            error: errorMessage,
          },
        });
      }

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
