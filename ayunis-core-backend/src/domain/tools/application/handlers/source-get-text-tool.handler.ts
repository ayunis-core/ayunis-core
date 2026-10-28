import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SourceGetTextTool } from 'src/domain/tools/domain/tools/source-get-text-tool.entity';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { GetTextSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { GetTextSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.query';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import toolsConfig from 'src/config/tools.config';
import {
  TextExtractionTruncationReason,
  validateTextExtraction,
} from 'src/domain/tools/application/utils/text-extraction.utils';
import { ExtractTextLinesUseCase } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.use-case';
import { ExtractTextLinesQuery } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.query';

/** PostgreSQL max int for "read to end" when endLine is -1 */
const MAX_END_LINE = 2147483647;

interface SourceGetTextResult {
  sourceId: string;
  sourceName: string;
  totalLines: number;
  requestedStartLine: number;
  requestedEndLine: number;
  actualStartLine: number;
  actualEndLine: number;
  truncated: boolean;
  truncationReasons: TextExtractionTruncationReason[];
  text: string;
}

@Injectable()
export class SourceGetTextToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(SourceGetTextToolHandler.name);

  constructor(
    private readonly getSourceByIdUseCase: GetTextSourceByIdUseCase,
    private readonly extractTextLinesUseCase: ExtractTextLinesUseCase,
    @Inject(toolsConfig.KEY)
    private readonly config: ConfigType<typeof toolsConfig>,
  ) {
    super();
  }

  async execute(params: {
    tool: SourceGetTextTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log({ tool: tool.name, input }, 'execute');

    try {
      return await this.getText(tool, input);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error({ err: error }, 'execute');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: false,
      });
    }
  }

  private async getText(
    tool: SourceGetTextTool,
    input: Record<string, unknown>,
  ): Promise<string> {
    const {
      sourceId,
      startLine = 1,
      endLine = -1,
    } = tool.validateParams(input);
    const source = await this.getTextSource(sourceId as UUID, tool.name);
    const dbResult = await this.extractTextLinesUseCase.execute(
      new ExtractTextLinesQuery({
        sourceId: source.id,
        startLine,
        endLine: endLine === -1 ? MAX_END_LINE : endLine,
      }),
    );
    if (!dbResult) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Source text not found for "${source.name}"`,
        exposeToLLM: true,
      });
    }
    const extraction = validateTextExtraction({
      toolName: tool.name,
      dbResult,
      startLine,
      endLine,
      ...this.config.sourceGetText,
    });
    const result: SourceGetTextResult = {
      sourceId: source.id,
      sourceName: source.name,
      totalLines: extraction.totalLines,
      requestedStartLine: startLine,
      requestedEndLine: endLine,
      actualStartLine: extraction.effectiveStartLine,
      actualEndLine: extraction.effectiveEndLine,
      truncated: extraction.truncated,
      truncationReasons: extraction.truncationReasons,
      text: extraction.extractedText,
    };
    return JSON.stringify(result);
  }

  private async getTextSource(
    sourceId: UUID,
    toolName: string,
  ): Promise<TextSource> {
    const source = await this.getSourceByIdUseCase.execute(
      new GetTextSourceByIdQuery(sourceId),
    );
    if (!(source instanceof TextSource)) {
      throw new ToolExecutionFailedError({
        toolName,
        message: `Source "${source.name}" is not a text source and cannot be read with this tool`,
        exposeToLLM: true,
      });
    }
    return source;
  }
}
