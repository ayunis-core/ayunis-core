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
import { ProcessingFilesCleanupService } from '../../services/processing-files-cleanup.service';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { SourceRepository } from '../../ports/source.repository';
import { SourceStatus } from '../../../domain/source-status.enum';
import { TextType, FileType } from '../../../domain/source-type.enum';
import { FileSource } from '../../../domain/sources/text-source.entity';
import { UnexpectedSourceError } from '../../sources.errors';

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;

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
  let mockDocumentProcessingPort: Record<string, jest.Mock>;
  let mockProcessingFilesCleanupService: Record<string, jest.Mock>;
  let mockDeleteContentUseCase: Record<string, jest.Mock>;

  beforeAll(async () => {
    mockSourceRepository = {
      findById: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockDocumentProcessingPort = {
      cancelJob: jest.fn().mockResolvedValue(undefined),
      enqueue: jest.fn(),
    };
    mockProcessingFilesCleanupService = {
      cleanup: jest.fn().mockResolvedValue(undefined),
    };
    mockDeleteContentUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSourceUseCase,
        { provide: SourceRepository, useValue: mockSourceRepository },
        {
          provide: DocumentProcessingPort,
          useValue: mockDocumentProcessingPort,
        },
        {
          provide: ProcessingFilesCleanupService,
          useValue: mockProcessingFilesCleanupService,
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
    mockDocumentProcessingPort.cancelJob.mockResolvedValue(undefined);
    mockProcessingFilesCleanupService.cleanup.mockResolvedValue(undefined);
    mockDeleteContentUseCase.execute.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should cancel BullMQ job when deleting a processing source', async () => {
    const sourceId = randomUUID();
    mockSourceRepository.findById.mockResolvedValue(
      makeProcessingSource(sourceId),
    );

    await useCase.execute(new DeleteSourceCommand(sourceId));

    expect(mockDocumentProcessingPort.cancelJob).toHaveBeenCalledWith(sourceId);
  });

  it('should clean up MinIO files when deleting a processing source', async () => {
    const sourceId = randomUUID();
    mockSourceRepository.findById.mockResolvedValue(
      makeProcessingSource(sourceId),
    );

    await useCase.execute(new DeleteSourceCommand(sourceId));

    expect(mockProcessingFilesCleanupService.cleanup).toHaveBeenCalledWith(
      sourceId,
    );
  });

  it('should not call cancelJob for ready sources', async () => {
    const sourceId = randomUUID();
    mockSourceRepository.findById.mockResolvedValue(makeReadySource(sourceId));

    await useCase.execute(new DeleteSourceCommand(sourceId));

    expect(mockDocumentProcessingPort.cancelJob).not.toHaveBeenCalled();
    expect(mockProcessingFilesCleanupService.cleanup).not.toHaveBeenCalled();
  });

  it('should wrap repository errors into UnexpectedSourceError', async () => {
    const sourceId = randomUUID();
    mockSourceRepository.delete.mockRejectedValue(
      new Error('Repository error'),
    );

    await expect(
      useCase.execute(new DeleteSourceCommand(sourceId)),
    ).rejects.toBeInstanceOf(UnexpectedSourceError);

    expect(mockSourceRepository.delete).toHaveBeenCalledWith(sourceId);
  });
});
