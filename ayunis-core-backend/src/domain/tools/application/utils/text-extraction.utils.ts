import { ToolExecutionFailedError } from '../tools.errors';

interface TextExtractionParams {
  toolName: string;
  text: string;
  startLine: number;
  endLine: number;
  maxLines: number;
  maxChars: number;
}

export type TextExtractionTruncationReason = 'document_end' | 'max_chars';

export interface TextExtractionResult {
  totalLines: number;
  effectiveStartLine: number;
  effectiveEndLine: number;
  extractedText: string;
  isEmpty: boolean;
  truncated: boolean;
  truncationReasons: TextExtractionTruncationReason[];
}

const EMPTY_RESULT: Readonly<TextExtractionResult> = Object.freeze({
  totalLines: 0,
  effectiveStartLine: 0,
  effectiveEndLine: 0,
  extractedText: '',
  isEmpty: true,
  truncated: false,
  truncationReasons: [],
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

interface BuildExtractionResultParams {
  toolName: string;
  totalLines: number;
  startLine: number;
  effectiveStartLine: number;
  effectiveEndLine: number;
  requestedEndLine: number;
  extractedText: string;
  maxLines: number;
  maxChars: number;
}

interface TruncateToCharLimitResult {
  text: string;
  actualEndLine: number;
  charLimited: boolean;
}

const buildRangeValidationError = (params: {
  toolName: string;
  totalLines: number;
  startLine: number;
  effectiveEndLine: number;
  maxLines: number;
}): ToolExecutionFailedError | null => {
  const { toolName, totalLines, startLine, effectiveEndLine, maxLines } =
    params;
  const clampedStart = Math.max(1, Math.min(startLine, totalLines));
  const requestedLineCount = effectiveEndLine - clampedStart + 1;

  if (startLine > effectiveEndLine && startLine !== 1) {
    return new ToolExecutionFailedError({
      toolName,
      message: `Invalid line range: startLine (${startLine}) is greater than the file's total lines (${totalLines}).`,
      exposeToLLM: true,
    });
  }

  if (requestedLineCount > maxLines) {
    return new ToolExecutionFailedError({
      toolName,
      message: `Requested range (${requestedLineCount} lines) exceeds maximum of ${maxLines} lines. Try lines ${clampedStart} to ${clampedStart + maxLines - 1}.`,
      exposeToLLM: true,
    });
  }

  return null;
};

const truncateToCharLimit = (params: {
  extractedText: string;
  maxChars: number;
  effectiveStartLine: number;
  effectiveEndLine: number;
}): TruncateToCharLimitResult => {
  const { extractedText, maxChars, effectiveStartLine, effectiveEndLine } =
    params;
  if (extractedText.length <= maxChars) {
    return {
      text: extractedText,
      actualEndLine: effectiveEndLine,
      charLimited: false,
    };
  }

  let text = '';
  let isFirst = true;
  let actualEndLine = effectiveStartLine;
  for (const line of extractedText.split('\n')) {
    const candidate = isFirst ? line : `${text}\n${line}`;
    if (candidate.length > maxChars) {
      return {
        text: isFirst ? line.slice(0, maxChars) : text,
        actualEndLine,
        charLimited: true,
      };
    }
    text = candidate;
    if (!isFirst) {
      actualEndLine += 1;
    }
    isFirst = false;
  }

  return { text, actualEndLine, charLimited: true };
};

const buildTruncationReasons = (params: {
  requestedEndLine: number;
  totalLines: number;
  charLimited: boolean;
}): TextExtractionTruncationReason[] => {
  const reasons: TextExtractionTruncationReason[] = [];

  if (
    params.requestedEndLine !== -1 &&
    params.requestedEndLine > params.totalLines
  ) {
    reasons.push('document_end');
  }
  if (params.charLimited) {
    reasons.push('max_chars');
  }

  return reasons;
};

function buildExtractionResult(
  params: BuildExtractionResultParams,
): TextExtractionResult {
  const rangeError = buildRangeValidationError(params);
  if (rangeError) {
    throw rangeError;
  }

  const charLimitResult = truncateToCharLimit({
    extractedText: params.extractedText,
    maxChars: params.maxChars,
    effectiveStartLine: params.effectiveStartLine,
    effectiveEndLine: params.effectiveEndLine,
  });
  const truncationReasons = buildTruncationReasons({
    requestedEndLine: params.requestedEndLine,
    totalLines: params.totalLines,
    charLimited: charLimitResult.charLimited,
  });

  return {
    totalLines: params.totalLines,
    effectiveStartLine: params.effectiveStartLine,
    effectiveEndLine: charLimitResult.actualEndLine,
    extractedText: charLimitResult.text,
    isEmpty: false,
    truncated: truncationReasons.length > 0,
    truncationReasons,
  };
}

/**
 * Extract text by line range from a full text string.
 * Used when the full text is available in memory.
 */
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

  return buildExtractionResult({
    toolName,
    totalLines,
    startLine,
    effectiveStartLine: effectiveStart,
    effectiveEndLine: effectiveEnd,
    requestedEndLine: endLine,
    extractedText: lines.slice(effectiveStart - 1, effectiveEnd).join('\n'),
    maxLines,
    maxChars,
  });
}

/**
 * Validate text extracted by the DB (pre-sliced).
 * Used after `sourceRepository.extractTextLines()` returns { totalLines, text }.
 */
export function validateTextExtraction(params: {
  toolName: string;
  dbResult: { totalLines: number; text: string };
  startLine: number;
  endLine: number;
  maxLines: number;
  maxChars: number;
}): TextExtractionResult {
  const { toolName, dbResult, startLine, endLine, maxLines, maxChars } = params;
  const { totalLines, text } = dbResult;

  if (totalLines === 0 || (text === '' && totalLines <= 1)) {
    return { ...EMPTY_RESULT, totalLines };
  }

  const { effectiveStart, effectiveEnd } = clampLineRange(
    startLine,
    endLine,
    totalLines,
  );

  return buildExtractionResult({
    toolName,
    totalLines,
    startLine,
    effectiveStartLine: effectiveStart,
    effectiveEndLine: effectiveEnd,
    requestedEndLine: endLine,
    extractedText: text,
    maxLines,
    maxChars,
  });
}
