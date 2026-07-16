import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SpreadsheetExportPort } from '../../application/ports/spreadsheet-export.port';
import type {
  SpreadsheetCell,
  SpreadsheetData,
} from '../../application/helpers/spreadsheet-content';
import { isFormulaCell } from '../../application/helpers/spreadsheet-content';
import type { EvaluatedCell } from '../../application/helpers/evaluate-spreadsheet';
import { SpreadsheetEvaluator } from '../../application/helpers/evaluate-spreadsheet';

/**
 * Functions introduced after Excel 2007 are stored in the file format with an
 * internal `_xlfn.` prefix. Excel adds it itself; third-party writers must
 * too, or the cell shows #NAME? on open.
 */
const MODERN_FUNCTIONS = [
  'XLOOKUP',
  'XMATCH',
  'FILTER',
  'SORT',
  'SORTBY',
  'UNIQUE',
  'SEQUENCE',
  'RANDARRAY',
  'LET',
  'LAMBDA',
  'IFS',
  'SWITCH',
  'MAXIFS',
  'MINIFS',
  'CONCAT',
  'TEXTJOIN',
  'TEXTSPLIT',
  'TEXTBEFORE',
  'TEXTAFTER',
  'IFNA',
  'FORMULATEXT',
];

const MODERN_FUNCTION_RE = new RegExp(
  `\\b(${MODERN_FUNCTIONS.join('|')})\\s*\\(`,
  'gi',
);

// Split on Excel string literals ("..." with "" escapes) so function names
// inside quoted text are never rewritten.
const STRING_LITERAL_SPLIT_RE = /("(?:[^"]|"")*")/;

function prefixModernFunctions(formula: string): string {
  return formula
    .split(STRING_LITERAL_SPLIT_RE)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : segment.replace(
            MODERN_FUNCTION_RE,
            (match, name: string) =>
              `_xlfn.${name.toUpperCase()}${match.slice(name.length)}`,
          ),
    )
    .join('');
}

const buildFormulaValue = (
  cell: string,
  computed: EvaluatedCell,
): ExcelJS.CellFormulaValue => {
  const formula = prefixModernFunctions(cell.slice(1));
  const hasCachedResult =
    computed !== null &&
    !(typeof computed === 'string' && computed.startsWith('#'));
  return hasCachedResult
    ? { formula, result: computed }
    : { formula, result: undefined };
};

const toExcelValue = (
  cell: SpreadsheetCell,
  computed: EvaluatedCell,
): ExcelJS.CellValue =>
  isFormulaCell(cell) ? buildFormulaValue(cell, computed) : cell;

function csvText(cell: NonNullable<EvaluatedCell>): string {
  if (typeof cell === 'boolean') {
    return cell ? 'TRUE' : 'FALSE';
  }
  return String(cell);
}

function toCsvField(cell: EvaluatedCell): string {
  if (cell === null) {
    return '';
  }
  const text = csvText(cell);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

@Injectable()
export class XlsxSpreadsheetExportService extends SpreadsheetExportPort {
  private readonly logger = new Logger(XlsxSpreadsheetExportService.name);

  async exportToXlsx(data: SpreadsheetData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    const evaluated = this.evaluateSafe(data);

    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(data.columns);
    data.rows.forEach((row, rowIndex) => {
      sheet.addRow(
        row.map((cell, colIndex) =>
          toExcelValue(cell, evaluated[rowIndex]?.[colIndex] ?? null),
        ),
      );
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToCsv(data: SpreadsheetData): Promise<string> {
    const evaluated = this.evaluateSafe(data);
    return Promise.resolve(
      [data.columns, ...evaluated]
        .map((row) => row.map(toCsvField).join(','))
        .join('\n'),
    );
  }

  /**
   * Formula evaluation must never break an export: on unexpected engine
   * failure, fall back to the raw cell values (xlsx cells then recalculate
   * on open via fullCalcOnLoad; csv shows the formula text).
   */
  private evaluateSafe(data: SpreadsheetData): EvaluatedCell[][] {
    try {
      return new SpreadsheetEvaluator(data).evaluate();
    } catch (error) {
      this.logger.warn('Spreadsheet evaluation failed, exporting raw values', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return data.rows;
    }
  }
}
