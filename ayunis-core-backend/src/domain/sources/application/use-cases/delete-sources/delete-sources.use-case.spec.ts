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
import { SourceProcessingCleanupService } from '../../services/source-processing-cleanup.service';
import { SourceRepository } from '../../ports/source.repository';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { SourceStatus } from '../../../domain/source-status.enum';
import { TextType, FileType } from '../../../domain/source-type.enum';
import { FileSource } from '../../../domain/sources/text-source.entity';

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
  let mockSourceProcessingCleanupService: Record<string, jest.Mock>;
  let mockIndex: Record<string, jest.Mock>;

  beforeAll(async () => {
    mockSourceRepository = {
      findByIds: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    };
    mockSourceProcessingCleanupService = {
      cancelAndCleanup: jest.fn().mockResolvedValue(undefined),
    };
    mockIndex = { deleteMany: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSourcesUseCase,
        { provide: SourceRepository, useValue: mockSourceRepository },
        {
          provide: SourceProcessingCleanupService,
          useValue: mockSourceProcessingCleanupService,
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
    mockSourceProcessingCleanupService.cancelAndCleanup.mockResolvedValue(
      undefined,
    );
  });

  it('should cancel and cleanup for processing sources in batch delete', async () => {
    const processingId = randomUUID();
    const readyId = randomUUID();

    mockSourceRepository.findByIds.mockResolvedValue([
      makeSource(processingId, SourceStatus.PROCESSING),
      makeSource(readyId, SourceStatus.READY),
    ]);

    await useCase.execute(new DeleteSourcesCommand([processingId, readyId]));

    // Only the processing source should trigger cleanup
    expect(
      mockSourceProcessingCleanupService.cancelAndCleanup,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockSourceProcessingCleanupService.cancelAndCleanup,
    ).toHaveBeenCalledWith(processingId);
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
