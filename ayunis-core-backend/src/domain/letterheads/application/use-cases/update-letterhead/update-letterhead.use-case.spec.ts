import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UUID } from 'crypto';
import { UpdateLetterheadUseCase } from './update-letterhead.use-case';
import { UpdateLetterheadCommand } from './update-letterhead.command';
import { LetterheadsRepository } from 'src/domain/letterheads/application/ports/letterheads-repository.port';
import { LetterheadPdfService } from 'src/domain/letterheads/application/services/letterhead-pdf.service';
import { PdfNormalizerService } from 'src/domain/letterheads/application/services/pdf-normalizer.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  LetterheadNotFoundError,
  LetterheadPdfNotSinglePageError,
} from 'src/domain/letterheads/application/letterheads.errors';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { createPdf } from 'src/domain/letterheads/testing/pdf-fixtures';

describe('UpdateLetterheadUseCase', () => {
  let useCase: UpdateLetterheadUseCase;
  let letterheadsRepository: jest.Mocked<LetterheadsRepository>;
  let uploadObjectUseCase: jest.Mocked<UploadObjectUseCase>;
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
        {
          provide: getLoggerToken(UpdateLetterheadUseCase.name),
          useValue: createPinoLoggerMock(),
        },
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
        { provide: LetterheadsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadObjectUseCase, useValue: mockUploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
      ],
    }).compile();

    useCase = module.get(UpdateLetterheadUseCase);
    letterheadsRepository = module.get(LetterheadsRepository);
    uploadObjectUseCase = module.get(UploadObjectUseCase);
    deleteObjectUseCase = module.get(DeleteObjectUseCase);

    letterheadsRepository.save.mockImplementation(async (l) => l);
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

  it('should replace the first-page PDF when a new buffer is provided', async () => {
    const newPdf = await createPdf(1);

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      firstPagePdfBuffer: newPdf,
    });

    const result = await useCase.execute(command);

    expect(result.firstPageStoragePath).toContain('first-page.pdf');
    expect(uploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should add a continuation PDF when provided', async () => {
    const continuationPdf = await createPdf(1);

    const command = new UpdateLetterheadCommand({
      letterheadId: mockLetterheadId,
      continuationPagePdfBuffer: continuationPdf,
    });

    const result = await useCase.execute(command);

    expect(result.continuationPageStoragePath).toContain('continuation.pdf');
    expect(uploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
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
    const multiPagePdf = await createPdf(2);

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
        {
          provide: getLoggerToken(UpdateLetterheadUseCase.name),
          useValue: createPinoLoggerMock(),
        },
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
        { provide: LetterheadsRepository, useValue: letterheadsRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UploadObjectUseCase, useValue: uploadObjectUseCase },
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
