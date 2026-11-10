import PdfParse from 'pdf-parse';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { NpmPdfParseFileRetrieverHandler } from './npm-pdf-parse-file-retriever.handler';

jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedPdfParse = jest.mocked(PdfParse);
const document = new File(
  Buffer.from('%PDF-1.7 malformed compressed stream'),
  'damaged-council-report.pdf',
  'application/pdf',
);

describe('NpmPdfParseFileRetrieverHandler', () => {
  const handler = new NpmPdfParseFileRetrieverHandler();

  beforeEach(() => jest.clearAllMocks());

  it('classifies malformed PDF parser failures as an unprocessable document', async () => {
    const parserError = new Error('Bad block header in flate stream');
    parserError.name = 'FormatError';
    mockedPdfParse.mockRejectedValue(parserError);

    await expect(handler.processFile(document)).rejects.toEqual(
      expect.objectContaining({
        code: 'UNPROCESSABLE_DOCUMENT',
        statusCode: 422,
        metadata: expect.objectContaining({
          fileName: document.filename,
          parserError: 'FormatError',
          parserReason: 'pdfjs_document_error',
        }),
      }),
    );
    await expect(handler.processFile(document)).rejects.toBeInstanceOf(
      UnprocessableDocumentError,
    );
  });

  it.each([
    [
      'FormatError: Bad block header in flate stream',
      'FormatError',
      'pdfjs_document_error',
    ],
    ['Bad block header in flate stream', 'Error', 'invalid_flate_stream'],
  ])(
    'classifies generic parser errors from bundled PDF.js: %s',
    async (message, parserError, parserReason) => {
      mockedPdfParse.mockRejectedValue(new Error(message));

      await expect(handler.processFile(document)).rejects.toMatchObject({
        code: 'UNPROCESSABLE_DOCUMENT',
        statusCode: 422,
        metadata: { parserError, parserReason },
      });
    },
  );

  it('preserves unexpected parser failures for operational reporting', async () => {
    const parserError = new Error('Worker process exited unexpectedly');
    mockedPdfParse.mockRejectedValue(parserError);

    await expect(handler.processFile(document)).rejects.toBe(parserError);
  });

  it('reads a PDF kept on disk when it has to parse it locally', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'pdf-parse-spec-'));
    try {
      const path = join(directory, 'file');
      const bytes = Buffer.from('%PDF-1.7 staged document');
      writeFileSync(path, bytes);
      mockedPdfParse.mockResolvedValue({ text: 'Ratsprotokoll' } as never);

      const result = await handler.processFile(
        new File(Buffer.alloc(0), 'protokoll.pdf', 'application/pdf', {
          path,
          size: bytes.length,
          sha256: 'staged',
        }),
      );

      expect(result.pages[0].text).toBe('Ratsprotokoll');
      expect(mockedPdfParse).toHaveBeenCalledWith(new Uint8Array(bytes));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
