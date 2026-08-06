import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import type { SpreadsheetExportInput } from '../../application/ports/spreadsheet-export.port';
import {
  isFormulaCell,
  type SpreadsheetGrid,
} from '../../application/helpers/spreadsheet-content-format';
import { XlsxSpreadsheetExportService } from './xlsx-spreadsheet-export.service';

describe('XlsxSpreadsheetExportService', () => {
  let service: XlsxSpreadsheetExportService;

  beforeEach(() => {
    service = new XlsxSpreadsheetExportService();
  });

  function createExportInput(
    grid: SpreadsheetGrid,
    formulaCells = grid.rows.map((row) => row.map(isFormulaCell)),
  ): SpreadsheetExportInput {
    return { grid, formulaCells };
  }

  function exportXlsx(
    grid: SpreadsheetGrid,
    formulaCells?: boolean[][],
  ): Promise<Buffer> {
    return service.exportToXlsx(createExportInput(grid, formulaCells));
  }

  function exportCsv(
    grid: SpreadsheetGrid,
    formulaCells?: boolean[][],
  ): Promise<string> {
    return service.exportToCsv(createExportInput(grid, formulaCells));
  }

  describe('exportToXlsx', () => {
    it('should produce a readable workbook with headers and cells', async () => {
      const buffer = await exportXlsx({
        columns: ['Item', 'Amount'],
        rows: [
          ['Rent', 1200],
          ['Food', 450.5],
        ],
      });

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      expect(parsed).toEqual([
        { Item: 'Rent', Amount: 1200 },
        { Item: 'Food', Amount: 450.5 },
      ]);
    });

    it('should write numbers as numeric cells and strings as text cells', async () => {
      const buffer = await exportXlsx({
        columns: ['Label', 'Value'],
        rows: [['Total', 42]],
      });

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      expect(sheet.A2.t).toBe('s');
      expect(sheet.A2.v).toBe('Total');
      expect(sheet.B2.t).toBe('n');
      expect(sheet.B2.v).toBe(42);
    });

    it('should leave null cells empty', async () => {
      const buffer = await exportXlsx({
        columns: ['A', 'B'],
        rows: [['x', null]],
      });

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      expect(sheet.B2).toBeUndefined();
    });
  });

  describe('formula cells', () => {
    async function readCellFormula(
      buffer: Buffer,
      address: string,
    ): Promise<string | undefined> {
      const workbook = new ExcelJS.Workbook();
      // exceljs types its Buffer parameter as an ArrayBuffer subtype, which
      // Node's generic Buffer no longer satisfies; runtime accepts both.
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      return workbook.getWorksheet(1)?.getCell(address).formula;
    }

    it('should write formula cells as real Excel formulas', async () => {
      const buffer = await exportXlsx({
        columns: ['Item', 'Amount'],
        rows: [
          ['Rent', 1200],
          ['Food', 450.5],
          ['Total', '=SUM(B2:B3)'],
        ],
      });

      expect(await readCellFormula(buffer, 'B4')).toBe('SUM(B2:B3)');
    });

    it('should prefix post-2007 function names with _xlfn', async () => {
      const buffer = await exportXlsx({
        columns: ['A', 'B'],
        rows: [['x', '=XLOOKUP(A2, A2:A5, B2:B5)']],
      });

      expect(await readCellFormula(buffer, 'B2')).toBe(
        '_xlfn.XLOOKUP(A2, A2:A5, B2:B5)',
      );
    });

    it.each([
      [
        'FILTER',
        '=FILTER(A2:A10,B2:B10>0)',
        '_xlfn._xlws.FILTER(A2:A10,B2:B10>0)',
      ],
      ['SORT', '=SORT(A2:A10)', '_xlfn._xlws.SORT(A2:A10)'],
    ])(
      'should use the _xlws prefix for %s dynamic array formulas',
      async (_functionName, formula, expectedFormula) => {
        const buffer = await exportXlsx({
          columns: ['A'],
          rows: [[formula]],
        });

        expect(await readCellFormula(buffer, 'A2')).toBe(expectedFormula);
      },
    );

    it('should not rewrite function names inside string literals', async () => {
      const buffer = await exportXlsx({
        columns: ['A'],
        rows: [['=CONCATENATE("use XLOOKUP(", "here")']],
      });

      expect(await readCellFormula(buffer, 'A2')).toBe(
        'CONCATENATE("use XLOOKUP(", "here")',
      );
    });

    it('should request a full recalculation on open', async () => {
      const buffer = await exportXlsx({
        columns: ['A'],
        rows: [['=SUM(A2:A2)']],
      });

      // exceljs does not read calcPr back; SheetJS exposes it on Workbook,
      // but its typings omit CalcPr, hence the structural cast.
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const wbProps = workbook.Workbook as
        { CalcPr?: { fullCalcOnLoad?: string } } | undefined;
      expect(wbProps?.CalcPr?.fullCalcOnLoad).toBe('1');
    });

    it('should keep an equals sign inside plain text as text', async () => {
      const buffer = await exportXlsx({
        columns: ['Note'],
        rows: [['a = b']],
      });

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      expect(sheet.A2.f).toBeUndefined();
      expect(sheet.A2.v).toBe('a = b');
    });

    it('should keep de-anonymized plain text that starts with equals as text', async () => {
      const buffer = await exportXlsx(
        {
          columns: ['Note'],
          rows: [['=SUM(9,9)']],
        },
        [[false]],
      );

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      expect(await readCellFormula(buffer, 'A2')).toBeUndefined();
      expect(sheet.A2.v).toBe('=SUM(9,9)');
    });
  });

  describe('exportToCsv', () => {
    it('should render headers and rows as CSV', async () => {
      const csv = await exportCsv({
        columns: ['Item', 'Amount'],
        rows: [['Rent', 1200]],
      });

      expect(csv.trim().split('\n')).toEqual(['Item,Amount', 'Rent,1200']);
    });

    it('should quote cells containing commas and double quotes', async () => {
      const csv = await exportCsv({
        columns: ['Name'],
        rows: [['Mustermann, "Max"']],
      });

      const lines = csv.trim().split('\n');
      expect(lines[1]).toBe('"Mustermann, ""Max"""');
    });

    it('should render null cells as empty fields', async () => {
      const csv = await exportCsv({
        columns: ['A', 'B', 'C'],
        rows: [['x', null, 'z']],
      });

      expect(csv.trim().split('\n')[1]).toBe('x,,z');
    });

    it('should preserve typed negative numbers as numeric CSV fields', async () => {
      const csv = await exportCsv({
        columns: ['Expense', 'Balance'],
        rows: [[-1200, -450.5]],
      });

      expect(csv.trim().split('\n')[1]).toBe('-1200,-450.5');
    });

    it('should neutralize formula-like cells in CSV output', async () => {
      const csv = await exportCsv({
        columns: ['Value'],
        rows: [['=1+1']],
      });

      expect(csv.trim().split('\n')[1]).toBe("'=1+1");
    });
  });
});
