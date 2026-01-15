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

      // Get the source
      const source = await this.getSourceByIdUseCase.execute(
        new GetTextSourceByIdQuery(sourceId as UUID),
      );

      if (!source) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Source with ID "${sourceId}" not found`,
          exposeToLLM: true,
        });
      }

      // Ensure it's a TextSource
      if (!(source instanceof TextSource)) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Source "${source.name}" is not a text source and cannot be read with this tool`,
          exposeToLLM: true,
        });
      }

      const text = source.text || '';
      const lines = text.split('\n');
      const totalLines = lines.length;

      // Handle empty text
      if (totalLines === 0 || (totalLines === 1 && lines[0] === '')) {
        const result: SourceGetTextResult = {
          sourceId: source.id,
          sourceName: source.name,
          totalLines: 0,
          requestedStartLine: startLine,
          requestedEndLine: endLine,
          actualStartLine: 0,
          actualEndLine: 0,
          text: '',
        };
        return JSON.stringify(result);
      }

      // Validate and clamp line numbers
      const effectiveStartLine = Math.max(1, Math.min(startLine, totalLines));
      const effectiveEndLine =
        endLine === -1
          ? totalLines
          : Math.max(effectiveStartLine, Math.min(endLine, totalLines));

      // Check if start > end (after clamping)
      if (startLine > effectiveEndLine && startLine !== 1) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Invalid line range: startLine (${startLine}) is greater than the file's total lines (${totalLines}). The file has ${totalLines} lines.`,
          exposeToLLM: true,
        });
      }

      // Calculate requested line count
      const requestedLineCount = effectiveEndLine - effectiveStartLine + 1;

      // Check line limit
      if (requestedLineCount > maxLines) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Requested range (${requestedLineCount} lines) exceeds maximum of ${maxLines} lines. Please use a smaller range. Suggestion: try lines ${effectiveStartLine} to ${effectiveStartLine + maxLines - 1}.`,
          exposeToLLM: true,
        });
      }

      // Extract the requested lines (convert to 0-indexed)
      const extractedLines = lines.slice(
        effectiveStartLine - 1,
        effectiveEndLine,
      );
      const extractedText = extractedLines.join('\n');

      // Check character limit
      if (extractedText.length > maxChars) {
        // Calculate approximately how many lines we can include
        const avgLineLength = extractedText.length / requestedLineCount;
        const suggestedLines = Math.floor(maxChars / avgLineLength);

        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Requested text (${extractedText.length} characters) exceeds maximum of ${maxChars} characters. The lines in this range are lengthy. Suggestion: try reading ~${suggestedLines} lines at a time, e.g., lines ${effectiveStartLine} to ${effectiveStartLine + suggestedLines - 1}.`,
          exposeToLLM: true,
        });
      }

      const result: SourceGetTextResult = {
        sourceId: source.id,
        sourceName: source.name,
        totalLines,
        requestedStartLine: startLine,
        requestedEndLine: endLine,
        actualStartLine: effectiveStartLine,
        actualEndLine: effectiveEndLine,
        text: extractedText,
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
