import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { DeleteSourcesUseCase } from './delete-sources.use-case';
import { DeleteSourcesCommand } from './delete-sources.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { SourceRepository } from '../../ports/source.repository';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { SourceStatus } from '../../../domain/source-status.enum';
import { TextType, FileType } from '../../../domain/source-type.enum';
import { FileSource } from '../../../domain/sources/text-source.entity';

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;

function makeSource(id: UUID, status: SourceStatus): FileSource {
  return new FileSource({
    id,
    name: 'doc.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
    status,
    processingStartedAt: status === SourceStatus.PROCESSING ? new Date() : null,
  });
}

describe('DeleteSourcesUseCase', () => {
  let useCase: DeleteSourcesUseCase;
  let mockSourceRepository: Record<string, jest.Mock>;
  let mockDocumentProcessingPort: Record<string, jest.Mock>;
  let mockListObjectsUseCase: Record<string, jest.Mock>;
  let mockDeleteObjectUseCase: Record<string, jest.Mock>;
  let mockContextService: Record<string, jest.Mock>;
  let mockIndex: Record<string, jest.Mock>;

  beforeAll(async () => {
    mockSourceRepository = {
      findByIds: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    };
    mockDocumentProcessingPort = {
      cancelJob: jest.fn().mockResolvedValue(undefined),
      enqueue: jest.fn(),
    };
    mockListObjectsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    };
    mockDeleteObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockContextService = {
      get: jest.fn().mockReturnValue(ORG_ID),
    };
    mockIndex = { deleteMany: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSourcesUseCase,
        { provide: SourceRepository, useValue: mockSourceRepository },
        {
          provide: DocumentProcessingPort,
          useValue: mockDocumentProcessingPort,
        },
        { provide: ListObjectsUseCase, useValue: mockListObjectsUseCase },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: IndexRegistry,
          useValue: { getAll: () => [mockIndex] },
        },
      ],
    }).compile();

    useCase = module.get<DeleteSourcesUseCase>(DeleteSourcesUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSourceRepository.findByIds.mockResolvedValue([]);
    mockSourceRepository.deleteMany.mockResolvedValue(undefined);
    mockDocumentProcessingPort.cancelJob.mockResolvedValue(undefined);
    mockListObjectsUseCase.execute.mockResolvedValue([]);
    mockDeleteObjectUseCase.execute.mockResolvedValue(undefined);
    mockContextService.get.mockReturnValue(ORG_ID);
  });

  it('should cancel jobs and clean MinIO for processing sources in batch delete', async () => {
    const processingId = randomUUID();
    const readyId = randomUUID();
    const minioFile = `${ORG_ID}/processing/${processingId}/doc.pdf`;

    mockSourceRepository.findByIds.mockResolvedValue([
      makeSource(processingId, SourceStatus.PROCESSING),
      makeSource(readyId, SourceStatus.READY),
    ]);
    mockListObjectsUseCase.execute.mockResolvedValue([minioFile]);

    await useCase.execute(new DeleteSourcesCommand([processingId, readyId]));

    // Only the processing source should trigger cancellation
    expect(mockDocumentProcessingPort.cancelJob).toHaveBeenCalledTimes(1);
    expect(mockDocumentProcessingPort.cancelJob).toHaveBeenCalledWith(
      processingId,
    );
    expect(mockListObjectsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: `${ORG_ID}/processing/${processingId}/`,
      }),
    );
    expect(mockDeleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: minioFile }),
    );
    // Both should be deleted from index and DB
    expect(mockIndex.deleteMany).toHaveBeenCalledWith([processingId, readyId]);
    expect(mockSourceRepository.deleteMany).toHaveBeenCalledWith([
      processingId,
      readyId,
    ]);
  });

  it('should skip early when sourceIds is empty', async () => {
    await useCase.execute(new DeleteSourcesCommand([]));

    expect(mockSourceRepository.findByIds).not.toHaveBeenCalled();
    expect(mockSourceRepository.deleteMany).not.toHaveBeenCalled();
  });
});
