import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SpreadsheetExportPort } from '../../application/ports/spreadsheet-export.port';
import type {
  SpreadsheetCell,
  SpreadsheetData,
} from '../../application/helpers/spreadsheet-content';
import { isFormulaCell } from '../../application/helpers/spreadsheet-content';

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

const toExcelValue = (cell: SpreadsheetCell): ExcelJS.CellValue =>
  isFormulaCell(cell)
    ? { formula: prefixModernFunctions(cell.slice(1)) }
    : cell;

function toCsvField(cell: SpreadsheetCell): string {
  if (cell === null) {
    return '';
  }
  const text = String(cell);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

@Injectable()
export class XlsxSpreadsheetExportService extends SpreadsheetExportPort {
  async exportToXlsx(data: SpreadsheetData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;

    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(data.columns);
    for (const row of data.rows) {
      sheet.addRow(row.map(toExcelValue));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToCsv(data: SpreadsheetData): Promise<string> {
    return Promise.resolve(
      [data.columns, ...data.rows]
        .map((row) => row.map(toCsvField).join(','))
        .join('\n'),
    );
  }
}
