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
import {
  TextExtractionTruncationReason,
  validateTextExtraction,
} from 'src/domain/tools/application/utils/text-extraction.utils';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { ExtractTextLinesUseCase } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.use-case';
import { ExtractTextLinesQuery } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.query';

/** PostgreSQL max int for "read to end" when endLine is -1 */
const MAX_END_LINE = 2147483647;

interface KnowledgeGetTextResult {
  knowledgeBaseId: string;
  documentId: string;
  documentName: string;
  totalLines: number;
  requestedStartLine: number;
  requestedNumLines: number;
  actualStartLine: number;
  actualEndLine: number;
  truncated: boolean;
  truncationReasons: TextExtractionTruncationReason[];
  text: string;
}

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
      return await this.getText(tool, input, orgId);
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
  ): Promise<string> {
    const validated = tool.validateParams(input);
    const {
      knowledgeBaseId,
      documentId,
      startLine = 1,
      numLines = 100,
    } = validated;
    const endLine = startLine + numLines - 1;
    const source = await this.getTextSource(
      tool.name,
      knowledgeBaseId as UUID,
      documentId as UUID,
      orgId,
    );
    const extraction = await this.extractText(
      tool.name,
      source,
      startLine,
      endLine,
    );
    return JSON.stringify(
      this.buildResult({
        knowledgeBaseId,
        documentId,
        documentName: source.name,
        totalLines: extraction.totalLines,
        startLine,
        numLines,
        actualStartLine: extraction.effectiveStartLine,
        actualEndLine: extraction.effectiveEndLine,
        truncated: extraction.truncated,
        truncationReasons: extraction.truncationReasons,
        text: extraction.extractedText,
      }),
    );
  }

  private async extractText(
    toolName: string,
    source: TextSource,
    startLine: number,
    endLine: number,
  ): Promise<ReturnType<typeof validateTextExtraction>> {
    const dbResult = await this.extractTextLinesUseCase.execute(
      new ExtractTextLinesQuery({
        sourceId: source.id,
        startLine,
        endLine: endLine === -1 ? MAX_END_LINE : endLine,
      }),
    );
    if (!dbResult) {
      throw new ToolExecutionFailedError({
        toolName,
        message: `Document text not found for "${source.name}"`,
        exposeToLLM: true,
      });
    }
    return validateTextExtraction({
      toolName,
      dbResult,
      startLine,
      endLine,
      ...this.config.sourceGetText,
    });
  }

  private async getTextSource(
    toolName: string,
    knowledgeBaseId: UUID,
    documentId: UUID,
    orgId: UUID,
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

  private buildResult(params: {
    knowledgeBaseId: string;
    documentId: string;
    documentName: string;
    totalLines: number;
    startLine: number;
    numLines: number;
    actualStartLine: number;
    actualEndLine: number;
    truncated: boolean;
    truncationReasons: TextExtractionTruncationReason[];
    text: string;
  }): KnowledgeGetTextResult {
    return {
      knowledgeBaseId: params.knowledgeBaseId,
      documentId: params.documentId,
      documentName: params.documentName,
      totalLines: params.totalLines,
      requestedStartLine: params.startLine,
      requestedNumLines: params.numLines,
      actualStartLine: params.actualStartLine,
      actualEndLine: params.actualEndLine,
      truncated: params.truncated,
      truncationReasons: params.truncationReasons,
      text: params.text,
    };
  }
}
