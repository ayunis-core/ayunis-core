import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { textPrefixWithinBudget } from './tool-text-budget.utils';

type TruncationReason = 'max_chars' | 'max_lines' | 'document_end';

interface SourcePosition {
  startLine: number;
  startCharacter: number;
}

interface SourcePageInput extends SourcePosition {
  toolName: string;
  dbResult: { text: string; totalLines: number };
  endLine: number;
  maxLines: number;
  maxChars: number;
}

export function paginateSourceText(params: SourcePageInput) {
  const { dbResult, startLine, startCharacter } = params;
  if (isEmptySource(dbResult)) return emptyPage(dbResult.totalLines || 0);
  validatePosition(params);
  const lines = dbResult.text.split('\n').slice(0, params.maxLines);
  const lastLine = startLine + lines.length - 1;
  const rangeEnd =
    params.endLine === -1
      ? dbResult.totalLines
      : Math.min(params.endLine, dbResult.totalLines);
  const suffix = lastLine < rangeEnd ? '\n' : '';
  const available = lines.join('\n').slice(startCharacter) + suffix;
  const text = textPrefixWithinBudget(
    available,
    Math.max(6, Math.min(params.maxChars, 20_000)),
  );
  const nextPosition = positionAfter(text, params);
  const finished = text.length === available.length && lastLine >= rangeEnd;
  const reasons = truncationReasons(
    params,
    finished,
    text.length < available.length,
  );
  return {
    totalLines: dbResult.totalLines,
    actualStartLine: startLine,
    actualEndLine: Math.max(
      startLine,
      nextPosition.startLine - (text.endsWith('\n') ? 1 : 0),
    ),
    text,
    truncated: reasons.length > 0,
    truncationReasons: reasons,
    nextPosition: finished ? null : nextPosition,
  };
}

function isEmptySource(result: SourcePageInput['dbResult']): boolean {
  return (
    result.totalLines === 0 ||
    (result.text === '' &&
      (result.totalLines === 1 || !Number.isFinite(result.totalLines)))
  );
}

function truncationReasons(
  params: SourcePageInput,
  finished: boolean,
  charLimited: boolean,
): TruncationReason[] {
  const reasons: TruncationReason[] = [];
  if (!finished) reasons.push(charLimited ? 'max_chars' : 'max_lines');
  if (params.endLine > params.dbResult.totalLines) reasons.push('document_end');
  return reasons;
}

function positionAfter(text: string, position: SourcePosition): SourcePosition {
  const parts = text.split('\n');
  return {
    startLine: position.startLine + parts.length - 1,
    startCharacter:
      parts.length === 1
        ? position.startCharacter + text.length
        : parts[parts.length - 1].length,
  };
}

function validatePosition(params: SourcePageInput): void {
  const firstLine = params.dbResult.text.split('\n', 1)[0];
  if (
    params.startLine > Math.max(params.dbResult.totalLines, 1) ||
    params.startCharacter > firstLine.length ||
    (params.endLine !== -1 && params.endLine < params.startLine)
  ) {
    throw new ToolExecutionFailedError({
      toolName: params.toolName,
      message: 'Invalid line range or character position for this document.',
      exposeToLLM: true,
    });
  }
}

function emptyPage(totalLines: number) {
  return {
    totalLines,
    actualStartLine: 0,
    actualEndLine: 0,
    text: '',
    truncated: false,
    truncationReasons: [] as TruncationReason[],
    nextPosition: null as SourcePosition | null,
  };
}
