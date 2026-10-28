import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { UpdateLetterheadUseCase } from './update-letterhead.use-case';
import { UpdateLetterheadCommand } from './update-letterhead.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  LetterheadNotFoundError,
  LetterheadPdfNotSinglePageError,
  LetterheadUpdateConflictError,
  UnexpectedLetterheadError,
} from 'src/domain/letterheads/application/letterheads.errors';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';

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

describe('UpdateLetterheadUseCase', () => {
  let useCase: UpdateLetterheadUseCase;
  let letterheadsRepository: jest.Mocked<LetterheadsRepository>;
  let uploadObjectUseCase: jest.Mocked<UploadOrgObjectUseCase>;
  let deleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockLetterheadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

  const existingLetterhead = new Letterhead({
    id: mockLetterheadId,
    orgId: mockOrgId,
    name: 'Original Name',
    description: 'Original Description',
    firstPageStoragePath: `letterheads/${mockOrgId}/${mockLetterheadId}/first-page.pdf`,
    continuationPageStoragePath: null,
    firstPageMargins: { top: 55, bottom: 20, left: 25, right: 15 },
    continuationPageMargins: { top: 20, bottom: 20, left: 25, right: 15 },
  });

  beforeEach(async () => {
    const mockRepository = {
      findAllByOrgId: jest.fn(),
      findById: jest.fn().mockResolvedValue(existingLetterhead),
      save: jest.fn(),
      updateIfUnchanged: jest.fn(),
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
        UpdateLetterheadUseCase,
        LetterheadPdfService,
        { provide: LetterheadsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadOrgObjectUseCase, useValue: mockUploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
      ],
    }).compile();

    useCase = module.get(UpdateLetterheadUseCase);
    letterheadsRepository = module.get(LetterheadsRepository);
    uploadObjectUseCase = module.get(UploadOrgObjectUseCase);
    deleteObjectUseCase = module.get(DeleteObjectUseCase);

    letterheadsRepository.updateIfUnchanged.mockImplementation(async (l) => l);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update name and description without uploading files', async () => {
    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      name: 'Updated Briefpapier',
      description: 'Neues Design 2026',
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Updated Briefpapier');
    expect(result.description).toBe('Neues Design 2026');
    expect(result.firstPageStoragePath).toBe(
      existingLetterhead.firstPageStoragePath,
    );
    expect(uploadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should update margins without replacing PDF files', async () => {
    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      firstPageMargins: { top: 70, bottom: 25, left: 30, right: 20 },
    });

    const result = await useCase.execute(command);

    expect(result.firstPageMargins).toEqual({
      top: 70,
      bottom: 25,
      left: 30,
      right: 20,
    });
    expect(result.continuationPageMargins).toEqual(
      existingLetterhead.continuationPageMargins,
    );
  });

  it('should advance the version timestamp when the update starts in the same millisecond', async () => {
    const timestamp = new Date(Date.now() + 60_000);
    letterheadsRepository.findById.mockResolvedValue(
      new Letterhead({ ...existingLetterhead, updatedAt: timestamp }),
    );

    await useCase.execute(
      new UpdateLetterheadCommand({ letterheadId: mockLetterheadId }),
    );

    const updated = letterheadsRepository.updateIfUnchanged.mock.calls[0][0];
    expect(updated.updatedAt.getTime()).toBe(timestamp.getTime() + 1);
  });

  it('should replace the first-page PDF when a new buffer is provided', async () => {
    const newPdf = await createSinglePagePdf();

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      firstPagePdfBuffer: newPdf,
    });

    const result = await useCase.execute(command);

    expect(result.firstPageStoragePath).toContain('first-page.pdf');
    expect(result.firstPageStoragePath).not.toBe(
      existingLetterhead.firstPageStoragePath,
    );
    expect(uploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
    expect(uploadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: mockOrgId,
        objectName: result.firstPageStoragePath,
      }),
    );
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: existingLetterhead.firstPageStoragePath,
      }),
    );
  });

  it('should add a continuation PDF when provided', async () => {
    const continuationPdf = await createSinglePagePdf();

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      continuationPagePdfBuffer: continuationPdf,
    });

    const result = await useCase.execute(command);

    expect(result.continuationPageStoragePath).toContain('continuation.pdf');
    expect(uploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should retire the previous continuation PDF after persisting its replacement', async () => {
    const continuationPath = `letterheads/${mockOrgId}/${mockLetterheadId}/continuation.pdf`;
    letterheadsRepository.findById.mockResolvedValue(
      new Letterhead({
        ...existingLetterhead,
        continuationPageStoragePath: continuationPath,
      }),
    );

    const result = await useCase.execute(
      new UpdateLetterheadCommand({
        letterheadId: mockLetterheadId,
        continuationPagePdfBuffer: await createSinglePagePdf(),
      }),
    );

    expect(result.continuationPageStoragePath).not.toBe(continuationPath);
    expect(
      letterheadsRepository.updateIfUnchanged.mock.invocationCallOrder[0],
    ).toBeLessThan(deleteObjectUseCase.execute.mock.invocationCallOrder[0]);
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: continuationPath }),
    );
  });

  it('should remove an uploaded replacement when persistence fails', async () => {
    letterheadsRepository.updateIfUnchanged.mockRejectedValue(
      new Error('database error'),
    );

    await expect(
      useCase.execute(
        new UpdateLetterheadCommand({
          letterheadId: mockLetterheadId,
          firstPagePdfBuffer: await createSinglePagePdf(),
        }),
      ),
    ).rejects.toThrow(UnexpectedLetterheadError);

    const upload = uploadObjectUseCase.execute.mock.calls[0][0];
    expect(upload.objectName).not.toBe(existingLetterhead.firstPageStoragePath);
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: upload.objectName }),
    );
    expect(deleteObjectUseCase.execute).not.toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: existingLetterhead.firstPageStoragePath,
      }),
    );
  });

  it('should preserve the committed PDF when a concurrent update wins', async () => {
    letterheadsRepository.updateIfUnchanged.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateLetterheadCommand({
          letterheadId: mockLetterheadId,
          firstPagePdfBuffer: await createSinglePagePdf(),
        }),
      ),
    ).rejects.toThrow(LetterheadUpdateConflictError);

    const upload = uploadObjectUseCase.execute.mock.calls[0][0];
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: upload.objectName }),
    );
    expect(deleteObjectUseCase.execute).not.toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: existingLetterhead.firstPageStoragePath,
      }),
    );
  });

  it('should remove an earlier replacement when a later upload fails', async () => {
    uploadObjectUseCase.execute
      .mockResolvedValueOnce(
        new StorageObject('first', 'default', 1024, 'first'),
      )
      .mockRejectedValueOnce(new Error('organisation archived'));

    await expect(
      useCase.execute(
        new UpdateLetterheadCommand({
          letterheadId: mockLetterheadId,
          firstPagePdfBuffer: await createSinglePagePdf(),
          continuationPagePdfBuffer: await createSinglePagePdf(),
        }),
      ),
    ).rejects.toThrow(UnexpectedLetterheadError);

    const firstUpload = uploadObjectUseCase.execute.mock.calls[0][0];
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: firstUpload.objectName }),
    );
  });

  it('should clear continuation PDF and delete storage file when removeContinuationPage is true', async () => {
    const continuationPath = `letterheads/${mockOrgId}/${mockLetterheadId}/continuation.pdf`;
    const withContinuation = new Letterhead({
      ...existingLetterhead,
      continuationPageStoragePath: continuationPath,
    });
    letterheadsRepository.findById.mockResolvedValue(withContinuation);

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      removeContinuationPage: true,
    });

    const result = await useCase.execute(command);

    expect(result.continuationPageStoragePath).toBeNull();
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: continuationPath }),
    );
  });

  it('should persist removal before deleting the continuation file', async () => {
    const continuationPath = `letterheads/${mockOrgId}/${mockLetterheadId}/continuation.pdf`;
    letterheadsRepository.findById.mockResolvedValue(
      new Letterhead({
        ...existingLetterhead,
        continuationPageStoragePath: continuationPath,
      }),
    );

    await useCase.execute(
      new UpdateLetterheadCommand({
        letterheadId: mockLetterheadId,
        removeContinuationPage: true,
      }),
    );

    expect(
      letterheadsRepository.updateIfUnchanged.mock.invocationCallOrder[0],
    ).toBeLessThan(deleteObjectUseCase.execute.mock.invocationCallOrder[0]);
  });

  it('should keep a committed removal successful when storage cleanup fails', async () => {
    const continuationPath = `letterheads/${mockOrgId}/${mockLetterheadId}/continuation.pdf`;
    letterheadsRepository.findById.mockResolvedValue(
      new Letterhead({
        ...existingLetterhead,
        continuationPageStoragePath: continuationPath,
      }),
    );
    deleteObjectUseCase.execute.mockRejectedValue(
      new Error('storage unavailable'),
    );

    const result = await useCase.execute(
      new UpdateLetterheadCommand({
        letterheadId: mockLetterheadId,
        removeContinuationPage: true,
      }),
    );

    expect(result.continuationPageStoragePath).toBeNull();
    expect(letterheadsRepository.updateIfUnchanged).toHaveBeenCalled();
  });

  it('should not delete the continuation file when persistence fails', async () => {
    const continuationPath = `letterheads/${mockOrgId}/${mockLetterheadId}/continuation.pdf`;
    letterheadsRepository.findById.mockResolvedValue(
      new Letterhead({
        ...existingLetterhead,
        continuationPageStoragePath: continuationPath,
      }),
    );
    letterheadsRepository.updateIfUnchanged.mockRejectedValue(
      new Error('database error'),
    );

    await expect(
      useCase.execute(
        new UpdateLetterheadCommand({
          letterheadId: mockLetterheadId,
          removeContinuationPage: true,
        }),
      ),
    ).rejects.toThrow(UnexpectedLetterheadError);
    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should not call deleteObject when removeContinuationPage is true but no file exists', async () => {
    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      removeContinuationPage: true,
    });

    const result = await useCase.execute(command);

    expect(result.continuationPageStoragePath).toBeNull();
    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject a multi-page first-page PDF replacement', async () => {
    const multiPagePdf = await createMultiPagePdf(2);

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      firstPagePdfBuffer: multiPagePdf,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      LetterheadPdfNotSinglePageError,
    );
  });

  it('should throw LetterheadNotFoundError when letterhead does not exist', async () => {
    letterheadsRepository.findById.mockResolvedValue(null);

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      name: 'Does Not Exist',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      LetterheadNotFoundError,
    );
  });

  it('should throw UnauthorizedAccessError when orgId is missing', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLetterheadUseCase,
        LetterheadPdfService,
        { provide: LetterheadsRepository, useValue: letterheadsRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadOrgObjectUseCase, useValue: uploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: deleteObjectUseCase },
      ],
    }).compile();

    const useCaseNoOrg = module.get(UpdateLetterheadUseCase);

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      name: 'No Org',
    });

    await expect(useCaseNoOrg.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should allow setting description to null explicitly', async () => {
    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      description: null,
    });

    const result = await useCase.execute(command);

    expect(result.description).toBeNull();
  });
});
