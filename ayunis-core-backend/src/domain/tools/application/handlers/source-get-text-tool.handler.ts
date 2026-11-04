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
import { paginateSourceText } from 'src/domain/tools/application/utils/source-text-page.utils';
import { serializeTextResult } from 'src/domain/tools/application/utils/tool-text-budget.utils';
import { ExtractTextLinesUseCase } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.use-case';
import { ExtractTextLinesQuery } from 'src/domain/sources/application/use-cases/extract-text-lines/extract-text-lines.query';

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
      startCharacter = 0,
      endLine = -1,
    } = tool.validateParams(input);
    const source = await this.getTextSource(sourceId as UUID, tool.name);
    const dbResult = await this.extractTextLinesUseCase.execute(
      new ExtractTextLinesQuery({
        sourceId: source.id,
        startLine,
        endLine: Math.min(
          endLine === -1 ? Infinity : endLine,
          startLine + this.config.sourceGetText.maxLines - 1,
        ),
      }),
    );
    if (!dbResult) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Source text not found for "${source.name}"`,
        exposeToLLM: true,
      });
    }
    const { nextPosition, ...page } = paginateSourceText({
      toolName: tool.name,
      dbResult,
      startLine,
      startCharacter,
      endLine,
      ...this.config.sourceGetText,
    });
    const result = {
      sourceId: source.id,
      sourceName: source.name,
      ...page,
      requestedStartLine: startLine,
      requestedEndLine: endLine,
      nextPage: nextPosition ? { sourceId, endLine, ...nextPosition } : null,
    };
    return serializeTextResult(result, tool.name);
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
