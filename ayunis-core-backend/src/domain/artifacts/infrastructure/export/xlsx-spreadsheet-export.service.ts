import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  SpreadsheetExportPort,
  type SpreadsheetExportInput,
} from '../../application/ports/spreadsheet-export.port';
import type { SpreadsheetCell } from '../../application/helpers/spreadsheet-content-format';
import { isFormulaCell } from '../../application/helpers/spreadsheet-content-format';
import type {
  EvaluatedCell,
  SpreadsheetEvaluation,
} from '../../application/helpers/evaluate-spreadsheet';
import {
  isSpreadsheetErrorValue,
  SpreadsheetEvaluator,
} from '../../application/helpers/evaluate-spreadsheet';

/**
 * Functions introduced after Excel 2007 are stored in the file format with an
 * internal `_xlfn.` prefix. Excel adds it itself; third-party writers must
 * too, or the cell shows #NAME? on open.
 *
 * LET and LAMBDA are deliberately absent: OOXML additionally requires
 * `_xlpm.` on their local parameter names, which needs real formula parsing,
 * and the live grid's engine cannot evaluate them anyway.
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
const FUNCTIONS_REQUIRING_XLWS_PREFIX = new Set(['FILTER', 'SORT']);

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
        : segment.replace(MODERN_FUNCTION_RE, (match, name: string) => {
            const normalizedName = name.toUpperCase();
            const prefix = FUNCTIONS_REQUIRING_XLWS_PREFIX.has(normalizedName)
              ? '_xlfn._xlws.'
              : '_xlfn.';

            return `${prefix}${normalizedName}${match.slice(name.length)}`;
          }),
    )
    .join('');
}

const buildFormulaValue = (
  cell: string,
  computed: EvaluatedCell,
): ExcelJS.CellFormulaValue => {
  const formula = prefixModernFunctions(cell.slice(1));
  // No cached result for error values ('#…'); Excel recalculates live formulas
  // on open instead.
  const hasCachedResult =
    computed !== null &&
    !(
      isSpreadsheetErrorValue(computed) ||
      (typeof computed === 'string' && computed[0] === '=')
    );
  return hasCachedResult
    ? { formula, result: computed }
    : { formula, result: undefined };
};

const toExcelValue = (
  cell: SpreadsheetCell,
  computed: EvaluatedCell,
  isLiveFormula: boolean,
  isOriginalFormula: boolean,
): ExcelJS.CellValue =>
  isOriginalFormula && isFormulaCell(cell) && isLiveFormula
    ? buildFormulaValue(cell, computed)
    : cell;

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
  const rawText = csvText(cell);
  const text =
    typeof cell === 'string' && /^[=+\-@\t\r]/.test(cell)
      ? `'${rawText}`
      : rawText;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

@Injectable()
export class XlsxSpreadsheetExportService extends SpreadsheetExportPort {
  private readonly logger = new Logger(XlsxSpreadsheetExportService.name);

  async exportToXlsx(data: SpreadsheetExportInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    const evaluated = this.evaluateSafe(data);

    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(data.grid.columns);
    data.grid.rows.forEach((row, rowIndex) => {
      sheet.addRow(
        row.map((cell, colIndex) =>
          toExcelValue(
            cell,
            evaluated.values[rowIndex]?.[colIndex] ?? null,
            evaluated.liveFormulaCells[rowIndex]?.[colIndex] ?? false,
            data.formulaCells[rowIndex]?.[colIndex] ?? false,
          ),
        ),
      );
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToCsv(data: SpreadsheetExportInput): Promise<string> {
    const evaluated = this.evaluateSafe(data);
    return Promise.resolve(
      [data.grid.columns, ...evaluated.values]
        .map((row) => row.map(toCsvField).join(','))
        .join('\n'),
    );
  }

  /**
   * Formula evaluation must never break an export: on unexpected engine
   * failure, fall back to raw cell values. Formula-like strings are written as
   * text by XLSX and neutralized by the CSV serializer.
   */
  private evaluateSafe(data: SpreadsheetExportInput): SpreadsheetEvaluation {
    try {
      return new SpreadsheetEvaluator(
        data.grid,
        data.formulaCells,
      ).evaluateForExport();
    } catch (error) {
      this.logger.warn('Spreadsheet evaluation failed, exporting raw values', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        values: data.grid.rows,
        liveFormulaCells: data.grid.rows.map((row) => row.map(() => false)),
      };
    }
  }
}
