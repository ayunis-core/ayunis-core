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
  const addSourceToThread = { execute: jest.fn().mockResolvedValue(undefined) };
  const useCase = new CompleteThreadSourceUploadUseCase(
    findThread as never,
    completeUpload as never,
    addSourceToThread as never,
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

  it('attaches new sources through the completion transaction', async () => {
    const result = await useCase.execute(
      new CompleteThreadSourceUploadCommand(THREAD_ID, UPLOAD_ID),
    );

    expect(addSourceToThread.execute).toHaveBeenCalledTimes(1);
    expect(addSourceToThread.execute).toHaveBeenCalledWith(
      expect.objectContaining({ source: fresh }),
    );
    expect(result).toEqual([fresh]);
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
    const failure = new Error('attach failed');
    addSourceToThread.execute.mockRejectedValueOnce(failure);

    await expect(
      useCase.execute(
        new CompleteThreadSourceUploadCommand(THREAD_ID, UPLOAD_ID),
      ),
    ).rejects.toMatchObject({ code: expect.any(String) });
  });
});
