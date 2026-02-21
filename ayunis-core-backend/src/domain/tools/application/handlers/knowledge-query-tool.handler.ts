import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeQueryTool } from '../../domain/tools/knowledge-query-tool.entity';
import type { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { QueryKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/query-knowledge-base/query-knowledge-base.use-case';
import { QueryKnowledgeBaseQuery } from 'src/domain/knowledge-bases/application/use-cases/query-knowledge-base/query-knowledge-base.query';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { handleEmbeddingError } from '../utils/embedding-error.utils';

@Injectable()
export class KnowledgeQueryToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(KnowledgeQueryToolHandler.name);

  constructor(
    private readonly queryKnowledgeBaseUseCase: QueryKnowledgeBaseUseCase,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  async execute(params: {
    tool: KnowledgeQueryTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('execute', { tool: tool.name, input });

    try {
      const validatedInput = tool.validateParams(input);
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: 'User not authenticated',
          exposeToLLM: false,
        });
      }

      const results = await this.queryKnowledgeBaseUseCase.execute(
        new QueryKnowledgeBaseQuery({
          knowledgeBaseId: validatedInput.knowledgeBaseId as UUID,
          query: validatedInput.query,
          userId,
        }),
      );

      const formatted = results.map((result) => ({
        content: result.chunk.content,
        startLine: (result.chunk.meta.startLine as number | undefined) ?? null,
        endLine: (result.chunk.meta.endLine as number | undefined) ?? null,
        fileName: (result.chunk.meta.fileName as string | undefined) ?? null,
        documentId: result.sourceId,
        documentName: result.sourceName,
      }));

      return JSON.stringify(formatted);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      return this.handleError(error, tool.name);
    }
  }

  private handleError(error: unknown, toolName: string): never {
    this.logger.error('execute', error);

    if (error instanceof KnowledgeBaseNotFoundError) {
      throw new ToolExecutionFailedError({
        toolName,
        message:
          'Knowledge base not found. It may have been deleted or you may not have access.',
        exposeToLLM: true,
      });
    }

    handleEmbeddingError(error, toolName);
  }
}
