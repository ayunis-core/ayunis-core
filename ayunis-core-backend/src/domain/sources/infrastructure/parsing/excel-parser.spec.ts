import * as XLSX from 'xlsx';
import { parseExcelBuffer } from './excel-parser';

function workbookBuffer(sheets: Record<string, unknown[][]>): Buffer {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parseExcelBuffer', () => {
  it('parses every sheet into headers and string rows', () => {
    const buffer = workbookBuffer({
      First: [
        ['Name', 'Age'],
        ['Alice', 30],
        ['Bob', 41],
      ],
      Second: [
        ['City', 'Zip'],
        ['Berlin', '10115'],
      ],
    });

    const sheets = parseExcelBuffer(buffer);

    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toEqual({
      sheetName: 'First',
      headers: ['Name', 'Age'],
      rows: [
        ['Alice', '30'],
        ['Bob', '41'],
      ],
    });
    expect(sheets[1].sheetName).toBe('Second');
    expect(sheets[1].rows).toEqual([['Berlin', '10115']]);
  });

  it('skips empty sheets', () => {
    const buffer = workbookBuffer({
      Empty: [],
      Data: [['H'], ['v']],
    });

    const sheets = parseExcelBuffer(buffer);

    expect(sheets.map((sheet) => sheet.sheetName)).toEqual(['Data']);
  });

  it('trims empty rows from the top of a sheet', () => {
    const buffer = workbookBuffer({
      Padded: [
        ['', ''],
        ['Name', 'Age'],
        ['Alice', 30],
      ],
    });

    const sheets = parseExcelBuffer(buffer);

    expect(sheets).toHaveLength(1);
    expect(sheets[0].headers).toEqual(['Name', 'Age']);
    expect(sheets[0].rows).toEqual([['Alice', '30']]);
  });

  it('keeps sheets that only contain headers', () => {
    const buffer = workbookBuffer({
      HeadersOnly: [['Name', 'Age']],
    });

    const sheets = parseExcelBuffer(buffer);

    expect(sheets).toHaveLength(1);
    expect(sheets[0].headers).toEqual(['Name', 'Age']);
    expect(sheets[0].rows).toEqual([]);
  });
});
