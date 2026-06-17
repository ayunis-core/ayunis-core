import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PreflightCheckUseCase } from './preflight-check.use-case';
import { PreflightCheckCommand } from './preflight-check.command';
import { DocumentTooLargeForChatError } from '../../file-retriever.errors';
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
    chatUploadMaxPdfPages: 50,
    chatUploadMaxFileSizeMb: 5,
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

  describe('PDF preflight', () => {
    it('should allow a PDF with fewer pages than the limit', async () => {
      mockedPdfParse.mockResolvedValueOnce({
        numpages: 10,
        numrender: 10,
        info: {},
        metadata: null,
        version: 'default',
        text: '',
      });

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.from('fake-pdf-data'),
            fileName: 'small-document.pdf',
            fileType: 'application/pdf',
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('should reject a PDF exceeding the page limit', async () => {
      mockedPdfParse.mockResolvedValueOnce({
        numpages: 120,
        numrender: 120,
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
      ).rejects.toThrow(DocumentTooLargeForChatError);
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

  describe('DOCX/PPTX file size preflight', () => {
    it('should allow a DOCX file under the size limit', async () => {
      const smallFile = Buffer.alloc(1 * 1024 * 1024); // 1MB

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: smallFile,
            fileName: 'report.docx',
            fileType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('should reject a DOCX file exceeding the size limit', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB > 5MB limit

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: largeFile,
            fileName: 'huge-report.docx',
            fileType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ),
      ).rejects.toThrow(DocumentTooLargeForChatError);
    });

    it('should reject a PPTX file exceeding the size limit', async () => {
      const largeFile = Buffer.alloc(8 * 1024 * 1024); // 8MB > 5MB limit

      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: largeFile,
            fileName: 'large-presentation.pptx',
            fileType:
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          }),
        ),
      ).rejects.toThrow(DocumentTooLargeForChatError);
    });
  });

  describe('file types without preflight', () => {
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

    it('should pass through CSV files without any checks', async () => {
      await expect(
        useCase.execute(
          new PreflightCheckCommand({
            fileData: Buffer.from('header1,header2\nval1,val2'),
            fileName: 'data.csv',
            fileType: 'text/csv',
          }),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
