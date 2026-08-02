import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { AddFileSourceToThreadUseCase } from './add-file-source-to-thread.use-case';
import { AddFileSourceToThreadCommand } from './add-file-source-to-thread.command';
import type { FindThreadUseCase } from '../find-thread/find-thread.use-case';
import type { AddSourceToThreadUseCase } from '../add-source-to-thread/add-source-to-thread.use-case';
import type { StartFileSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/start-file-source-processing/start-file-source-processing.use-case';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { ThreadsConstants } from '../../../domain/threads.constants';
import { ThreadSourceLimitExceededError } from '../../threads.errors';
import type { SourceAssignment } from '../../../domain/thread-source-assignment.entity';
import type { Thread } from '../../../domain/thread.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';

describe('AddFileSourceToThreadUseCase', () => {
  const threadId = randomUUID();
  const thread = { id: threadId } as Thread;
  const file = {
    originalname: 'haushalt.xlsx',
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    path: '/uploads/upload-1',
  };

  let findThread: jest.Mocked<FindThreadUseCase>;
  let addSourceToThread: jest.Mocked<AddSourceToThreadUseCase>;
  let startFileSourceProcessing: jest.Mocked<StartFileSourceProcessingUseCase>;
  let deleteSources: jest.Mocked<DeleteSourcesUseCase>;
  let useCase: AddFileSourceToThreadUseCase;

  function source(id: UUID = randomUUID()): Source {
    return { id } as Source;
  }

  beforeEach(() => {
    findThread = {
      execute: jest.fn().mockResolvedValue({ thread }),
    } as unknown as jest.Mocked<FindThreadUseCase>;
    addSourceToThread = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AddSourceToThreadUseCase>;
    startFileSourceProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartFileSourceProcessingUseCase>;
    deleteSources = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteSourcesUseCase>;

    useCase = new AddFileSourceToThreadUseCase(
      findThread,
      addSourceToThread,
      startFileSourceProcessing,
      deleteSources,
    );
  });

  it('rejects a thread at the source cap before any processing starts', async () => {
    const fullThread = {
      id: threadId,
      sourceAssignments: Array.from(
        { length: ThreadsConstants.MAX_SOURCES },
        () => ({}) as SourceAssignment,
      ),
    } as Thread;
    findThread.execute.mockResolvedValue({
      thread: fullThread,
      isLongChat: false,
    });

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toBeInstanceOf(ThreadSourceLimitExceededError);
    expect(startFileSourceProcessing.execute).not.toHaveBeenCalled();
  });

  it('passes a capacity check that accounts for every sheet of a workbook', async () => {
    const nearCapThread = {
      id: threadId,
      sourceAssignments: Array.from(
        { length: ThreadsConstants.MAX_SOURCES - 1 },
        () => ({}) as SourceAssignment,
      ),
    } as Thread;
    findThread.execute.mockResolvedValue({
      thread: nearCapThread,
      isLongChat: false,
    });
    // One slot left, workbook has two sheets — the callback must throw.
    startFileSourceProcessing.execute.mockImplementation(
      (command: { ensureCapacityFor?: (count: number) => void }) => {
        command.ensureCapacityFor?.(2);
        return Promise.resolve([source(), source()]);
      },
    );

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toBeInstanceOf(ThreadSourceLimitExceededError);
    expect(addSourceToThread.execute).not.toHaveBeenCalled();
  });

  it('starts processing and attaches every created source to the thread', async () => {
    const first = source();
    const second = source();
    startFileSourceProcessing.execute.mockResolvedValue([first, second]);

    const result = await useCase.execute(
      new AddFileSourceToThreadCommand({ threadId, file }),
    );

    expect(result).toEqual([first, second]);
    expect(startFileSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ file }),
    );
    expect(addSourceToThread.execute).toHaveBeenCalledTimes(2);
    expect(addSourceToThread.execute).toHaveBeenCalledWith(
      expect.objectContaining({ thread, source: first }),
    );
  });

  it('deletes the pre-created sources when attaching to the thread fails', async () => {
    const first = source();
    const second = source();
    startFileSourceProcessing.execute.mockResolvedValue([first, second]);
    addSourceToThread.execute.mockRejectedValue(new Error('thread gone'));

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toThrow();

    expect(deleteSources.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [first.id, second.id] }),
    );
  });

  it('does not start processing when the thread does not exist', async () => {
    findThread.execute.mockRejectedValue(new Error('thread not found'));

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toThrow();
    expect(startFileSourceProcessing.execute).not.toHaveBeenCalled();
  });
});
