import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RetrieveFileContentUseCase } from './retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import type { FileRetrieverHandler } from 'src/domain/retrievers/file-retrievers/application/ports/file-retriever.handler';
import { FileRetrieverRegistry } from 'src/domain/retrievers/file-retrievers/application/file-retriever-handler.registry';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { DocumentConverterPort } from 'src/domain/retrievers/file-retrievers/application/ports/document-converter.port';
import retrievalConfig from 'src/config/retrieval.config';
import { TranscribeUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.use-case';
import {
  EmptyOcrResultError,
  FileRetrieverUnauthorizedError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { FileRetrieverType } from 'src/domain/retrievers/file-retrievers/domain/value-objects/file-retriever-type.enum';

describe('RetrieveFileContentUseCase', () => {
  let useCase: RetrieveFileContentUseCase;
  let mockMistralHandler: Partial<FileRetrieverHandler>;
  let mockPdfParseHandler: Partial<FileRetrieverHandler>;
  let mockRegistry: Partial<FileRetrieverRegistry>;
  let mockContextService: Partial<ContextService>;
  let mockDocumentConverter: Partial<DocumentConverterPort>;
  let mockTranscribeUseCase: Partial<TranscribeUseCase>;

  const mockRetrievalConfig = {
    mistral: {
      apiKey: 'test-mistral-key',
    },
  };

  beforeAll(async () => {
    mockMistralHandler = { processFile: jest.fn() };
    mockPdfParseHandler = { processFile: jest.fn() };
    mockRegistry = {
      getHandler: jest.fn((type: FileRetrieverType) =>
        type === FileRetrieverType.MISTRAL
          ? mockMistralHandler
          : mockPdfParseHandler,
      ) as FileRetrieverRegistry['getHandler'],
    };
    mockContextService = {
      get: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
    };
    mockDocumentConverter = {
      convertToPdf: jest.fn(),
    };
    mockTranscribeUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveFileContentUseCase,
        {
          provide: getLoggerToken(RetrieveFileContentUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: FileRetrieverRegistry, useValue: mockRegistry },
        { provide: ContextService, useValue: mockContextService },
        { provide: DocumentConverterPort, useValue: mockDocumentConverter },
        { provide: TranscribeUseCase, useValue: mockTranscribeUseCase },
        { provide: retrievalConfig.KEY, useValue: mockRetrievalConfig },
      ],
    }).compile();

    useCase = module.get<RetrieveFileContentUseCase>(
      RetrieveFileContentUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('rejects retrieval without organization context using a domain error', async () => {
    jest.spyOn(mockContextService, 'get').mockReturnValueOnce(undefined);

    await expect(
      useCase.execute(
        new RetrieveFileContentCommand({
          fileData: Buffer.from('budget report'),
          fileName: 'budget-report.txt',
          fileType: 'text/plain',
        }),
      ),
    ).rejects.toBeInstanceOf(FileRetrieverUnauthorizedError);
  });

  it('should return UTF-8 text content directly for TXT files', async () => {
    const textContent = 'Hello, this is plain text content.\nLine two.';
    const command = new RetrieveFileContentCommand({
      fileData: Buffer.from(textContent, 'utf8'),
      fileName: 'notes.txt',
      fileType: 'text/plain',
    });

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(FileRetrieverResult);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]).toBeInstanceOf(FileRetrieverPage);
    expect(result.pages[0].text).toBe(textContent);
    expect(result.pages[0].number).toBe(1);
    expect(mockMistralHandler.processFile).not.toHaveBeenCalled();
  });

  it('should strip UTF-8 BOM from TXT files', async () => {
    const textContent = 'Hello, BOM test content.';
    const bomBuffer = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(textContent, 'utf8'),
    ]);
    const command = new RetrieveFileContentCommand({
      fileData: bomBuffer,
      fileName: 'bom-file.txt',
      fileType: 'text/plain',
    });

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(FileRetrieverResult);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].text).toBe(textContent);
    expect(result.pages[0].text).not.toMatch(/^\uFEFF/);
    expect(mockMistralHandler.processFile).not.toHaveBeenCalled();
  });

  it('should extract text from an EML file as a single page', async () => {
    const eml = Buffer.from(
      [
        'From: Alice <alice@example.com>',
        'Subject: Anfrage',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Inhalt der E-Mail.',
      ].join('\r\n'),
      'utf8',
    );

    const result = await useCase.execute(
      new RetrieveFileContentCommand({
        fileData: eml,
        fileName: 'anfrage.eml',
        fileType: 'message/rfc822',
      }),
    );

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].number).toBe(1);
    expect(result.pages[0].text).toContain('Subject: Anfrage');
    expect(result.pages[0].text).toContain('Inhalt der E-Mail.');
    expect(mockMistralHandler.processFile).not.toHaveBeenCalled();
  });

  it('should process PDF file successfully', async () => {
    const command = new RetrieveFileContentCommand({
      fileData: Buffer.from('test file content'),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
    });
    const expectedResult = new FileRetrieverResult([
      new FileRetrieverPage('processed content', 1),
    ]);

    jest
      .spyOn(mockMistralHandler, 'processFile')
      .mockResolvedValue(expectedResult);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedResult);
    expect(mockMistralHandler.processFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileData: command.fileData,
        filename: command.fileName,
        fileType: command.fileType,
      }),
    );
  });

  it('limits the pages processed by Mistral when requested by the caller', async () => {
    const command = new RetrieveFileContentCommand({
      fileData: Buffer.from('test file content'),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      pdfPageLimit: 51,
    });
    const expectedResult = new FileRetrieverResult([
      new FileRetrieverPage('processed content', 1),
    ]);
    jest
      .spyOn(mockMistralHandler, 'processFile')
      .mockResolvedValue(expectedResult);

    await useCase.execute(command);

    expect(mockMistralHandler.processFile).toHaveBeenCalledWith(
      expect.objectContaining({ filename: command.fileName }),
      { pageLimit: 51 },
    );
  });

  it('falls back to local PDF parsing when Mistral returns zero pages', async () => {
    const fallbackResult = new FileRetrieverResult([
      new FileRetrieverPage('Locally extracted budget report', 1),
    ]);
    jest
      .spyOn(mockMistralHandler, 'processFile')
      .mockRejectedValue(new EmptyOcrResultError());
    jest
      .spyOn(mockPdfParseHandler, 'processFile')
      .mockResolvedValue(fallbackResult);

    const result = await useCase.execute(
      new RetrieveFileContentCommand({
        fileData: Buffer.from('pdf content'),
        fileName: 'budget-report.pdf',
        fileType: 'application/pdf',
      }),
    );

    expect(result).toBe(fallbackResult);
    expect(mockPdfParseHandler.processFile).toHaveBeenCalledTimes(1);
  });

  it('does not run local PDF parsing when the caller disables it', async () => {
    const emptyOcrError = new EmptyOcrResultError();
    jest
      .spyOn(mockMistralHandler, 'processFile')
      .mockRejectedValue(emptyOcrError);

    await expect(
      useCase.execute(
        new RetrieveFileContentCommand({
          fileData: Buffer.from('image-only pdf'),
          fileName: 'inline-scanned-form.pdf',
          fileType: 'application/pdf',
          allowLocalPdfParsing: false,
        }),
      ),
    ).rejects.toBe(emptyOcrError);
    expect(mockPdfParseHandler.processFile).not.toHaveBeenCalled();
  });

  it('keeps an empty Mistral response terminal when local parsing also extracts no text', async () => {
    const emptyOcrError = new EmptyOcrResultError();
    jest
      .spyOn(mockMistralHandler, 'processFile')
      .mockRejectedValue(emptyOcrError);
    jest
      .spyOn(mockPdfParseHandler, 'processFile')
      .mockResolvedValue(
        new FileRetrieverResult([new FileRetrieverPage('   ', 1)]),
      );

    await expect(
      useCase.execute(
        new RetrieveFileContentCommand({
          fileData: Buffer.from('image-only pdf'),
          fileName: 'scanned-form.pdf',
          fileType: 'application/pdf',
        }),
      ),
    ).rejects.toBe(emptyOcrError);
  });

  it('does not fall back for deterministic Mistral document rejections', async () => {
    const documentError = new UnprocessableDocumentError(
      'Document is not a valid PDF',
    );
    jest
      .spyOn(mockMistralHandler, 'processFile')
      .mockRejectedValue(documentError);

    await expect(
      useCase.execute(
        new RetrieveFileContentCommand({
          fileData: Buffer.from('invalid pdf'),
          fileName: 'invalid.pdf',
          fileType: 'application/pdf',
        }),
      ),
    ).rejects.toBe(documentError);
    expect(mockPdfParseHandler.processFile).not.toHaveBeenCalled();
  });

  it('should transcribe audio and wrap the transcript as a single page', async () => {
    const audioBuffer = Buffer.from('fake audio bytes');
    const transcript = 'Hello world, this is the transcribed audio.';
    jest.spyOn(mockTranscribeUseCase, 'execute').mockResolvedValue(transcript);

    const command = new RetrieveFileContentCommand({
      fileData: audioBuffer,
      fileName: 'meeting.mp3',
      fileType: 'audio/mpeg',
    });

    const result = await useCase.execute(command);

    expect(mockTranscribeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        file: audioBuffer,
        fileName: 'meeting.mp3',
        mimeType: 'audio/mpeg',
      }),
    );
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].text).toBe(transcript);
    expect(result.pages[0].number).toBe(1);
    expect(mockMistralHandler.processFile).not.toHaveBeenCalled();
  });

  it('should convert DOCX to PDF via Gotenberg then process with Mistral', async () => {
    const docxBuffer = Buffer.from('fake docx content');
    const pdfBuffer = Buffer.from('converted pdf content');
    const expectedResult = new FileRetrieverResult([
      new FileRetrieverPage('extracted text from converted docx', 1),
    ]);

    jest
      .spyOn(mockDocumentConverter, 'convertToPdf')
      .mockResolvedValue(pdfBuffer);
    jest
      .spyOn(mockMistralHandler, 'processFile')
      .mockResolvedValue(expectedResult);

    const command = new RetrieveFileContentCommand({
      fileData: docxBuffer,
      fileName: 'report.docx',
      fileType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const result = await useCase.execute(command);

    expect(mockDocumentConverter.convertToPdf).toHaveBeenCalledWith(
      docxBuffer,
      'report.docx',
    );
    expect(mockMistralHandler.processFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileData: pdfBuffer,
        filename: 'report.pdf',
        fileType: 'application/pdf',
      }),
    );
    expect(result).toBe(expectedResult);
  });
});
