import { ToolExecutionFailedError } from '../tools.errors';

interface TextExtractionParams {
  toolName: string;
  text: string;
  startLine: number;
  endLine: number;
  maxLines: number;
  maxChars: number;
}

interface TextExtractionResult {
  totalLines: number;
  effectiveStartLine: number;
  effectiveEndLine: number;
  extractedText: string;
  isEmpty: boolean;
}

const EMPTY_RESULT: Readonly<TextExtractionResult> = Object.freeze({
  totalLines: 0,
  effectiveStartLine: 0,
  effectiveEndLine: 0,
  extractedText: '',
  isEmpty: true,
});

function clampLineRange(
  startLine: number,
  endLine: number,
  totalLines: number,
): { effectiveStart: number; effectiveEnd: number } {
  const effectiveStart = Math.max(1, Math.min(startLine, totalLines));
  const effectiveEnd =
    endLine === -1
      ? totalLines
      : Math.max(effectiveStart, Math.min(endLine, totalLines));
  return { effectiveStart, effectiveEnd };
}

interface ValidateLineRangeOptions {
  toolName: string;
  startLine: number;
  effectiveEnd: number;
  totalLines: number;
  maxLines: number;
}

function validateLineRange(options: ValidateLineRangeOptions): void {
  const { toolName, startLine, effectiveEnd, totalLines, maxLines } = options;

  if (startLine > effectiveEnd && startLine !== 1) {
    throw new ToolExecutionFailedError({
      toolName,
      message: `Invalid line range: startLine (${startLine}) is greater than the file's total lines (${totalLines}).`,
      exposeToLLM: true,
    });
  }

  const clampedStart = Math.max(1, Math.min(startLine, totalLines));
  const requestedLineCount = effectiveEnd - clampedStart + 1;
  if (requestedLineCount > maxLines) {
    const suggestedEnd = clampedStart + maxLines - 1;
    throw new ToolExecutionFailedError({
      toolName,
      message: `Requested range (${requestedLineCount} lines) exceeds maximum of ${maxLines} lines. Try lines ${clampedStart} to ${suggestedEnd}.`,
      exposeToLLM: true,
    });
  }
}

function validateCharLimit(
  toolName: string,
  text: string,
  lineCount: number,
  maxChars: number,
): void {
  if (text.length > maxChars) {
    const suggestedLines = Math.floor(maxChars / (text.length / lineCount));
    throw new ToolExecutionFailedError({
      toolName,
      message: `Requested text (${text.length} characters) exceeds maximum of ${maxChars} characters. Try ~${suggestedLines} lines at a time.`,
      exposeToLLM: true,
    });
  }
}

export function extractTextByLineRange(
  params: TextExtractionParams,
): TextExtractionResult {
  const { toolName, text, startLine, endLine, maxLines, maxChars } = params;
  const lines = text.split('\n');
  const totalLines = lines.length;

  if (totalLines === 0 || (totalLines === 1 && lines[0] === '')) {
    return EMPTY_RESULT;
  }

  const { effectiveStart, effectiveEnd } = clampLineRange(
    startLine,
    endLine,
    totalLines,
  );
  const lineCount = effectiveEnd - effectiveStart + 1;

  validateLineRange({
    toolName,
    startLine,
    effectiveEnd,
    totalLines,
    maxLines,
  });

  const extractedText = lines
    .slice(effectiveStart - 1, effectiveEnd)
    .join('\n');
  validateCharLimit(toolName, extractedText, lineCount, maxChars);

  return {
    totalLines,
    effectiveStartLine: effectiveStart,
    effectiveEndLine: effectiveEnd,
    extractedText,
    isEmpty: false,
  };
}
