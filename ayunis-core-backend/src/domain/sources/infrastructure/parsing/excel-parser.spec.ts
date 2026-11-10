import * as XLSX from 'xlsx';
import {
  listDataSheetNames,
  parseExcelBuffer,
  WorkbookCellLimitError,
} from './excel-parser';

function workbookBuffer(sheets: Record<string, unknown[][]>): Buffer {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// Excel keeps the declared used range (the `<dimension>` tag) when formatting
// or a deleted cell once reached far beyond the data.
function sparseWorkbookBuffer(
  cells: Record<string, string | number>,
  usedRange: string,
): Buffer {
  const worksheet: XLSX.WorkSheet = { '!ref': usedRange };
  for (const [address, value] of Object.entries(cells)) {
    worksheet[address] = {
      t: typeof value === 'number' ? 'n' : 's',
      v: value,
    };
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet');
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

  it('builds only populated cells when the used range spans the whole sheet', () => {
    const buffer = sparseWorkbookBuffer(
      { A1: 'Name', B1: 'Age', A2: 'Alice', B2: 30 },
      'A1:Z1048576',
    );

    const startedAt = Date.now();
    const sheets = parseExcelBuffer(buffer);

    expect(Date.now() - startedAt).toBeLessThan(1_000);
    expect(sheets).toEqual([
      { sheetName: 'Sheet', headers: ['Name', 'Age'], rows: [['Alice', '30']] },
    ]);
  });

  it('drops empty rows and trailing blank cells', () => {
    const buffer = sparseWorkbookBuffer(
      { A1: 'Name', B1: 'Age', A2: 'Alice', A4: 'Bob', B4: 41, D6: '' },
      'A1:D6',
    );

    const sheets = parseExcelBuffer(buffer);

    expect(sheets[0].headers).toEqual(['Name', 'Age']);
    expect(sheets[0].rows).toEqual([
      ['Alice', ''],
      ['Bob', '41'],
    ]);
  });

  it('rejects a workbook whose populated area exceeds the cell limit', () => {
    const buffer = sparseWorkbookBuffer(
      { A1: 'Name', Z1048576: 'stray' },
      'A1:Z1048576',
    );

    expect(() => parseExcelBuffer(buffer)).toThrow(WorkbookCellLimitError);
  });
});

describe('listDataSheetNames', () => {
  it('omits empty sheets', () => {
    const buffer = workbookBuffer({
      Empty: [],
      Data: [['H'], ['v']],
      Budget: [['Year', 'Amount']],
    });

    expect(listDataSheetNames(buffer)).toEqual(['Data', 'Budget']);
  });

  it('keeps sheets whose data starts below the first row', () => {
    const buffer = workbookBuffer({
      Padded: [
        ['', ''],
        ['Name', 'Age'],
        ['Alice', 30],
      ],
    });

    expect(listDataSheetNames(buffer)).toEqual(['Padded']);
  });

  it('returns an empty list for an all-empty workbook', () => {
    const buffer = workbookBuffer({ Tabelle1: [], Tabelle2: [] });

    expect(listDataSheetNames(buffer)).toEqual([]);
  });
});
