import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RetrieveFileContentUseCase } from './retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import type { ExtractedPageBatch } from './retrieve-file-content.command';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { PdfTextExtractorPort } from '../../ports/pdf-text-extractor.port';
import { PageOcrPort } from '../../ports/page-ocr.port';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { DocumentConverterPort } from '../../ports/document-converter.port';
import retrievalConfig from 'src/config/retrieval.config';
import { TranscribeUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.use-case';

const RICH =
  'Ein ausreichend langer Absatz mit deutlich mehr als fünfzig Zeichen Inhalt.';

describe('RetrieveFileContentUseCase', () => {
  let useCase: RetrieveFileContentUseCase;
  let mockHandler: { processFile: jest.Mock };
  let mockRegistry: Partial<FileRetrieverRegistry>;
  let mockDocumentConverter: { convertToPdf: jest.Mock };
  let mockTranscribeUseCase: { execute: jest.Mock };
  let extractPageTexts: jest.Mock;
  let ocrPages: jest.Mock;
  let closeSession: jest.Mock;
  let openSession: jest.Mock;

  const mockRetrievalConfig = {
    mistral: {
      apiKey: 'test-mistral-key',
    },
  };

  beforeAll(async () => {
    mockHandler = { processFile: jest.fn() };
    mockRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
    };
    mockDocumentConverter = { convertToPdf: jest.fn() };
    mockTranscribeUseCase = { execute: jest.fn() };
    extractPageTexts = jest.fn();
    ocrPages = jest.fn();
    closeSession = jest.fn().mockResolvedValue(undefined);
    openSession = jest
      .fn()
      .mockResolvedValue({ ocrPages, close: closeSession });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveFileContentUseCase,
        { provide: FileRetrieverRegistry, useValue: mockRegistry },
        {
          provide: ContextService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
          },
        },
        { provide: DocumentConverterPort, useValue: mockDocumentConverter },
        { provide: TranscribeUseCase, useValue: mockTranscribeUseCase },
        { provide: PdfTextExtractorPort, useValue: { extractPageTexts } },
        { provide: PageOcrPort, useValue: { openSession } },
        { provide: retrievalConfig.KEY, useValue: mockRetrievalConfig },
      ],
    }).compile();

    useCase = module.get<RetrieveFileContentUseCase>(
      RetrieveFileContentUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    openSession.mockResolvedValue({ ocrPages, close: closeSession });
  });

  function pdfCommand(
    extra: Partial<{
      skipPages: number[];
      onBatchExtracted: (batch: ExtractedPageBatch) => Promise<void>;
    }> = {},
  ): RetrieveFileContentCommand {
    return new RetrieveFileContentCommand({
      fileData: Buffer.from('pdf bytes'),
      fileName: 'bericht.pdf',
      fileType: 'application/pdf',
      ...extra,
    });
  }

  it('should return UTF-8 text content directly for TXT files', async () => {
    const textContent = 'Hello, this is plain text content.\nLine two.';

    const result = await useCase.execute(
      new RetrieveFileContentCommand({
        fileData: Buffer.from(textContent, 'utf8'),
        fileName: 'notes.txt',
        fileType: 'text/plain',
      }),
    );

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].text).toBe(textContent);
    expect(extractPageTexts).not.toHaveBeenCalled();
  });

  it('should strip UTF-8 BOM from TXT files', async () => {
    const textContent = 'Hello, BOM test content.';
    const bomBuffer = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(textContent, 'utf8'),
    ]);

    const result = await useCase.execute(
      new RetrieveFileContentCommand({
        fileData: bomBuffer,
        fileName: 'bom-file.txt',
        fileType: 'text/plain',
      }),
    );

    expect(result.pages[0].text).toBe(textContent);
  });

  it('extracts a fully born-digital PDF locally without opening an OCR session', async () => {
    extractPageTexts.mockResolvedValue([RICH, `${RICH} Seite zwei.`]);
    const batches: ExtractedPageBatch[] = [];

    const result = await useCase.execute(
      pdfCommand({
        onBatchExtracted: (batch) => {
          batches.push(batch);
          return Promise.resolve();
        },
      }),
    );

    expect(result.pages.map((page) => page.number)).toEqual([1, 2]);
    expect(openSession).not.toHaveBeenCalled();
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({ processedPages: 2, totalPages: 2 });
  });

  it('OCRs only the text-poor pages of a mixed PDF and merges in page order', async () => {
    extractPageTexts.mockResolvedValue([RICH, '', `${RICH} dritte Seite.`]);
    ocrPages.mockResolvedValue([new FileRetrieverPage('# Gescannt', 2)]);

    const result = await useCase.execute(pdfCommand());

    expect(openSession).toHaveBeenCalledTimes(1);
    expect(ocrPages).toHaveBeenCalledWith([1]);
    expect(closeSession).toHaveBeenCalledTimes(1);
    expect(result.pages.map((page) => page.number)).toEqual([1, 2, 3]);
    expect(result.pages[1].text).toBe('# Gescannt');
  });

  it('splits OCR work into batches of 25 pages and reports progress', async () => {
    extractPageTexts.mockResolvedValue(Array.from({ length: 30 }, () => ''));
    ocrPages.mockImplementation((indexes: number[]) =>
      Promise.resolve(
        indexes.map((index) => new FileRetrieverPage('scan', index + 1)),
      ),
    );
    const batches: ExtractedPageBatch[] = [];

    await useCase.execute(
      pdfCommand({
        onBatchExtracted: (batch) => {
          batches.push(batch);
          return Promise.resolve();
        },
      }),
    );

    expect(ocrPages).toHaveBeenCalledTimes(2);
    expect((ocrPages.mock.calls[0][0] as number[]).length).toBe(25);
    expect((ocrPages.mock.calls[1][0] as number[]).length).toBe(5);
    expect(batches.map((batch) => batch.processedPages)).toEqual([25, 30]);
    expect(batches[1].totalPages).toBe(30);
  });

  it('does not re-emit checkpointed pages and counts them as processed', async () => {
    extractPageTexts.mockResolvedValue([RICH, '', RICH]);
    ocrPages.mockResolvedValue([new FileRetrieverPage('scan', 2)]);
    const batches: ExtractedPageBatch[] = [];

    const result = await useCase.execute(
      pdfCommand({
        skipPages: [0],
        onBatchExtracted: (batch) => {
          batches.push(batch);
          return Promise.resolve();
        },
      }),
    );

    expect(result.pages.map((page) => page.number)).toEqual([2, 3]);
    expect(batches[0].processedPages).toBe(2); // skipped page 1 + local page 3
    expect(batches.at(-1)?.processedPages).toBe(3);
  });

  it('keeps the local text for text-poor pages when no OCR key is configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveFileContentUseCase,
        { provide: FileRetrieverRegistry, useValue: mockRegistry },
        {
          provide: ContextService,
          useValue: { get: jest.fn().mockReturnValue('org-id') },
        },
        { provide: DocumentConverterPort, useValue: mockDocumentConverter },
        { provide: TranscribeUseCase, useValue: mockTranscribeUseCase },
        { provide: PdfTextExtractorPort, useValue: { extractPageTexts } },
        { provide: PageOcrPort, useValue: { openSession } },
        {
          provide: retrievalConfig.KEY,
          useValue: { mistral: { apiKey: undefined } },
        },
      ],
    }).compile();
    const keylessUseCase = module.get<RetrieveFileContentUseCase>(
      RetrieveFileContentUseCase,
    );
    extractPageTexts.mockResolvedValue([RICH, 'kurz']);

    const result = await keylessUseCase.execute(pdfCommand());

    expect(openSession).not.toHaveBeenCalled();
    expect(result.pages.map((page) => page.text)).toEqual([RICH, 'kurz']);
  });

  it('falls back to whole-file processing when the text layer is unreadable', async () => {
    extractPageTexts.mockRejectedValue(new Error('encrypted document'));
    const expectedResult = new FileRetrieverResult([
      new FileRetrieverPage('ocr full doc', 1),
    ]);
    mockHandler.processFile.mockResolvedValue(expectedResult);

    const result = await useCase.execute(pdfCommand());

    expect(result).toBe(expectedResult);
    expect(mockHandler.processFile).toHaveBeenCalledTimes(1);
    expect(openSession).not.toHaveBeenCalled();
  });

  it('should transcribe audio and wrap the transcript as a single page', async () => {
    const audioBuffer = Buffer.from('fake audio bytes');
    const transcript = 'Hello world, this is the transcribed audio.';
    mockTranscribeUseCase.execute.mockResolvedValue(transcript);

    const result = await useCase.execute(
      new RetrieveFileContentCommand({
        fileData: audioBuffer,
        fileName: 'meeting.mp3',
        fileType: 'audio/mpeg',
      }),
    );

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].text).toBe(transcript);
    expect(extractPageTexts).not.toHaveBeenCalled();
  });

  it('should convert DOCX to PDF via Gotenberg then extract the text layer locally', async () => {
    const docxBuffer = Buffer.from('fake docx content');
    const pdfBuffer = Buffer.from('converted pdf content');
    mockDocumentConverter.convertToPdf.mockResolvedValue(pdfBuffer);
    extractPageTexts.mockResolvedValue([`${RICH} Konvertiert.`]);

    const result = await useCase.execute(
      new RetrieveFileContentCommand({
        fileData: docxBuffer,
        fileName: 'report.docx',
        fileType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    expect(mockDocumentConverter.convertToPdf).toHaveBeenCalledWith(
      docxBuffer,
      'report.docx',
    );
    expect(extractPageTexts).toHaveBeenCalledWith(pdfBuffer);
    expect(openSession).not.toHaveBeenCalled();
    expect(result.pages[0].text).toContain('Konvertiert');
  });
});
