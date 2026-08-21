import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { CreateLetterheadUseCase } from './create-letterhead.use-case';
import { CreateLetterheadCommand } from './create-letterhead.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { PdfNormalizerService } from 'src/domain/letterheads/application/services/pdf-normalizer.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  LetterheadInvalidPdfError,
  LetterheadPdfNotSinglePageError,
} from 'src/domain/letterheads/application/letterheads.errors';
import {
  createPdf,
  encryptPdf,
} from 'src/domain/letterheads/testing/pdf-fixtures';

/** Providers the letterhead PDF pipeline needs on top of the use case's own. */
const pdfPipelineProviders = () => [
  LetterheadPdfService,
  PdfNormalizerService,
  {
    provide: getLoggerToken(LetterheadPdfService.name),
    useValue: createPinoLoggerMock(),
  },
  {
    provide: getLoggerToken(PdfNormalizerService.name),
    useValue: createPinoLoggerMock(),
  },
];

describe('CreateLetterheadUseCase', () => {
  let useCase: CreateLetterheadUseCase;
  let letterheadsRepository: jest.Mocked<LetterheadsRepository>;
  let uploadObjectUseCase: jest.Mocked<UploadObjectUseCase>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockRepository = {
      findAllByOrgId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockUploadObjectUseCase = {
      execute: jest.fn().mockResolvedValue({
        objectName: 'test',
        size: 1024,
        etag: 'abc',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLetterheadUseCase,
        {
          provide: getLoggerToken(CreateLetterheadUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        ...pdfPipelineProviders(),
        { provide: LetterheadsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadObjectUseCase, useValue: mockUploadObjectUseCase },
      ],
    }).compile();

    useCase = module.get(CreateLetterheadUseCase);
    letterheadsRepository = module.get(LetterheadsRepository);
    uploadObjectUseCase = module.get(UploadObjectUseCase);

    letterheadsRepository.save.mockImplementation(async (l) => l);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a letterhead with first-page PDF only', async () => {
    const pdfBuffer = await createPdf(1);

    const command = new CreateLetterheadCommand({
      name: 'Stadtverwaltung Musterstadt',
      description: 'Offizielles Briefpapier der Stadt',
      firstPagePdfBuffer: pdfBuffer,
      firstPageMargins: { top: 55, bottom: 20, left: 25, right: 15 },
      continuationPageMargins: { top: 20, bottom: 20, left: 25, right: 15 },
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Stadtverwaltung Musterstadt');
    expect(result.description).toBe('Offizielles Briefpapier der Stadt');
    expect(result.orgId).toBe(mockOrgId);
    expect(result.firstPageStoragePath).toContain('letterheads/');
    expect(result.firstPageStoragePath).toContain('first-page.pdf');
    expect(result.continuationPageStoragePath).toBeNull();
    expect(uploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should create a letterhead with both first-page and continuation PDFs', async () => {
    const firstPagePdf = await createPdf(1);
    const continuationPdf = await createPdf(1);

    const command = new CreateLetterheadCommand({
      name: 'Amt für Finanzen',
      firstPagePdfBuffer: firstPagePdf,
      continuationPagePdfBuffer: continuationPdf,
      firstPageMargins: { top: 60, bottom: 25, left: 20, right: 20 },
      continuationPageMargins: { top: 15, bottom: 25, left: 20, right: 20 },
    });

    const result = await useCase.execute(command);

    expect(result.continuationPageStoragePath).toContain('continuation.pdf');
    expect(uploadObjectUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should reject a multi-page first-page PDF', async () => {
    const multiPagePdf = await createPdf(3);

    const command = new CreateLetterheadCommand({
      name: 'Invalid Letterhead',
      firstPagePdfBuffer: multiPagePdf,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      LetterheadPdfNotSinglePageError,
    );
    expect(letterheadsRepository.save).not.toHaveBeenCalled();
  });

  it('should reject a multi-page continuation PDF', async () => {
    const firstPagePdf = await createPdf(1);
    const multiPageContinuation = await createPdf(2);

    const command = new CreateLetterheadCommand({
      name: 'Invalid Continuation',
      firstPagePdfBuffer: firstPagePdf,
      continuationPagePdfBuffer: multiPageContinuation,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      LetterheadPdfNotSinglePageError,
    );
    expect(letterheadsRepository.save).not.toHaveBeenCalled();
  });

  it('should store a decrypted copy of a permission-encrypted PDF', async () => {
    const encryptedPdf = await encryptPdf(
      await createPdf(1),
      'encrypt=aes-256,owner-password=locked',
    );

    const command = new CreateLetterheadCommand({
      name: 'Permission-locked Letterhead',
      firstPagePdfBuffer: encryptedPdf,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    await useCase.execute(command);

    const uploaded = uploadObjectUseCase.execute.mock.calls[0][0]
      .data as Buffer;
    expect(uploaded).not.toEqual(encryptedPdf);
    await expect(PDFDocument.load(uploaded)).resolves.toBeDefined();
  });

  it('should reject an invalid PDF buffer', async () => {
    const invalidBuffer = Buffer.from('not a pdf');

    const command = new CreateLetterheadCommand({
      name: 'Corrupted File',
      firstPagePdfBuffer: invalidBuffer,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      LetterheadInvalidPdfError,
    );
  });

  it('should throw UnauthorizedAccessError when orgId is missing', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLetterheadUseCase,
        {
          provide: getLoggerToken(CreateLetterheadUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        ...pdfPipelineProviders(),
        { provide: LetterheadsRepository, useValue: letterheadsRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadObjectUseCase, useValue: uploadObjectUseCase },
      ],
    }).compile();

    const useCaseNoOrg = module.get(CreateLetterheadUseCase);
    const pdfBuffer = await createPdf(1);

    const command = new CreateLetterheadCommand({
      name: 'No Org',
      firstPagePdfBuffer: pdfBuffer,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    await expect(useCaseNoOrg.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should set description to null when not provided', async () => {
    const pdfBuffer = await createPdf(1);

    const command = new CreateLetterheadCommand({
      name: 'Minimal Letterhead',
      firstPagePdfBuffer: pdfBuffer,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    const result = await useCase.execute(command);

    expect(result.description).toBeNull();
  });

  it('should store files under the correct org-scoped path', async () => {
    const pdfBuffer = await createPdf(1);

    const command = new CreateLetterheadCommand({
      name: 'Path Test',
      firstPagePdfBuffer: pdfBuffer,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    const result = await useCase.execute(command);

    expect(result.firstPageStoragePath).toMatch(
      new RegExp(`^letterheads/${mockOrgId}/[\\w-]+/first-page\\.pdf$`),
    );
  });

  it('should construct the entity only once with valid storage paths', async () => {
    const pdfBuffer = await createPdf(1);

    const command = new CreateLetterheadCommand({
      name: 'Single Construction',
      firstPagePdfBuffer: pdfBuffer,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    const result = await useCase.execute(command);

    // The entity should have a valid storage path, not an empty string
    expect(result.firstPageStoragePath).not.toBe('');
    expect(result.firstPageStoragePath).toContain('first-page.pdf');
  });
});
