import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';

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

export type TextPaginationTruncationReason = 'max_lines' | 'max_chars';

export interface TextPaginationResult {
  totalLines: number;
  actualStartLine: number;
  actualEndLine: number;
  extractedText: string;
  truncated: boolean;
  truncationReasons: TextPaginationTruncationReason[];
  nextStartLine: number | null;
}

interface PaginationLine {
  text: string;
  startsPhysicalLine: boolean;
}

interface SelectedPaginationLines {
  text: string;
  count: number;
  charLimited: boolean;
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

const splitPaginationLines = (
  text: string,
  maxChars: number,
): PaginationLine[] => {
  if (text === '') return [];
  return text.split('\n').flatMap((line) => {
    if (line.length === 0) return [{ text: '', startsPhysicalLine: true }];
    const segments: PaginationLine[] = [];
    for (let offset = 0; offset < line.length; offset += maxChars) {
      segments.push({
        text: line.slice(offset, offset + maxChars),
        startsPhysicalLine: offset === 0,
      });
    }
    return segments;
  });
};

const paginationRangeError = (params: {
  toolName: string;
  startLine: number;
  numLines: number;
  totalLines: number;
  maxLines: number;
}): ToolExecutionFailedError | null => {
  if (params.startLine > params.totalLines) {
    return new ToolExecutionFailedError({
      toolName: params.toolName,
      message: `Invalid pagination position: startLine (${params.startLine}) is greater than the content's total lines (${params.totalLines}).`,
      exposeToLLM: true,
    });
  }
  if (params.numLines > params.maxLines) {
    return new ToolExecutionFailedError({
      toolName: params.toolName,
      message: `Requested page (${params.numLines} lines) exceeds maximum of ${params.maxLines} lines.`,
      exposeToLLM: true,
    });
  }
  return null;
};

const selectPaginationLines = (params: {
  lines: PaginationLine[];
  startLine: number;
  numLines: number;
  maxChars: number;
}): SelectedPaginationLines => {
  const selected: string[] = [];
  let selectedChars = 0;
  let charLimited = false;
  for (
    let index = params.startLine - 1;
    index < params.lines.length && selected.length < params.numLines;
    index += 1
  ) {
    const line = params.lines[index];
    const separator =
      selected.length > 0 && line.startsPhysicalLine ? '\n' : '';
    const addedChars = separator.length + line.text.length;
    if (selectedChars + addedChars > params.maxChars) {
      charLimited = true;
      break;
    }
    selected.push(`${separator}${line.text}`);
    selectedChars += addedChars;
  }
  return { text: selected.join(''), count: selected.length, charLimited };
};

export function paginateText(params: {
  toolName: string;
  text: string;
  startLine: number;
  numLines: number;
  maxLines: number;
  maxChars: number;
}): TextPaginationResult {
  const maxChars = Math.max(1, params.maxChars);
  const lines = splitPaginationLines(params.text, maxChars);
  if (lines.length === 0) {
    return {
      totalLines: 0,
      actualStartLine: 0,
      actualEndLine: 0,
      extractedText: '',
      truncated: false,
      truncationReasons: [],
      nextStartLine: null,
    };
  }
  const rangeError = paginationRangeError({
    ...params,
    totalLines: lines.length,
  });
  if (rangeError) throw rangeError;

  const selected = selectPaginationLines({
    lines,
    startLine: params.startLine,
    numLines: params.numLines,
    maxChars,
  });
  const actualEndLine = params.startLine + selected.count - 1;
  const truncated = actualEndLine < lines.length;
  const truncationReasons: TextPaginationTruncationReason[] = [];
  if (truncated) {
    truncationReasons.push(selected.charLimited ? 'max_chars' : 'max_lines');
  }
  return {
    totalLines: lines.length,
    actualStartLine: params.startLine,
    actualEndLine,
    extractedText: selected.text,
    truncated,
    truncationReasons,
    nextStartLine: truncated ? actualEndLine + 1 : null,
  };
}

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
