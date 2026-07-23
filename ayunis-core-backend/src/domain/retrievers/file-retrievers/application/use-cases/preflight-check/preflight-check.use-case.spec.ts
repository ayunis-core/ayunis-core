import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PreflightCheckUseCase } from './preflight-check.use-case';
import { PreflightCheckCommand } from './preflight-check.command';
import { TooManyPagesError } from '../../file-retriever.errors';
import retrievalConfig from 'src/config/retrieval.config';

// Mock pdf-parse to control page count without needing real PDFs
jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({ numpages: 5 });
});

import PdfParse from 'pdf-parse';

const mockedPdfParse = PdfParse as jest.MockedFunction<typeof PdfParse>;

describe('PreflightCheckUseCase', () => {
  let useCase: PreflightCheckUseCase;

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
      ],
    }).compile();

    useCase = module.get<PreflightCheckUseCase>(PreflightCheckUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PDF page cap', () => {
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
