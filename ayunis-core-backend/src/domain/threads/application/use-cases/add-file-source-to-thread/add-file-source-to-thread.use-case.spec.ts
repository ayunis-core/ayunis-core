import * as fs from 'fs';
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
import type { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import type { StartDataSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/start-data-source-processing/start-data-source-processing.use-case';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { UnsupportedFileTypeError } from 'src/domain/sources/application/sources.errors';
import { ThreadsConstants } from '../../../domain/threads.constants';
import { ThreadSourceLimitExceededError } from '../../threads.errors';
import type { SourceAssignment } from '../../../domain/thread-source-assignment.entity';
import type { Thread } from '../../../domain/thread.entity';
import type { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';

describe('AddFileSourceToThreadUseCase', () => {
  const threadId = randomUUID();
  const thread = { id: threadId } as Thread;

  let findThread: jest.Mocked<FindThreadUseCase>;
  let addSourceToThread: jest.Mocked<AddSourceToThreadUseCase>;
  let startDocumentProcessing: jest.Mocked<StartDocumentProcessingUseCase>;
  let startDataSourceProcessing: jest.Mocked<StartDataSourceProcessingUseCase>;
  let deleteSources: jest.Mocked<DeleteSourcesUseCase>;
  let useCase: AddFileSourceToThreadUseCase;
  let readFile: jest.SpyInstance;

  function dataSource(id: UUID = randomUUID()): CSVDataSource {
    return { id } as CSVDataSource;
  }

  beforeEach(() => {
    findThread = {
      execute: jest.fn().mockResolvedValue({ thread }),
    } as unknown as jest.Mocked<FindThreadUseCase>;
    addSourceToThread = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AddSourceToThreadUseCase>;
    startDocumentProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDocumentProcessingUseCase>;
    startDataSourceProcessing = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDataSourceProcessingUseCase>;
    deleteSources = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteSourcesUseCase>;
    readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(Buffer.from('file-bytes'));

    useCase = new AddFileSourceToThreadUseCase(
      findThread,
      addSourceToThread,
      startDocumentProcessing,
      startDataSourceProcessing,
      deleteSources,
    );
  });

  afterEach(() => {
    readFile.mockRestore();
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
    const file = {
      originalname: 'bericht.pdf',
      mimetype: 'application/pdf',
      path: '/uploads/upload-0',
    };

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toBeInstanceOf(ThreadSourceLimitExceededError);
    expect(startDocumentProcessing.execute).not.toHaveBeenCalled();
    expect(startDataSourceProcessing.execute).not.toHaveBeenCalled();
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
    startDataSourceProcessing.execute.mockImplementation(
      (command: { ensureCapacityFor?: (count: number) => void }) => {
        command.ensureCapacityFor?.(2);
        return Promise.resolve([dataSource(), dataSource()]);
      },
    );
    const file = {
      originalname: 'haushalt.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-7',
    };

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toBeInstanceOf(ThreadSourceLimitExceededError);
    expect(addSourceToThread.execute).not.toHaveBeenCalled();
  });

  it('starts async CSV processing and attaches the source to the thread', async () => {
    const created = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([created]);
    const file = {
      originalname: 'einwohner.csv',
      mimetype: 'text/csv',
      path: '/uploads/upload-1',
    };

    const result = await useCase.execute(
      new AddFileSourceToThreadCommand({ threadId, file }),
    );

    expect(result).toEqual([created]);
    expect(startDataSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'einwohner.csv', kind: 'csv' }),
    );
    expect(addSourceToThread.execute).toHaveBeenCalledWith(
      expect.objectContaining({ thread, source: created }),
    );
  });

  it('attaches every pre-created sheet source of a spreadsheet upload', async () => {
    const first = dataSource();
    const second = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([first, second]);
    const file = {
      originalname: 'haushalt.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-2',
    };

    const result = await useCase.execute(
      new AddFileSourceToThreadCommand({ threadId, file }),
    );

    expect(result).toEqual([first, second]);
    expect(startDataSourceProcessing.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'haushalt.xlsx',
        kind: 'spreadsheet',
      }),
    );
    expect(addSourceToThread.execute).toHaveBeenCalledTimes(2);
  });

  it('starts document processing for a PDF and attaches the source', async () => {
    const created = { id: randomUUID() } as FileSource;
    startDocumentProcessing.execute.mockResolvedValue(created);
    const file = {
      originalname: 'satzung.pdf',
      mimetype: 'application/pdf',
      path: '/uploads/upload-4',
    };

    const result = await useCase.execute(
      new AddFileSourceToThreadCommand({ threadId, file }),
    );

    expect(result).toEqual([created]);
    expect(addSourceToThread.execute).toHaveBeenCalledWith(
      expect.objectContaining({ thread, source: created }),
    );
  });

  it('deletes the pre-created sources when attaching to the thread fails', async () => {
    const first = dataSource();
    const second = dataSource();
    startDataSourceProcessing.execute.mockResolvedValue([first, second]);
    addSourceToThread.execute.mockRejectedValue(new Error('thread gone'));
    const file = {
      originalname: 'haushalt.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      path: '/uploads/upload-6',
    };

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toThrow();

    expect(deleteSources.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [first.id, second.id] }),
    );
  });

  it('rejects unsupported file types without touching the thread', async () => {
    const file = {
      originalname: 'video.mp4',
      mimetype: 'video/mp4',
      path: '/uploads/upload-5',
    };

    await expect(
      useCase.execute(new AddFileSourceToThreadCommand({ threadId, file })),
    ).rejects.toThrow(UnsupportedFileTypeError);
    expect(addSourceToThread.execute).not.toHaveBeenCalled();
    expect(startDataSourceProcessing.execute).not.toHaveBeenCalled();
  });
});
