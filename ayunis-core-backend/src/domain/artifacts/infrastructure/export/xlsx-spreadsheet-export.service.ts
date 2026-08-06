import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  SpreadsheetExportPort,
  type SpreadsheetExportInput,
} from '../../application/ports/spreadsheet-export.port';
import type { SpreadsheetCell } from '../../application/helpers/spreadsheet-content-format';
import { isFormulaCell } from '../../application/helpers/spreadsheet-content-format';

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

const toExcelValue = (
  cell: SpreadsheetCell,
  isOriginalFormula: boolean,
): ExcelJS.CellValue =>
  isOriginalFormula && isFormulaCell(cell)
    ? { formula: prefixModernFunctions(cell.slice(1)) }
    : cell;

function toCsvField(cell: SpreadsheetCell): string {
  if (cell === null) {
    return '';
  }
  const rawText = String(cell);
  const text =
    typeof cell === 'string' && /^[=+\-@\t\r]/.test(cell)
      ? `'${rawText}`
      : rawText;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

@Injectable()
export class XlsxSpreadsheetExportService extends SpreadsheetExportPort {
  async exportToXlsx(data: SpreadsheetExportInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;

    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(data.grid.columns);
    for (const [rowIndex, row] of data.grid.rows.entries()) {
      const formulaCells = data.formulaCells[rowIndex] ?? [];
      sheet.addRow(
        row.map((cell, columnIndex) =>
          toExcelValue(cell, formulaCells[columnIndex] ?? false),
        ),
      );
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToCsv(data: SpreadsheetExportInput): Promise<string> {
    return Promise.resolve(
      [data.grid.columns, ...data.grid.rows]
        .map((row) => row.map(toCsvField).join(','))
        .join('\n'),
    );
  }
}
