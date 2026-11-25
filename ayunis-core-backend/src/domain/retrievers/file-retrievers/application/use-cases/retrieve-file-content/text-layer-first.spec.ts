import { PDFDocument, StandardFonts } from 'pdf-lib';
import { ContextService } from 'src/common/context/services/context.service';
import retrievalConfig from 'src/config/retrieval.config';
import { FileRetrieverRegistry } from 'src/domain/retrievers/file-retrievers/application/file-retriever-handler.registry';
import {
  FileRetrieverUnauthorizedError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentConverterPort } from 'src/domain/retrievers/file-retrievers/application/ports/document-converter.port';
import { MsgParserPort } from 'src/domain/retrievers/file-retrievers/application/ports/msg-parser.port';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { FileRetrieverType } from 'src/domain/retrievers/file-retrievers/domain/value-objects/file-retriever-type.enum';
import { NpmPdfParseFileRetrieverHandler } from 'src/domain/retrievers/file-retrievers/infrastructure/adapters/npm-pdf-parse-file-retriever.handler';
import { TranscribeRecordingUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe-recording/transcribe-recording.use-case';
import { Test } from '@nestjs/testing';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import { RetrieveFileContentUseCase } from './retrieve-file-content.use-case';
import { hasUsableTextLayer } from './text-layer';

const RESOLUTION =
  'Die Gemeindevertretung beschliesst den Ausbau der Kindertagesstaette.';

/** A PDF whose pages carry `texts` as a text layer; `null` is a page without one (a scan). */
async function pdfWithPages(texts: Array<string | null>): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const text of texts) {
    const page = pdf.addPage();
    if (text) page.drawText(text, { font, size: 10, x: 40, y: 700 });
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

function pagesOf(texts: string[]): FileRetrieverResult {
  return new FileRetrieverResult(
    texts.map((text, index) => new FileRetrieverPage(text, index + 1)),
  );
}

describe('RetrieveFileContentUseCase with the text layer first', () => {
  const ocr = { processFile: jest.fn() };
  const context = { get: jest.fn() };
  let useCase: RetrieveFileContentUseCase;

  beforeAll(async () => {
    const localParser = new NpmPdfParseFileRetrieverHandler();
    const module = await Test.createTestingModule({
      providers: [
        RetrieveFileContentUseCase,
        {
          provide: FileRetrieverRegistry,
          useValue: {
            getHandler: (type: FileRetrieverType) =>
              type === FileRetrieverType.MISTRAL ? ocr : localParser,
          },
        },
        { provide: ContextService, useValue: context },
        { provide: DocumentConverterPort, useValue: {} },
        { provide: TranscribeRecordingUseCase, useValue: {} },
        { provide: MsgParserPort, useValue: {} },
        { provide: PreflightCheckUseCase, useValue: { execute: jest.fn() } },
        {
          provide: retrievalConfig.KEY,
          useValue: { mistral: { apiKey: 'mistral-key' } },
        },
      ],
    }).compile();
    useCase = module.get(RetrieveFileContentUseCase);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    context.get.mockReturnValue(undefined);
  });

  function retrieve(fileData: Buffer, pdfTextLayerFirst = true) {
    return useCase.execute(
      new RetrieveFileContentCommand({
        fileData,
        fileName: 'beschlussvorlage.pdf',
        fileType: 'application/pdf',
        pdfTextLayerFirst,
        onBehalfOfPlatform: true,
      }),
    );
  }

  it('reads a PDF with a text layer page by page without an OCR call', async () => {
    const result = await retrieve(
      await pdfWithPages([RESOLUTION, `Begruendung: ${RESOLUTION}`]),
    );

    expect(ocr.processFile).not.toHaveBeenCalled();
    expect(result.pages.map((page) => page.number)).toEqual([1, 2]);
    expect(result.pages[0].text).toContain(RESOLUTION);
    expect(result.pages[1].text).toContain(`Begruendung: ${RESOLUTION}`);
  });

  it('OCRs a scanned PDF without a usable text layer', async () => {
    const ocrResult = pagesOf([RESOLUTION]);
    ocr.processFile.mockResolvedValue(ocrResult);

    const result = await retrieve(await pdfWithPages([null, null]));

    expect(ocr.processFile).toHaveBeenCalledTimes(1);
    expect(result).toBe(ocrResult);
  });

  it('keeps the pages of a thin text layer when OCR rejects the document', async () => {
    ocr.processFile.mockRejectedValue(
      new UnprocessableDocumentError('The document could not be processed'),
    );

    const result = await retrieve(
      await pdfWithPages([RESOLUTION, null, null, null, null]),
    );

    expect(result.pages.map((page) => page.number)).toEqual([1, 2, 3, 4, 5]);
    expect(result.pages[0].text).toContain(RESOLUTION);
  });

  it('still OCRs a PDF with a text layer when the caller does not ask for it first', async () => {
    const ocrResult = pagesOf([RESOLUTION]);
    ocr.processFile.mockResolvedValue(ocrResult);

    const result = await retrieve(await pdfWithPages([RESOLUTION]), false);

    expect(result).toBe(ocrResult);
  });

  it('requires an org context unless the platform asks', async () => {
    await expect(
      useCase.execute(
        new RetrieveFileContentCommand({
          fileData: Buffer.from('Tagesordnung'),
          fileName: 'tagesordnung.txt',
          fileType: 'text/plain',
        }),
      ),
    ).rejects.toBeInstanceOf(FileRetrieverUnauthorizedError);
  });
});

describe('hasUsableTextLayer', () => {
  it.each([
    [[RESOLUTION, RESOLUTION, RESOLUTION, RESOLUTION, ''], true],
    [[RESOLUTION, RESOLUTION, ''], false],
    [['Seite 1', 'Seite 2'], false],
    [[], false],
  ])(
    'takes the text layer only when four in five pages carry text (%j)',
    (texts, usable) => {
      expect(hasUsableTextLayer(pagesOf(texts))).toBe(usable);
    },
  );
});
