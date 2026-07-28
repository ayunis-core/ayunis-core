import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

import { AddFileSourceToThreadUseCase } from './add-file-source-to-thread.use-case';
import { AddFileSourceToThreadCommand } from './add-file-source-to-thread.command';
import { AddSourceToThreadUseCase } from '../add-source-to-thread/add-source-to-thread.use-case';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { Source } from 'src/domain/sources/domain/source.entity';
import { ThreadSourceLimitExceededError } from '../../threads.errors';
import { EmptyFileDataError } from 'src/domain/sources/application/sources.errors';

class ConcreteSource extends Source {
  constructor(params: { id?: UUID; name: string }) {
    super({
      id: params.id,
      type: SourceType.TEXT,
      name: params.name,
    });
  }
}

describe('AddFileSourceToThreadUseCase', () => {
  let useCase: AddFileSourceToThreadUseCase;
  let startDocumentProcessingUseCase: jest.Mocked<StartDocumentProcessingUseCase>;
  let addSourceToThreadUseCase: jest.Mocked<AddSourceToThreadUseCase>;

  const mockUserId = randomUUID();

  const buildThread = (sourceCount: number): Thread =>
    new Thread({
      userId: mockUserId,
      messages: [],
      sourceAssignments: Array.from(
        { length: sourceCount },
        () =>
          new SourceAssignment({
            source: new ConcreteSource({ name: 'existing.pdf' }),
          }),
      ),
    });

  const buildCommand = (thread: Thread): AddFileSourceToThreadCommand =>
    new AddFileSourceToThreadCommand({
      thread,
      fileData: Buffer.from('file contents'),
      fileName: 'report.pdf',
      fileType: 'application/pdf',
    });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddFileSourceToThreadUseCase,
        {
          provide: StartDocumentProcessingUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AddSourceToThreadUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<AddFileSourceToThreadUseCase>(
      AddFileSourceToThreadUseCase,
    );
    startDocumentProcessingUseCase = module.get(StartDocumentProcessingUseCase);
    addSourceToThreadUseCase = module.get(AddSourceToThreadUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start processing and assign the source when the thread is below the cap', async () => {
    const thread = buildThread(ThreadsConstants.MAX_SOURCES - 1);
    const source = new ConcreteSource({ name: 'report.pdf' });
    startDocumentProcessingUseCase.execute.mockResolvedValue(
      source as unknown as Awaited<
        ReturnType<StartDocumentProcessingUseCase['execute']>
      >,
    );

    const result = await useCase.execute(buildCommand(thread));

    expect(result).toBe(source);
    expect(startDocumentProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'report.pdf',
        fileType: 'application/pdf',
      }),
    );
    expect(addSourceToThreadUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ thread, source }),
    );
  });

  it('should reject before uploading or enqueueing when the thread is at the cap', async () => {
    const thread = buildThread(ThreadsConstants.MAX_SOURCES);

    await expect(useCase.execute(buildCommand(thread))).rejects.toThrow(
      ThreadSourceLimitExceededError,
    );

    expect(startDocumentProcessingUseCase.execute).not.toHaveBeenCalled();
    expect(addSourceToThreadUseCase.execute).not.toHaveBeenCalled();
  });

  it('should propagate application errors from document processing unchanged', async () => {
    const thread = buildThread(0);
    startDocumentProcessingUseCase.execute.mockRejectedValue(
      new EmptyFileDataError('report.pdf'),
    );

    await expect(useCase.execute(buildCommand(thread))).rejects.toThrow(
      EmptyFileDataError,
    );

    expect(addSourceToThreadUseCase.execute).not.toHaveBeenCalled();
  });
});
