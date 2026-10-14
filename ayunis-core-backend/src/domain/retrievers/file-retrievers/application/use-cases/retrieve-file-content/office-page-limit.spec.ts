import { Test } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import { ContextService } from 'src/common/context/services/context.service';
import retrievalConfig from 'src/config/retrieval.config';
import { FileRetrieverRegistry } from 'src/domain/retrievers/file-retrievers/application/file-retriever-handler.registry';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentConverterPort } from 'src/domain/retrievers/file-retrievers/application/ports/document-converter.port';
import { MsgParserPort } from 'src/domain/retrievers/file-retrievers/application/ports/msg-parser.port';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { TranscribeUseCase } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.use-case';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import { RetrieveFileContentUseCase } from './retrieve-file-content.use-case';

describe('Office document page limit after conversion', () => {
  let useCase: RetrieveFileContentUseCase;
  const converter = { convertToPdf: jest.fn() };
  const handler = { processFile: jest.fn() };
  const config = { processingMaxPdfPages: 2, mistral: { apiKey: 'ocr-key' } };
  const extracted = new FileRetrieverResult([
    new FileRetrieverPage('Municipal budget report', 1),
  ]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RetrieveFileContentUseCase,
        PreflightCheckUseCase,
        { provide: retrievalConfig.KEY, useValue: config },
        { provide: DocumentConverterPort, useValue: converter },
        {
          provide: FileRetrieverRegistry,
          useValue: { getHandler: () => handler },
        },
        { provide: ContextService, useValue: { get: () => 'municipality-id' } },
        { provide: MsgParserPort, useValue: {} },
        { provide: TranscribeUseCase, useValue: {} },
      ],
    }).compile();
    useCase = module.get(RetrieveFileContentUseCase);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    handler.processFile.mockResolvedValue(extracted);
  });

  async function convertedPdf(pageCount: number): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    for (let page = 0; page < pageCount; page++) pdf.addPage();
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }

  const formats = [
    [
      'docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    [
      'pptx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    ['odt', 'application/vnd.oasis.opendocument.text'],
    ['odp', 'application/vnd.oasis.opendocument.presentation'],
  ];

  it.each(formats)(
    'rejects an over-limit %s before text extraction',
    async (extension, fileType) => {
      const pdfBuffer = await convertedPdf(3);
      const originalBytes = Buffer.from(pdfBuffer);
      converter.convertToPdf.mockResolvedValue(pdfBuffer);

      await expect(
        useCase.execute(
          new RetrieveFileContentCommand({
            fileData: Buffer.from('Office document bytes'),
            fileName: `budget.${extension}`,
            fileType,
          }),
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          constructor: TooManyPagesError,
          metadata: expect.objectContaining({
            fileName: `budget.${extension}`,
          }) as unknown,
        }) as Error,
      );
      expect(handler.processFile).not.toHaveBeenCalled();
      expect(pdfBuffer).toEqual(originalBytes);
    },
  );

  it.each(formats)(
    'processes a %s exactly at the page limit',
    async (extension, fileType) => {
      converter.convertToPdf.mockResolvedValue(await convertedPdf(2));

      const result = await useCase.execute(
        new RetrieveFileContentCommand({
          fileData: Buffer.from('Office document bytes'),
          fileName: `budget.${extension}`,
          fileType,
        }),
      );

      expect(result).toBe(extracted);
    },
  );

  it('retains the email and a sibling attachment when converted Word content exceeds the cap', async () => {
    converter.convertToPdf.mockResolvedValue(await convertedPdf(3));
    const eml = Buffer.from(
      [
        'Subject: Budget meeting',
        'Content-Type: multipart/mixed; boundary="budget-boundary"',
        '',
        '--budget-boundary',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Please review the budget.',
        '--budget-boundary',
        `Content-Type: ${formats[0][1]}`,
        'Content-Disposition: attachment; filename="budget.docx"',
        '',
        'Office document bytes',
        '--budget-boundary',
        'Content-Type: text/plain',
        'Content-Disposition: attachment; filename="agenda.txt"',
        '',
        'Discuss the annual budget.',
        '--budget-boundary--',
      ].join('\r\n'),
    );

    const result = await useCase.execute(
      new RetrieveFileContentCommand({
        fileData: eml,
        fileName: 'budget-meeting.eml',
        fileType: 'message/rfc822',
      }),
    );

    expect(result.pages[0].text).toContain('Please review the budget.');
    expect(result.pages[0].text).toContain(
      '--- Attachment: budget.docx ---\n[Content could not be extracted:',
    );
    expect(result.pages[0].text).toContain(
      new TooManyPagesError({
        fileName: 'budget.docx',
        pageCount: 3,
        maxPages: 2,
      }).message,
    );
    expect(result.pages[0].text).toContain(
      '--- Attachment: agenda.txt ---\nDiscuss the annual budget.',
    );
    expect(handler.processFile).not.toHaveBeenCalled();
  });
});
