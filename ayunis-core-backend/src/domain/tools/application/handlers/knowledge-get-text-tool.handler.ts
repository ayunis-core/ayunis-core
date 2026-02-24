import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { KnowledgeGetTextTool } from '../../domain/tools/knowledge-get-text-tool.entity';
import type { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { GetKnowledgeBaseDocumentTextUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.use-case';
import { GetKnowledgeBaseDocumentTextQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.query';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { ContextService } from 'src/common/context/services/context.service';
import toolsConfig from 'src/config/tools.config';
import { extractTextByLineRange } from '../utils/text-extraction.utils';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

interface KnowledgeGetTextResult {
  knowledgeBaseId: string;
  documentId: string;
  documentName: string;
  totalLines: number;
  requestedStartLine: number;
  requestedNumLines: number;
  actualStartLine: number;
  actualEndLine: number;
  text: string;
}

@Injectable()
export class KnowledgeGetTextToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(KnowledgeGetTextToolHandler.name);

  constructor(
    private readonly getDocumentTextUseCase: GetKnowledgeBaseDocumentTextUseCase,
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
    this.logger.log('execute', { tool: tool.name, input });

    try {
      const validatedInput = tool.validateParams(input);
      const {
        knowledgeBaseId,
        documentId,
        startLine = 1,
        numLines = 100,
      } = validatedInput;
      const endLine = startLine + numLines - 1;
      const { maxLines, maxChars } = this.config.sourceGetText;

      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: 'User not authenticated',
          exposeToLLM: false,
        });
      }

      const source = await this.getDocumentTextUseCase.execute(
        new GetKnowledgeBaseDocumentTextQuery({
          knowledgeBaseId: knowledgeBaseId as UUID,
          documentId: documentId as UUID,
          orgId,
          userId,
        }),
      );

      if (!(source instanceof TextSource)) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Document "${source.name}" is not a text source`,
          exposeToLLM: true,
        });
      }

      const text = source.text || '';
      const extraction = extractTextByLineRange({
        toolName: tool.name,
        text,
        startLine,
        endLine,
        maxLines,
        maxChars,
      });

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
          text: extraction.extractedText,
        }),
      );
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
      text: params.text,
    };
  }
}
