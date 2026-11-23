import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import type { ArtifactInRun } from 'src/domain/artifacts/application/use-cases/read-artifact-in-run/read-artifact-in-run.use-case';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  paginateText,
  type TextPaginationResult,
} from 'src/domain/tools/application/utils/text-extraction.utils';
import { serializeTextResult } from 'src/domain/tools/application/utils/tool-text-budget.utils';
import { MAX_ANONYMOUS_TOOL_RESULT_LENGTH } from 'src/common/util/tool-result-limits';
import {
  parseSpreadsheetContent,
  type SpreadsheetCell,
} from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';

const READ_TOOL_BY_ARTIFACT_TYPE: Record<ArtifactType, ToolType> = {
  [ArtifactType.DOCUMENT]: ToolType.READ_DOCUMENT,
  [ArtifactType.DIAGRAM]: ToolType.READ_DIAGRAM,
  [ArtifactType.SPREADSHEET]: ToolType.READ_SPREADSHEET,
};

interface TextArtifactPage {
  artifactId: string;
  title: string;
  version: number;
  totalLines: number;
  requestedStartLine: number;
  requestedNumLines: number;
  actualStartLine: number;
  actualEndLine: number;
  truncated: boolean;
  truncationReasons: TextPaginationResult['truncationReasons'];
  content: string;
  nextPage: {
    artifact_id: string;
    startLine: number;
    numLines: number;
  } | null;
  paginationHint: string | null;
}

type SpreadsheetPageTruncationReason = 'max_rows' | 'max_chars';

interface SpreadsheetArtifactPage {
  artifactId: string;
  title: string;
  version: number;
  columns: string[];
  totalRows: number;
  requestedStartRow: number;
  requestedNumRows: number;
  actualStartRow: number;
  actualEndRow: number;
  truncated: boolean;
  truncationReasons: SpreadsheetPageTruncationReason[];
  rows: SpreadsheetCell[][];
  nextPage: {
    artifact_id: string;
    startRow: number;
    numRows: number;
  } | null;
  paginationHint: string | null;
}

interface SelectedRows {
  rows: SpreadsheetCell[][];
  charLimited: boolean;
}

export function assertArtifactType(
  artifact: Artifact,
  expectedType: ArtifactType,
  toolName: string,
): void {
  if (artifact.type === expectedType) return;
  throw new ToolExecutionFailedError({
    toolName,
    message: `Artifact ${artifact.id} is a ${artifact.type}, not a ${expectedType}. Use ${READ_TOOL_BY_ARTIFACT_TYPE[artifact.type]} to read it.`,
    exposeToLLM: true,
  });
}

/** One line-addressable page of a text artifact's current version. */
export function readTextArtifactPage(params: {
  toolName: string;
  read: ArtifactInRun;
  startLine: number;
  numLines: number;
  maxLines: number;
  maxChars: number;
}): string {
  const { toolName, read, startLine, numLines } = params;
  const { artifact } = read;
  const page = paginateText({
    toolName,
    text: read.content,
    startLine,
    numLines,
    maxLines: params.maxLines,
    maxChars: params.maxChars,
  });
  const result: TextArtifactPage = {
    artifactId: artifact.id,
    title: read.title,
    version: artifact.currentVersionNumber,
    totalLines: page.totalLines,
    requestedStartLine: startLine,
    requestedNumLines: numLines,
    actualStartLine: page.actualStartLine,
    actualEndLine: page.actualEndLine,
    truncated: page.truncated,
    truncationReasons: page.truncationReasons,
    content: page.extractedText,
    nextPage: page.nextStartLine
      ? { artifact_id: artifact.id, startLine: page.nextStartLine, numLines }
      : null,
    paginationHint: page.nextStartLine
      ? `Call ${toolName} again with startLine ${page.nextStartLine} to continue.`
      : null,
  };
  return serializeTextResult(result, toolName);
}

/**
 * One page of a spreadsheet's current version, with columns and rows in the
 * shape update_spreadsheet takes. The column headers count against the page's
 * character budget, and a page always holds at least one row.
 */
