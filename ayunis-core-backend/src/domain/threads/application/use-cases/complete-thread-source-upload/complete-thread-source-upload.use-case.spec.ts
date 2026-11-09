jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { UUID } from 'crypto';
import { CompleteThreadSourceUploadUseCase } from './complete-thread-source-upload.use-case';
import { CompleteThreadSourceUploadCommand } from './complete-thread-source-upload.command';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { ThreadSourceLimitExceededError } from 'src/domain/threads/application/threads.errors';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';

const THREAD_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const UPLOAD_ID = '44444444-4444-4444-4444-444444444444' as UUID;
const USER_ID = '55555555-5555-5555-5555-555555555555' as UUID;
const ORG_ID = '66666666-6666-6666-6666-666666666666' as UUID;

function source(id: string): FileSource {
  return new FileSource({
    id: id as UUID,
    name: 'doc.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
    status: SourceStatus.PROCESSING,
  });
}

describe('CompleteThreadSourceUploadUseCase', () => {
  const findThread = { execute: jest.fn() };
  const completeUpload = { execute: jest.fn() };
  const threadsRepository = {
    attachSourcesWithinCapacity: jest.fn().mockResolvedValue(undefined),
  };
  const contextService = {
    get: jest.fn((key: string) => (key === 'userId' ? USER_ID : ORG_ID)),
  };
  const useCase = new CompleteThreadSourceUploadUseCase(
    findThread as never,
    completeUpload as never,
    threadsRepository as never,
    contextService as never,
  );
  const attached = source('00000000-0000-0000-0000-00000000000a');
  const fresh = source('00000000-0000-0000-0000-00000000000b');

  beforeEach(() => {
    jest.clearAllMocks();
    findThread.execute.mockResolvedValue({
      thread: {
        id: THREAD_ID,
        sourceAssignments: [new SourceAssignment({ source: attached })],
      },
    });
    completeUpload.execute.mockImplementation(
      async (cmd: { attach: (sources: FileSource[]) => Promise<void> }) => {
        await cmd.attach([fresh]);
        return { sources: [fresh], alreadyCompleted: false };
      },
    );
  });

  it('attaches all new sources in one locked batch inside the completion transaction', async () => {
    const second = source('00000000-0000-0000-0000-00000000000c');
    completeUpload.execute.mockImplementation(
      async (cmd: { attach: (sources: FileSource[]) => Promise<void> }) => {
        await cmd.attach([fresh, second]);
        return { sources: [fresh, second], alreadyCompleted: false };
      },
    );

    const result = await useCase.execute(
      new CompleteThreadSourceUploadCommand(THREAD_ID, UPLOAD_ID),
    );

    expect(threadsRepository.attachSourcesWithinCapacity).toHaveBeenCalledTimes(
      1,
    );
    expect(threadsRepository.attachSourcesWithinCapacity).toHaveBeenCalledWith({
      threadId: THREAD_ID,
      userId: USER_ID,
      sourceIds: [fresh.id, second.id],
      maxSources: ThreadsConstants.MAX_SOURCES,
    });
    expect(result).toEqual([fresh, second]);
  });

  it('checks the thread capacity for every source the upload will create', async () => {
    const full = Array.from(
      { length: ThreadsConstants.MAX_SOURCES },
      (_, i) =>
        new SourceAssignment({
          source: source(
            `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
          ),
        }),
    );
    findThread.execute.mockResolvedValue({
      thread: { id: THREAD_ID, sourceAssignments: full },
    });
    completeUpload.execute.mockImplementation(
      (cmd: { ensureCapacityFor: (n: number) => void }) => {
        cmd.ensureCapacityFor(1);
        return Promise.resolve({ sources: [], alreadyCompleted: false });
      },
    );

    await expect(
      useCase.execute(
        new CompleteThreadSourceUploadCommand(THREAD_ID, UPLOAD_ID),
      ),
    ).rejects.toBeInstanceOf(ThreadSourceLimitExceededError);
  });

  it('propagates attachment failure to the shared completion transaction', async () => {
    threadsRepository.attachSourcesWithinCapacity.mockRejectedValueOnce(
      new ThreadSourceLimitExceededError(ThreadsConstants.MAX_SOURCES),
    );

    await expect(
      useCase.execute(
        new CompleteThreadSourceUploadCommand(THREAD_ID, UPLOAD_ID),
      ),
    ).rejects.toBeInstanceOf(ThreadSourceLimitExceededError);
  });
});
