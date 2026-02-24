import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SourceGetTextTool } from '../../domain/tools/source-get-text-tool.entity';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { GetTextSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { GetTextSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.query';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import toolsConfig from 'src/config/tools.config';
import { extractTextByLineRange } from '../utils/text-extraction.utils';

interface SourceGetTextResult {
  sourceId: string;
  sourceName: string;
  totalLines: number;
  requestedStartLine: number;
  requestedEndLine: number;
  actualStartLine: number;
  actualEndLine: number;
  text: string;
}

@Injectable()
export class SourceGetTextToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(SourceGetTextToolHandler.name);

  constructor(
    private readonly getSourceByIdUseCase: GetTextSourceByIdUseCase,
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
    this.logger.log('execute', { tool: tool.name, input });

    try {
      const validatedInput = tool.validateParams(input);
      const { sourceId, startLine = 1, endLine = -1 } = validatedInput;
      const { maxLines, maxChars } = this.config.sourceGetText;

      const source = await this.getSourceByIdUseCase.execute(
        new GetTextSourceByIdQuery(sourceId as UUID),
      );

      if (!(source instanceof TextSource)) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Source "${source.name}" is not a text source and cannot be read with this tool`,
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

      const result: SourceGetTextResult = {
        sourceId: source.id,
        sourceName: source.name,
        totalLines: extraction.totalLines,
        requestedStartLine: startLine,
        requestedEndLine: endLine,
        actualStartLine: extraction.effectiveStartLine,
        actualEndLine: extraction.effectiveEndLine,
        text: extraction.extractedText,
      };

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
      });
    }
  }
}
