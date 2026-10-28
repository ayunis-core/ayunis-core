import Piscina from 'piscina';
import { SpreadsheetParseTimeoutError } from 'src/domain/sources/application/sources.errors';
import { PiscinaSpreadsheetParserAdapter } from './piscina-spreadsheet-parser.adapter';

const runMock = jest.fn();
const destroyMock = jest.fn();

jest.mock('piscina', () =>
  jest.fn().mockImplementation(() => ({
    run: runMock,
    destroy: destroyMock,
  })),
);

describe('PiscinaSpreadsheetParserAdapter', () => {
  let adapter: PiscinaSpreadsheetParserAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PiscinaSpreadsheetParserAdapter();
  });

  it('returns the sheets parsed by the worker pool', async () => {
    const sheets = [{ sheetName: 'First', headers: ['A'], rows: [['1']] }];
    runMock.mockResolvedValue(sheets);

    await expect(adapter.parseWorkbook(Buffer.from('xlsx'))).resolves.toEqual(
      sheets,
    );
  });

  it.each([
    ['parseWorkbook', () => adapter.parseWorkbook(Buffer.from('xlsx'))],
    ['listDataSheets', () => adapter.listDataSheets(Buffer.from('xlsx'))],
    ['parseCsv', () => adapter.parseCsv('a,b\n1,2')],
  ] as const)(
    'runs %s as a named worker task with an abort signal',
    async (taskName, invoke) => {
      runMock.mockResolvedValue([]);

      await invoke();

      const options = runMock.mock.calls[0][1] as {
        name: string;
        signal: AbortSignal;
      };
      expect(options.name).toBe(taskName);
      expect(options.signal).toBeInstanceOf(AbortSignal);
    },
  );

  it('maps an aborted task to SpreadsheetParseTimeoutError', async () => {
    const abortError = new Error('The task has been aborted');
    Object.defineProperty(abortError, 'name', { value: 'AbortError' });
    runMock.mockRejectedValue(abortError);

    await expect(
      adapter.parseWorkbook(Buffer.from('xlsx')),
    ).rejects.toBeInstanceOf(SpreadsheetParseTimeoutError);
  });

  it('caps the worker heap so a decompression bomb cannot OOM the process', async () => {
    runMock.mockResolvedValue([]);

    await adapter.parseWorkbook(Buffer.from('xlsx'));

    const poolOptions = (Piscina as unknown as jest.Mock).mock.calls[0][0] as {
      resourceLimits?: { maxOldGenerationSizeMb?: number };
    };
    expect(poolOptions.resourceLimits?.maxOldGenerationSizeMb).toBe(512);
  });

  it.each([
    ['File is password-protected', 'encrypted_workbook'],
    ['Unsupported ZIP Compression method 9', 'unsupported_archive'],
    ['Bad compressed size: 10 != 12', 'archive_size_mismatch'],
    ['Unrecognized CFB Header', 'invalid_container'],
    ['Cannot find file [Content_Types].xml in zip', 'missing_workbook_part'],
    ['Could not find workbook', 'missing_workbook_part'],
    ['Unexpected end of data', 'truncated_data'],
    ['Workbook is corrupt', 'corrupt_workbook'],
  ])(
    'classifies malformed workbook failure %s as %s',
    async (message, parserReason) => {
      const parseError = new Error(message);
      runMock.mockRejectedValue(parseError);

      await expect(
        adapter.listDataSheets(Buffer.from('damaged-xlsx')),
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'UNPROCESSABLE_SPREADSHEET',
          statusCode: 422,
          cause: parseError,
          metadata: { parserReason },
        }),
      );
    },
  );

  it('rethrows worker infrastructure errors unchanged', async () => {
    const workerError = new Error('Worker process exited unexpectedly');
    runMock.mockRejectedValue(workerError);

    await expect(adapter.parseWorkbook(Buffer.from('xlsx'))).rejects.toBe(
      workerError,
    );
  });
});