export function readSpreadsheetArtifactPage(params: {
  toolName: string;
  read: ArtifactInRun;
  startRow: number;
  numRows: number;
  maxRows: number;
  maxChars: number;
}): string {
  const { toolName, read, startRow, numRows } = params;
  const { artifact } = read;
  const { columns, rows } = parseSpreadsheetContent(read.content);
  assertRowRange({ ...params, totalRows: rows.length });

  const selected = selectRows({
    rows,
    startRow,
    numRows,
    maxChars: params.maxChars - JSON.stringify(columns).length,
  });
  const actualStartRow = rows.length === 0 ? 0 : startRow;
  const actualEndRow =
    rows.length === 0 ? 0 : startRow + selected.rows.length - 1;
  const nextStartRow = actualEndRow < rows.length ? actualEndRow + 1 : null;
  const result: SpreadsheetArtifactPage = {
    artifactId: artifact.id,
    title: read.title,
    version: artifact.currentVersionNumber,
    columns,
    totalRows: rows.length,
    requestedStartRow: startRow,
    requestedNumRows: numRows,
    actualStartRow,
    actualEndRow,
    truncated: nextStartRow !== null,
    truncationReasons: truncationReasons(nextStartRow, selected.charLimited),
    rows: selected.rows,
    nextPage: nextStartRow
      ? { artifact_id: artifact.id, startRow: nextStartRow, numRows }
      : null,
    paginationHint: nextStartRow
      ? `Call ${toolName} again with startRow ${nextStartRow} to continue. update_spreadsheet replaces the whole spreadsheet, so read every row before updating it.`
      : null,
  };
  assertSpreadsheetPageFits(toolName, result);
  return serializeTextResult(result, toolName);
}

/**
 * A page always holds at least one row, so a row or header set larger than
 * the result cap can never be read. Name it instead of the generic "request
 * fewer lines", which cannot help, and keep the model from overwriting
 * content it cannot see.
 */
function assertSpreadsheetPageFits(
  toolName: string,
  page: SpreadsheetArtifactPage,
): void {
  if (JSON.stringify(page).length < MAX_ANONYMOUS_TOOL_RESULT_LENGTH) return;
  const headersFit =
    JSON.stringify({ ...page, rows: [] }).length <
    MAX_ANONYMOUS_TOOL_RESULT_LENGTH;
  const tooLarge = headersFit
    ? `Data row ${page.actualStartRow} is too large to return. Rows before and after it can still be read with startRow.`
    : 'The column headers are too large to return.';
  throw new ToolExecutionFailedError({
    toolName,
    message: `${tooLarge} Do not replace this spreadsheet with update_spreadsheet: the update would overwrite content you cannot see. Tell the user it is too large for you to read.`,
    exposeToLLM: true,
  });
}

function assertRowRange(params: {
  toolName: string;
  startRow: number;
  numRows: number;
  maxRows: number;
  totalRows: number;
}): void {
  let message: string | null = null;
  if (params.totalRows > 0 && params.startRow > params.totalRows) {
    message = `Invalid pagination position: startRow (${params.startRow}) is greater than the spreadsheet's total rows (${params.totalRows}).`;
  } else if (params.numRows > params.maxRows) {
    message = `Requested page (${params.numRows} rows) exceeds maximum of ${params.maxRows} rows.`;
  }
  if (message) {
    throw new ToolExecutionFailedError({
      toolName: params.toolName,
      message,
      exposeToLLM: true,
    });
  }
}

function selectRows(params: {
  rows: SpreadsheetCell[][];
  startRow: number;
  numRows: number;
  maxChars: number;
}): SelectedRows {
  const selected: SpreadsheetCell[][] = [];
  let selectedChars = 0;
  for (
    let index = params.startRow - 1;
    index < params.rows.length && selected.length < params.numRows;
    index += 1
  ) {
    const row = params.rows[index];
    const addedChars = JSON.stringify(row).length + 1;
    if (selected.length > 0 && selectedChars + addedChars > params.maxChars) {
      return { rows: selected, charLimited: true };
    }
    selected.push(row);
    selectedChars += addedChars;
  }
  return { rows: selected, charLimited: false };
}

function truncationReasons(
  nextStartRow: number | null,
  charLimited: boolean,
): SpreadsheetPageTruncationReason[] {
  if (nextStartRow === null) return [];
  return [charLimited ? 'max_chars' : 'max_rows'];
}
