import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { KnowledgeGetTextTool } from 'src/domain/tools/domain/tools/knowledge-get-text-tool.entity';
import type { UUID } from 'crypto';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { GetKnowledgeBaseDocumentTextUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.use-case';
import { GetKnowledgeBaseDocumentTextQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.query';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { ContextService } from 'src/common/context/services/context.service';
import toolsConfig from 'src/config/tools.config';
import { paginateSourceText } from 'src/domain/tools/application/utils/source-text-page.utils';
import { serializeTextResult } from 'src/domain/tools/application/utils/tool-text-budget.utils';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { ExtractTextLinesUseCase } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.use-case';
import { ExtractTextLinesQuery } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.query';

@Injectable()
export class KnowledgeGetTextToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(KnowledgeGetTextToolHandler.name);

  constructor(
    private readonly getDocumentTextUseCase: GetKnowledgeBaseDocumentTextUseCase,
    private readonly extractTextLinesUseCase: ExtractTextLinesUseCase,
    private readonly contextService: ContextService,
    @Inject(toolsConfig.KEY)
    private readonly config: ConfigType<typeof toolsConfig>,
  ) {
    super();
  }

  async execute(params: {
    tool: KnowledgeGetTextTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { orgId } = context;
    this.logger.log({ tool: tool.name, input }, 'execute');

    try {
      return await this.getText(tool, input, orgId, context.threadId);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      return this.handleError(error, tool.name);
    }
  }

  private async getText(
    tool: KnowledgeGetTextTool,
    input: Record<string, unknown>,
    orgId: UUID,
    threadId: UUID,
  ): Promise<string> {
    const validated = tool.validateParams(input);
    const {
      knowledgeBaseId,
      documentId,
      startLine = 1,
      startCharacter = 0,
      numLines = this.config.sourceGetText.maxLines,
    } = validated;
    const endLine = startLine + numLines - 1;
    const source = await this.getTextSource(
      tool.name,
      knowledgeBaseId as UUID,
      documentId as UUID,
      orgId,
      threadId,
    );
    const { nextPosition, ...page } = await this.extractText(
      tool.name,
      source,
      startLine,
      endLine,
      startCharacter,
    );
    return serializeTextResult(
      {
        knowledgeBaseId,
        documentId,
        documentName: source.name,
        ...page,
        requestedStartLine: startLine,
        requestedNumLines: numLines,
        nextPage: nextPosition
          ? {
              knowledgeBaseId,
              documentId,
              numLines,
              ...nextPosition,
            }
          : null,
      },
      tool.name,
    );
  }

  private async extractText(
    toolName: string,
    source: TextSource,
    startLine: number,
    endLine: number,
    startCharacter: number,
  ): Promise<ReturnType<typeof paginateSourceText>> {
    const dbResult = await this.extractTextLinesUseCase.execute(
      new ExtractTextLinesQuery({
        sourceId: source.id,
        startLine,
        endLine: Math.min(
          endLine,
          startLine + this.config.sourceGetText.maxLines - 1,
        ),
      }),
    );
    if (!dbResult) {
      throw new ToolExecutionFailedError({
        toolName,
        message: `Document text not found for "${source.name}"`,
        exposeToLLM: true,
      });
    }
    return paginateSourceText({
      toolName,
      dbResult,
      startLine,
      startCharacter,
      endLine: -1,
      ...this.config.sourceGetText,
    });
  }

  private async getTextSource(
    toolName: string,
    knowledgeBaseId: UUID,
    documentId: UUID,
    orgId: UUID,
    threadId: UUID,
  ): Promise<TextSource> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new ToolExecutionFailedError({
        toolName,
        message: 'User not authenticated',
        exposeToLLM: false,
      });
    }
    const source = await this.getDocumentTextUseCase.execute(
      new GetKnowledgeBaseDocumentTextQuery({
        knowledgeBaseId,
        documentId,
        orgId,
        userId,
        threadId,
      }),
    );
    if (!(source instanceof TextSource)) {
      throw new ToolExecutionFailedError({
        toolName,
        message: `Document "${source.name}" is not a text source`,
        exposeToLLM: true,
      });
    }
    return source;
  }

  private handleError(error: unknown, toolName: string): never {
    this.logger.error({ err: error }, 'execute');

    if (error instanceof KnowledgeBaseNotFoundError) {
      throw new ToolExecutionFailedError({
        toolName,
        message:
          'Knowledge base not found. It may have been deleted or you may not have access.',
        exposeToLLM: true,
      });
    }

    if (error instanceof DocumentNotInKnowledgeBaseError) {
      throw new ToolExecutionFailedError({
        toolName,
        message: error.message,
        exposeToLLM: true,
      });
    }

    throw new ToolExecutionFailedError({
      toolName,
      message: error instanceof Error ? error.message : 'Unknown error',
      exposeToLLM: false,
    });
  }
}
