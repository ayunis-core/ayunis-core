import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { CreateLetterheadUseCase } from './create-letterhead.use-case';
import { CreateLetterheadCommand } from './create-letterhead.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  LetterheadInvalidPdfError,
  LetterheadPdfNotSinglePageError,
} from 'src/domain/letterheads/application/letterheads.errors';

async function createSinglePagePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

async function createMultiPagePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage();
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

describe('CreateLetterheadUseCase', () => {
  let useCase: CreateLetterheadUseCase;
  let letterheadsRepository: jest.Mocked<LetterheadsRepository>;
  let uploadObjectUseCase: jest.Mocked<UploadOrgObjectUseCase>;
  let deleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;

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

    const mockDeleteObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLetterheadUseCase,
        LetterheadPdfService,
        { provide: LetterheadsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadOrgObjectUseCase, useValue: mockUploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
      ],
    }).compile();

    useCase = module.get(CreateLetterheadUseCase);
    letterheadsRepository = module.get(LetterheadsRepository);
    uploadObjectUseCase = module.get(UploadOrgObjectUseCase);
    deleteObjectUseCase = module.get(DeleteObjectUseCase);

    letterheadsRepository.save.mockImplementation(async (l) => l);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a letterhead with first-page PDF only', async () => {
    const pdfBuffer = await createSinglePagePdf();

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
    expect(uploadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: mockOrgId }),
    );
  });

  it('should create a letterhead with both first-page and continuation PDFs', async () => {
    const firstPagePdf = await createSinglePagePdf();
    const continuationPdf = await createSinglePagePdf();

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

  it('removes the first page when the continuation upload fails', async () => {
    const firstPagePdf = await createSinglePagePdf();
    const continuationPdf = await createSinglePagePdf();
    uploadObjectUseCase.execute
      .mockResolvedValueOnce(new StorageObject('first', 'default', 1, 'first'))
      .mockRejectedValueOnce(new Error('continuation upload failed'));

    await expect(
      useCase.execute(
        new CreateLetterheadCommand({
          name: 'Failed continuation',
          firstPagePdfBuffer: firstPagePdf,
          continuationPagePdfBuffer: continuationPdf,
          firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
          continuationPageMargins: {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20,
          },
        }),
      ),
    ).rejects.toThrow('Error creating letterhead');

    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: expect.stringMatching(/first-page\.pdf$/),
      }),
    );
  });

  it('removes both uploaded pages when persistence fails', async () => {
    const firstPagePdf = await createSinglePagePdf();
    const continuationPdf = await createSinglePagePdf();
    letterheadsRepository.save.mockRejectedValueOnce(new Error('save failed'));

    await expect(
      useCase.execute(
        new CreateLetterheadCommand({
          name: 'Failed save',
          firstPagePdfBuffer: firstPagePdf,
          continuationPagePdfBuffer: continuationPdf,
          firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
          continuationPageMargins: {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20,
          },
        }),
      ),
    ).rejects.toThrow('Error creating letterhead');

    const deletedPaths = deleteObjectUseCase.execute.mock.calls.map(
      ([command]) => command.objectName,
    );
    expect(deletedPaths).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/first-page\.pdf$/),
        expect.stringMatching(/continuation\.pdf$/),
      ]),
    );
  });

  it('should reject a multi-page first-page PDF', async () => {
    const multiPagePdf = await createMultiPagePdf(3);

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
    const firstPagePdf = await createSinglePagePdf();
    const multiPageContinuation = await createMultiPagePdf(2);

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
        LetterheadPdfService,
        { provide: LetterheadsRepository, useValue: letterheadsRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadOrgObjectUseCase, useValue: uploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: deleteObjectUseCase },
      ],
    }).compile();

    const useCaseNoOrg = module.get(CreateLetterheadUseCase);
    const pdfBuffer = await createSinglePagePdf();

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
    const pdfBuffer = await createSinglePagePdf();

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
    const pdfBuffer = await createSinglePagePdf();

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
    const pdfBuffer = await createSinglePagePdf();

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
