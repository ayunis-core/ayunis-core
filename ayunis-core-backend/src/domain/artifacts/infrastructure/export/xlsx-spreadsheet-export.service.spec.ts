import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { XlsxSpreadsheetExportService } from './xlsx-spreadsheet-export.service';

describe('XlsxSpreadsheetExportService', () => {
  let service: XlsxSpreadsheetExportService;

  beforeEach(() => {
    service = new XlsxSpreadsheetExportService();
  });

  describe('exportToXlsx', () => {
    it('should produce a readable workbook with headers and cells', async () => {
      const buffer = await service.exportToXlsx({
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
      const buffer = await service.exportToXlsx({
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
      const buffer = await service.exportToXlsx({
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
      await workbook.xlsx.load(buffer);
      return workbook.getWorksheet(1)?.getCell(address).formula;
    }

    it('should write formula cells as real Excel formulas', async () => {
      const buffer = await service.exportToXlsx({
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
      const buffer = await service.exportToXlsx({
        columns: ['A', 'B'],
        rows: [['x', '=XLOOKUP(A2, A2:A5, B2:B5)']],
      });

      expect(await readCellFormula(buffer, 'B2')).toBe(
        '_xlfn.XLOOKUP(A2, A2:A5, B2:B5)',
      );
    });

    it('should not rewrite function names inside string literals', async () => {
      const buffer = await service.exportToXlsx({
        columns: ['A'],
        rows: [['=CONCATENATE("use XLOOKUP(", "here")']],
      });

      expect(await readCellFormula(buffer, 'A2')).toBe(
        'CONCATENATE("use XLOOKUP(", "here")',
      );
    });

    it('should request a full recalculation on open', async () => {
      const buffer = await service.exportToXlsx({
        columns: ['A'],
        rows: [['=SUM(A2:A2)']],
      });

      // exceljs does not read calcPr back; SheetJS exposes it on Workbook
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      expect(workbook.Workbook?.CalcPr?.fullCalcOnLoad).toBe('1');
    });

    it('should keep an equals sign inside plain text as text', async () => {
      const buffer = await service.exportToXlsx({
        columns: ['Note'],
        rows: [['a = b']],
      });

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      expect(sheet.A2.f).toBeUndefined();
      expect(sheet.A2.v).toBe('a = b');
    });
  });

  describe('exportToCsv', () => {
    it('should render headers and rows as CSV', async () => {
      const csv = await service.exportToCsv({
        columns: ['Item', 'Amount'],
        rows: [['Rent', 1200]],
      });

      expect(csv.trim().split('\n')).toEqual(['Item,Amount', 'Rent,1200']);
    });

    it('should quote cells containing commas and double quotes', async () => {
      const csv = await service.exportToCsv({
        columns: ['Name'],
        rows: [['Mustermann, "Max"']],
      });

      const lines = csv.trim().split('\n');
      expect(lines[1]).toBe('"Mustermann, ""Max"""');
    });

    it('should render null cells as empty fields', async () => {
      const csv = await service.exportToCsv({
        columns: ['A', 'B', 'C'],
        rows: [['x', null, 'z']],
      });

      expect(csv.trim().split('\n')[1]).toBe('x,,z');
    });

    it('should render formula cells as their raw text', async () => {
      const csv = await service.exportToCsv({
        columns: ['Item', 'Amount'],
        rows: [['Total', '=SUM(B2:B4)']],
      });

      expect(csv.trim().split('\n')[1]).toBe('Total,=SUM(B2:B4)');
    });
  });
});
