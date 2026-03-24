import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { AddDocumentToKnowledgeBaseUseCase } from './add-document-to-knowledge-base.use-case';
import { AddDocumentToKnowledgeBaseCommand } from './add-document-to-knowledge-base.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { KnowledgeBaseNotFoundError } from '../../knowledge-bases.errors';
import { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { EnqueueDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.use-case';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';

describe('AddDocumentToKnowledgeBaseUseCase', () => {
  let useCase: AddDocumentToKnowledgeBaseUseCase;
  let mockKbRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockCreateProcessingSourceUseCase: jest.Mocked<CreateProcessingSourceUseCase>;
  let mockMarkSourceFailedUseCase: jest.Mocked<MarkSourceFailedUseCase>;
  let mockUploadObjectUseCase: jest.Mocked<UploadObjectUseCase>;
  let mockDeleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;
  let mockEnqueueDocumentProcessingUseCase: jest.Mocked<EnqueueDocumentProcessingUseCase>;
  let mockContextService: jest.Mocked<ContextService>;
  let mockTxHost: { withTransaction: jest.Mock };

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;

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
    mockKbRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

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

    mockTxHost = {
      withTransaction: jest
        .fn()
        .mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    };

    // Default: return a processing source
    mockCreateProcessingSourceUseCase.execute.mockImplementation(async (cmd) =>
      buildProcessingSource({ name: cmd.fileName }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddDocumentToKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockKbRepository },
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
        { provide: TransactionHost, useValue: mockTxHost },
      ],
    }).compile();

    useCase = module.get(AddDocumentToKnowledgeBaseUseCase);
  });

  it('should create a PROCESSING source, upload to MinIO, and enqueue job', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
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

    // Assigned to KB
    expect(mockKbRepository.assignSourceToKnowledgeBase).toHaveBeenCalledWith(
      result.id,
      knowledgeBaseId,
    );

    // File uploaded to MinIO
    expect(mockUploadObjectUseCase.execute).toHaveBeenCalledTimes(1);

    // Job enqueued
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

  it('should throw KnowledgeBaseNotFoundError when KB does not belong to user', async () => {
    const otherUserId = '99999999-9999-9999-9999-999999999999' as UUID;
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Anderer Benutzer KB',
      orgId,
      userId: otherUserId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
    expect(mockCreateProcessingSourceUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when KB does not exist', async () => {
    mockKbRepository.findById.mockResolvedValue(null);

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should mark source as FAILED when MinIO upload fails', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);
    mockUploadObjectUseCase.execute.mockRejectedValue(
      new Error('MinIO connection refused'),
    );

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // Source should be marked as FAILED via use case
    expect(mockMarkSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: 'Failed to upload file to storage',
      }),
    );
  });

  it('should mark source as FAILED when enqueue fails after MinIO upload', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);
    mockEnqueueDocumentProcessingUseCase.execute.mockRejectedValue(
      new Error('Redis connection refused'),
    );

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // Source should be marked as FAILED via use case
    expect(mockMarkSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: 'Failed to enqueue processing job',
      }),
    );
  });
});
