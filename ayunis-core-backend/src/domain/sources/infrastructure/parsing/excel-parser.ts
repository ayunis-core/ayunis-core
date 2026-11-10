import * as XLSX from 'xlsx';
import type { ParsedSheet } from 'src/domain/sources/application/ports/spreadsheet-parser.port';

type SheetRow = unknown[];

/**
 * Reads at most one row per sheet, so callers can learn which sheets contain
 * data without paying for a full parse. Sheets without a single used cell get
 * no `!ref` and are omitted — mirroring parseExcelBuffer, which drops them.
 * A sheet whose used range holds only blank cells still slips through here;
 * the processing consumer marks its pre-created source FAILED as a fallback.
 */
export function listDataSheetNames(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: 1 });
  return workbook.SheetNames.filter((sheetName) =>
    Boolean(workbook.Sheets[sheetName]['!ref']),
  );
}

// Bounds the rows×columns a parse may materialize across all sheets, so an
// upload with real data spread far apart fails fast instead of exhausting
// memory. Normal workbooks stay orders of magnitude below it.
export const MAX_WORKBOOK_CELLS = 5_000_000;

const CELL_LIMIT_MESSAGE = 'Workbook data spans more cells than the limit';

// Thrown inside the worker thread, where class identity does not survive the
// structured clone back to the pool — callers recognize it by message.
export class WorkbookCellLimitError extends Error {
  constructor(cellCount: number) {
    super(`${CELL_LIMIT_MESSAGE}: ${cellCount} > ${MAX_WORKBOOK_CELLS}`);
    this.name = 'WorkbookCellLimitError';
  }
}

export function isWorkbookCellLimitError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(CELL_LIMIT_MESSAGE);
}

interface DataSheet {
  sheetName: string;
  worksheet: XLSX.WorkSheet;
  range: XLSX.Range;
}

/**
 * Pure, synchronous parse of an Excel workbook into per-sheet CSV data.
 * XLSX parsing is CPU-bound — request-path code must go through
 * SpreadsheetParserPort, which runs this in a worker thread.
 *
 * Rows are read from each sheet's populated cells, never its declared used
 * range: Excel keeps that range at e.g. row 1,048,576 once formatting reached
 * there, and filling it with empty strings exhausted backend memory.
 */
export function parseExcelBuffer(buffer: Buffer): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const dataSheets = workbook.SheetNames.flatMap((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const range = populatedRange(worksheet);
    return range ? [{ sheetName, worksheet, range }] : [];
  });

  assertWithinCellLimit(dataSheets);

  return dataSheets.flatMap((sheet) => {
    const parsed = parseSheet(sheet);
    return parsed ? [parsed] : [];
  });
}

function populatedRange(worksheet: XLSX.WorkSheet): XLSX.Range | null {
  let range: XLSX.Range | null = null;
  for (const address of Object.keys(worksheet)) {
    if (address.startsWith('!')) continue;
    if (!hasContent(worksheet[address] as XLSX.CellObject)) continue;
    const { r, c } = XLSX.utils.decode_cell(address);
    range = range
      ? {
          s: { r: Math.min(range.s.r, r), c: Math.min(range.s.c, c) },
          e: { r: Math.max(range.e.r, r), c: Math.max(range.e.c, c) },
        }
      : { s: { r, c }, e: { r, c } };
  }
  return range;
}

function hasContent(cell: XLSX.CellObject): boolean {
  return XLSX.utils.format_cell(cell) !== '';
}

function assertWithinCellLimit(sheets: DataSheet[]): void {
  const cellCount = sheets.reduce(
    (total, { range }) =>
      total + (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1),
    0,
  );
  if (cellCount > MAX_WORKBOOK_CELLS) {
    throw new WorkbookCellLimitError(cellCount);
  }
}

function parseSheet({
  sheetName,
  worksheet,
  range,
}: DataSheet): ParsedSheet | null {
  // Despite raw:false, cells are not guaranteed to be strings — treat
  // them as unknown and stringify.
  const rawRows: SheetRow[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    range,
    blankrows: false,
  });

  const nonEmptyRows = rawRows
    .map(normalizeRow)
    .filter((row) => !isEmptyRow(row));
  if (nonEmptyRows.length === 0) {
    return null;
  }

  const [headers, ...rows] = nonEmptyRows;

  // Header-only sheets are kept intentionally: an empty table with named
  // columns is still a valid data source.
  return { sheetName, headers, rows };
}

function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => cell === '');
}

function normalizeRow(row: SheetRow): string[] {
  return row.map(normalizeCell);
}

function normalizeCell(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (typeof cell === 'string') {
    return cell;
  }
  if (typeof cell === 'number' || typeof cell === 'boolean') {
    return String(cell);
  }
  return JSON.stringify(cell);
}
