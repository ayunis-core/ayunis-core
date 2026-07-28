import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PreflightCheckUseCase } from './preflight-check.use-case';
import { PreflightCheckCommand } from './preflight-check.command';
import { TooManyPagesError } from '../../file-retriever.errors';
import { PdfTextExtractorPort } from '../../ports/pdf-text-extractor.port';
import retrievalConfig from 'src/config/retrieval.config';

describe('PreflightCheckUseCase', () => {
  let useCase: PreflightCheckUseCase;
  let countPages: jest.Mock;

  const defaultConfig = {
    mistral: { apiKey: undefined },
    processingMaxPdfPages: 1000,
  };

  beforeAll(async () => {
    countPages = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreflightCheckUseCase,
        {
          provide: retrievalConfig.KEY,
          useValue: defaultConfig,
        },
        {
          provide: PdfTextExtractorPort,
          useValue: { countPages },
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
      countPages.mockResolvedValueOnce(999);

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
      countPages.mockResolvedValueOnce(1486);

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

    it('should allow the PDF through if the metadata read fails', async () => {
      countPages.mockRejectedValueOnce(new Error('Corrupt PDF header'));

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

      expect(countPages).not.toHaveBeenCalled();
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

      expect(countPages).not.toHaveBeenCalled();
    });
  });
});
