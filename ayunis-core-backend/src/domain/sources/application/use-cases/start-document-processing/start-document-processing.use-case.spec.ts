import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { StartDocumentProcessingUseCase } from './start-document-processing.use-case';
import { StartDocumentProcessingCommand } from './start-document-processing.command';
import { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { EnqueueDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.use-case';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';

describe('StartDocumentProcessingUseCase', () => {
  let useCase: StartDocumentProcessingUseCase;
  let mockCreateProcessingSourceUseCase: jest.Mocked<CreateProcessingSourceUseCase>;
  let mockMarkSourceFailedUseCase: jest.Mocked<MarkSourceFailedUseCase>;
  let mockUploadObjectUseCase: jest.Mocked<UploadObjectUseCase>;
  let mockDeleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;
  let mockEnqueueDocumentProcessingUseCase: jest.Mocked<EnqueueDocumentProcessingUseCase>;
  let mockContextService: jest.Mocked<ContextService>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;

  function buildProcessingSource(
    overrides: Partial<{ name: string }> = {},
  ): FileSource {
    return new FileSource({
      fileType: FileType.PDF,
      name: overrides.name ?? 'Protokoll.pdf',
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date(),
    });
  }

  beforeEach(async () => {
    mockCreateProcessingSourceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateProcessingSourceUseCase>;

    mockMarkSourceFailedUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MarkSourceFailedUseCase>;

    mockUploadObjectUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UploadObjectUseCase>;

    mockDeleteObjectUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteObjectUseCase>;

    mockEnqueueDocumentProcessingUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EnqueueDocumentProcessingUseCase>;

    mockContextService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'orgId') return orgId;
        if (key === 'userId') return userId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    mockCreateProcessingSourceUseCase.execute.mockImplementation(async (cmd) =>
      buildProcessingSource({ name: cmd.fileName }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartDocumentProcessingUseCase,
        {
          provide: CreateProcessingSourceUseCase,
          useValue: mockCreateProcessingSourceUseCase,
        },
        {
          provide: MarkSourceFailedUseCase,
          useValue: mockMarkSourceFailedUseCase,
        },
        { provide: UploadObjectUseCase, useValue: mockUploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
        {
          provide: EnqueueDocumentProcessingUseCase,
          useValue: mockEnqueueDocumentProcessingUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(StartDocumentProcessingUseCase);
  });

  it('should create a PROCESSING source, upload to MinIO, and enqueue job', async () => {
    const command = new StartDocumentProcessingCommand({
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll_März_2025.pdf',
      fileType: 'application/pdf',
    });

    const result = await useCase.execute(command);

    // Source created with PROCESSING status
    expect(result.status).toBe(SourceStatus.PROCESSING);
    expect(result.name).toBe('Protokoll_März_2025.pdf');

    // Source created via use case
    expect(mockCreateProcessingSourceUseCase.execute).toHaveBeenCalledTimes(1);

    // File uploaded to MinIO with correct path
    expect(mockUploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
    const uploadCall = mockUploadObjectUseCase.execute.mock.calls[0][0];
    expect(uploadCall.objectName).toContain(`${orgId}/processing/`);
    expect(uploadCall.objectName).toContain('Protokoll_M_rz_2025.pdf');

    // Job enqueued with correct params
    expect(mockEnqueueDocumentProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: result.id,
        orgId,
        userId,
        fileName: 'Protokoll_März_2025.pdf',
        fileType: 'application/pdf',
      }),
    );
  });

  it('should mark source as FAILED when MinIO upload fails', async () => {
    mockUploadObjectUseCase.execute.mockRejectedValue(
      new Error('MinIO connection refused'),
    );

    const command = new StartDocumentProcessingCommand({
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // Source should be marked as FAILED
    expect(mockMarkSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: 'Failed to upload file to storage',
      }),
    );

    // MinIO file should NOT be cleaned up (upload failed, nothing to clean)
    expect(mockDeleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should mark source as FAILED and clean up MinIO when enqueue fails', async () => {
    mockEnqueueDocumentProcessingUseCase.execute.mockRejectedValue(
      new Error('Redis connection refused'),
    );

    const command = new StartDocumentProcessingCommand({
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // Source should be marked as FAILED
    expect(mockMarkSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: 'Failed to enqueue processing job',
      }),
    );

    // MinIO file should be cleaned up
    expect(mockDeleteObjectUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should throw when orgId is missing from context', async () => {
    mockContextService.get.mockReturnValue(undefined);

    const command = new StartDocumentProcessingCommand({
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // No source should be created
    expect(mockCreateProcessingSourceUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw when userId is missing from context', async () => {
    mockContextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'orgId') return orgId;
      return undefined;
    });

    const command = new StartDocumentProcessingCommand({
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // No source should be created
    expect(mockCreateProcessingSourceUseCase.execute).not.toHaveBeenCalled();
  });
});
