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
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType, FileType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

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
  let mockCleanupSourceProcessingUseCase: Record<string, jest.Mock>;
  let mockIndex: Record<string, jest.Mock>;

  const orgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;

  beforeAll(async () => {
    mockSourceRepository = {
      findByIds: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    };
    mockCleanupSourceProcessingUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockIndex = { deleteMany: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSourcesUseCase,
        { provide: SourceRepository, useValue: mockSourceRepository },
        {
          provide: CleanupSourceProcessingUseCase,
          useValue: mockCleanupSourceProcessingUseCase,
        },
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
    mockCleanupSourceProcessingUseCase.execute.mockResolvedValue(undefined);
  });

  it('should cancel and cleanup for processing sources in batch delete', async () => {
    const processingId = randomUUID();
    const readyId = randomUUID();

    mockSourceRepository.findByIds.mockResolvedValue([
      makeSource(processingId, SourceStatus.PROCESSING),
      makeSource(readyId, SourceStatus.READY),
    ]);

    await useCase.execute(
      new DeleteSourcesCommand([processingId, readyId], orgId),
    );

    expect(mockCleanupSourceProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [processingId], orgId }),
    );
    // Both should be deleted from index and DB
    expect(mockIndex.deleteMany).toHaveBeenCalledWith([processingId, readyId]);
    expect(mockSourceRepository.deleteMany).toHaveBeenCalledWith([
      processingId,
      readyId,
    ]);
  });

  it('should skip early when sourceIds is empty', async () => {
    await useCase.execute(new DeleteSourcesCommand([], orgId));

    expect(mockSourceRepository.findByIds).not.toHaveBeenCalled();
    expect(mockSourceRepository.deleteMany).not.toHaveBeenCalled();
  });
});
