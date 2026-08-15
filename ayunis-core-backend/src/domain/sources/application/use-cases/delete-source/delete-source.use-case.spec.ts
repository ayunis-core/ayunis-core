import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { DeleteSourceUseCase } from './delete-source.use-case';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { CleanupSourceProcessingUseCase } from '../cleanup-source-processing/cleanup-source-processing.use-case';
import { SourceRepository } from '../../ports/source.repository';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType, FileType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { UnexpectedSourceError } from '../../sources.errors';

function makeProcessingSource(id: UUID): FileSource {
  return new FileSource({
    id,
    name: 'doc.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
    status: SourceStatus.PROCESSING,
    processingStartedAt: new Date(),
  });
}

function makeReadySource(id: UUID): FileSource {
  return new FileSource({
    id,
    name: 'doc.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
    status: SourceStatus.READY,
  });
}

describe('DeleteSourceUseCase', () => {
  let useCase: DeleteSourceUseCase;
  let mockSourceRepository: Record<string, jest.Mock>;
  let mockCleanupSourceProcessingUseCase: Record<string, jest.Mock>;
  let mockDeleteContentUseCase: Record<string, jest.Mock>;

  const orgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;

  beforeAll(async () => {
    mockSourceRepository = {
      findById: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCleanupSourceProcessingUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockDeleteContentUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSourceUseCase,
        {
          provide: getLoggerToken(DeleteSourceUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: SourceRepository, useValue: mockSourceRepository },
        {
          provide: CleanupSourceProcessingUseCase,
          useValue: mockCleanupSourceProcessingUseCase,
        },
        { provide: DeleteContentUseCase, useValue: mockDeleteContentUseCase },
      ],
    }).compile();

    useCase = module.get<DeleteSourceUseCase>(DeleteSourceUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSourceRepository.findById.mockResolvedValue(null);
    mockSourceRepository.delete.mockResolvedValue(undefined);
    mockCleanupSourceProcessingUseCase.execute.mockResolvedValue(undefined);
    mockDeleteContentUseCase.execute.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should clean up a processing source using its explicit org', async () => {
    const sourceId = randomUUID();
    mockSourceRepository.findById.mockResolvedValue(
      makeProcessingSource(sourceId),
    );

    await useCase.execute(new DeleteSourceCommand(sourceId, orgId));

    expect(mockCleanupSourceProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [sourceId], orgId }),
    );
  });

  it('should not clean up ready sources', async () => {
    const sourceId = randomUUID();
    mockSourceRepository.findById.mockResolvedValue(makeReadySource(sourceId));

    await useCase.execute(new DeleteSourceCommand(sourceId, orgId));

    expect(mockCleanupSourceProcessingUseCase.execute).not.toHaveBeenCalled();
  });

  it('should wrap repository errors into UnexpectedSourceError', async () => {
    const sourceId = randomUUID();
    mockSourceRepository.delete.mockRejectedValue(
      new Error('Repository error'),
    );

    await expect(
      useCase.execute(new DeleteSourceCommand(sourceId, orgId)),
    ).rejects.toBeInstanceOf(UnexpectedSourceError);

    expect(mockSourceRepository.delete).toHaveBeenCalledWith(sourceId);
  });
});
