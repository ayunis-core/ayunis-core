import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PreflightCheckUseCase } from './preflight-check.use-case';
import { PreflightCheckCommand } from './preflight-check.command';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import retrievalConfig from 'src/config/retrieval.config';
import { PdfBatcherPort } from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';

// Mock pdf-parse to control page count without needing real PDFs
jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({ numpages: 5 });
});

import PdfParse from 'pdf-parse';

const mockedPdfParse = PdfParse as jest.MockedFunction<typeof PdfParse>;

describe('PreflightCheckUseCase', () => {
  let useCase: PreflightCheckUseCase;
  const batcher = { pageCount: jest.fn(), split: jest.fn() };

  const defaultConfig = {
    mistral: { apiKey: undefined },
    processingMaxPdfPages: 1000,
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreflightCheckUseCase,
        {
          provide: retrievalConfig.KEY,
          useValue: defaultConfig,
        },
        { provide: PdfBatcherPort, useValue: batcher },
      ],
    }).compile();

    useCase = module.get<PreflightCheckUseCase>(PreflightCheckUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PDF page cap', () => {
    it('counts the pages of a PDF on disk without loading it', async () => {
      const localFile = { path: '/staging/download-1/file', size: 500_000_000 };
      batcher.pageCount.mockResolvedValueOnce(1001);

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.alloc(0),
            localFile,
            fileName: 'grosser-haushalt.pdf',
            fileType: 'application/pdf',
          }),
        ),
      ).rejects.toMatchObject({
        code: 'TOO_MANY_PAGES',
        metadata: { pageCount: 1001, maxPages: 1000 },
      });
      expect(batcher.pageCount).toHaveBeenCalledWith(localFile);
      expect(mockedPdfParse).not.toHaveBeenCalled();
    });

    it('lets a PDF on disk through when its page count cannot be read', async () => {
      batcher.pageCount.mockRejectedValueOnce(new Error('unreadable'));

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.alloc(0),
            localFile: { path: '/staging/download-1/file', size: 10 },
            fileName: 'kaputt.pdf',
            fileType: 'application/pdf',
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('should allow a PDF within the page cap', async () => {
      mockedPdfParse.mockResolvedValueOnce({
        numpages: 999,
        numrender: 999,
        info: {},
        metadata: null,
        version: 'default',
        text: '',
      });

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.from('fake-pdf-data'),
            fileName: 'large-but-ok.pdf',
            fileType: 'application/pdf',
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('should reject a PDF exceeding the page cap with page counts in the error', async () => {
      mockedPdfParse.mockResolvedValueOnce({
        numpages: 1486,
        numrender: 1486,
        info: {},
        metadata: null,
        version: 'default',
        text: '',
      });

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.from('fake-pdf-data'),
            fileName: 'Haushaltsplan München.pdf',
            fileType: 'application/pdf',
          }),
        ),
      ).rejects.toThrow(TooManyPagesError);
    });

    it('should allow the PDF through if pdf-parse fails to read metadata', async () => {
      mockedPdfParse.mockRejectedValueOnce(new Error('Corrupt PDF header'));

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.from('not-really-a-pdf'),
            fileName: 'broken.pdf',
            fileType: 'application/pdf',
          }),
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('file types without preflight', () => {
    it('should pass through DOCX files without any checks', async () => {
      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.alloc(10 * 1024 * 1024),
            fileName: 'huge-report.docx',
            fileType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ),
      ).resolves.toBeUndefined();

      expect(mockedPdfParse).not.toHaveBeenCalled();
    });

    it('should pass through TXT files without any checks', async () => {
      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.from('a'.repeat(20 * 1024 * 1024)),
            fileName: 'large.txt',
            fileType: 'text/plain',
          }),
        ),
      ).resolves.toBeUndefined();

      expect(mockedPdfParse).not.toHaveBeenCalled();
    });
  });
});
