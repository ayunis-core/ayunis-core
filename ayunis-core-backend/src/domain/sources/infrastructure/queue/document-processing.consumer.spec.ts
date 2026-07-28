import type { UUID } from 'crypto';
import type { Job } from 'bullmq';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceProcessingStage } from 'src/domain/sources/domain/source-processing-progress';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import type { DocumentProcessingJobData } from '../../application/ports/document-processing.port';
import { FileTooLargeError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentProcessingConsumer } from './document-processing.consumer';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;
const MINIO_PATH = `${ORG_ID}/processing/${SOURCE_ID}/doc.pdf`;

function makeJobData(
  overrides?: Partial<DocumentProcessingJobData>,
): DocumentProcessingJobData {
  return {
    sourceId: SOURCE_ID,
    orgId: ORG_ID,
    userId: USER_ID,
    minioPath: MINIO_PATH,
    fileName: 'doc.pdf',
    fileType: 'application/pdf',
    ...overrides,
  };
}

function makeSource(status = SourceStatus.PROCESSING): FileSource {
  return new FileSource({
    id: SOURCE_ID,
    name: 'doc.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
    knowledgeBaseId: null,
    status,
    processingStartedAt: new Date(),
  });
}

function makeJob(
  overrides?: Partial<Job<DocumentProcessingJobData>>,
): Job<DocumentProcessingJobData> {
  return {
    data: makeJobData(),
    id: 'job-1',
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as unknown as Job<DocumentProcessingJobData>;
}

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

const contextService = {
  run: jest.fn((fn: () => Promise<void>) => fn()),
  set: jest.fn(),
};

const retrieveFileContentUseCase = {
  execute: jest
    .fn()
    .mockResolvedValue({ pages: [{ text: 'hello world', number: 1 }] }),
};

const splitTextUseCase = {
  execute: jest.fn().mockReturnValue({
    chunks: [{ text: 'hello world', metadata: { start: 0 } }],
  }),
};

const downloadObjectUseCase = {
  execute: jest.fn().mockResolvedValue(
    (async function* () {
      yield Buffer.from('pdf-bytes');
    })(),
  ),
};

const purgeStoragePrefixesUseCase = {
  execute: jest.fn().mockResolvedValue(undefined),
};

const sourceRepository = {
  findById: jest.fn(),
  save: jest.fn().mockImplementation((s: unknown) => Promise.resolve(s)),
  saveTextSource: jest
    .fn()
    .mockImplementation((s: unknown) => Promise.resolve(s)),
  updateStatusConditionally: jest.fn(),
  updateProcessingProgress: jest.fn().mockResolvedValue(true),
  refreshProcessingHeartbeat: jest.fn().mockResolvedValue(true),
};

const helper = {
  index: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
  cleanupIndex: jest.fn().mockResolvedValue(undefined),
};

const checkpointStore = {
  restore: jest.fn().mockResolvedValue([]),
  saveBatch: jest.fn().mockResolvedValue(undefined),
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('DocumentProcessingConsumer', () => {
  let consumer: DocumentProcessingConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
    checkpointStore.restore.mockResolvedValue([]);
    retrieveFileContentUseCase.execute.mockResolvedValue({
      pages: [{ text: 'hello world', number: 1 }],
    });
    downloadObjectUseCase.execute.mockResolvedValue(
      (async function* () {
        yield Buffer.from('pdf-bytes');
      })(),
    );

    consumer = new DocumentProcessingConsumer(
      contextService as never,
      retrieveFileContentUseCase as never,
      splitTextUseCase as never,
      downloadObjectUseCase as never,
      purgeStoragePrefixesUseCase as never,
      sourceRepository as never,
      helper as never,
      checkpointStore as never,
    );
  });

  it('rethrows as JobRetryScheduledError when retries remain, so AppSignal ignores the attempt', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    downloadObjectUseCase.execute.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(consumer.process(makeJob())).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).not.toHaveBeenCalled();
    // Checkpoints must survive for the retry — no purge on non-final attempts.
    expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
  });

  it('rethrows the original error on the final attempt and purges checkpoints', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    downloadObjectUseCase.execute.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(
      consumer.process(makeJob({ attemptsMade: 2 } as never)),
    ).rejects.toMatchObject({
      name: 'Error',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).toHaveBeenCalled();
    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalled();
  });

  it('completes without throwing when the file itself is the problem', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    retrieveFileContentUseCase.execute.mockRejectedValueOnce(
      new FileTooLargeError(),
    );

    // Completing rather than throwing is what keeps it out of AppSignal.
    await expect(consumer.process(makeJob())).resolves.toBeUndefined();
    expect(helper.markFailed).toHaveBeenCalled();
    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalled();
  });

  it('should skip saving and clean up when source is deleted mid-processing', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // First findById (loadSourceOrSkip) returns the source
    // Second findById (isSourceStillProcessing) returns null — deleted
    sourceRepository.findById
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalled();
  });

  it('should skip marking ready when conditional update returns false', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(false);

    await consumer.process(makeJob());

    expect(sourceRepository.saveTextSource).toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null, processingProgress: null },
    );
    expect(helper.cleanupIndex).toHaveBeenCalledWith(SOURCE_ID);
  });

  it('should process normally when source exists throughout', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    expect(sourceRepository.saveTextSource).toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null, processingProgress: null },
    );
    // The indexing stage is surfaced before the embed/index step
    expect(sourceRepository.updateProcessingProgress).toHaveBeenCalledWith(
      SOURCE_ID,
      { stage: SourceProcessingStage.INDEXING },
    );
    expect(helper.index).toHaveBeenCalledTimes(1);
    const [indexedSourceId, indexedOrgId, indexedChunks] =
      helper.index.mock.calls[0];
    expect(indexedSourceId).toBe(SOURCE_ID);
    expect(indexedOrgId).toBe(ORG_ID);
    expect(indexedChunks).toHaveLength(1);
    expect(indexedChunks[0].content).toBe('hello world');
  });

  it('passes checkpointed pages as skipPages and merges them into the final text', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);
    checkpointStore.restore.mockResolvedValue([
      { number: 1, text: 'Seite eins (checkpoint)' },
    ]);
    retrieveFileContentUseCase.execute.mockResolvedValue({
      pages: [{ text: 'Seite zwei (frisch)', number: 2 }],
    });

    await consumer.process(makeJob());

    const command = retrieveFileContentUseCase.execute.mock
      .calls[0][0] as RetrieveFileContentCommand;
    expect(command.skipPages).toEqual([0]);
    const splitInput = splitTextUseCase.execute.mock.calls[0][0] as {
      text: string;
    };
    expect(splitInput.text).toBe(
      'Seite eins (checkpoint)\nSeite zwei (frisch)',
    );
  });

  it('checkpoints every extracted batch and writes progress with it', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);
    retrieveFileContentUseCase.execute.mockImplementation(
      async (command: RetrieveFileContentCommand) => {
        await command.onBatchExtracted?.({
          pages: [{ text: 'Seite eins', number: 1 }] as never,
          processedPages: 1,
          totalPages: 2,
        });
        return { pages: [{ text: 'Seite eins', number: 1 }] };
      },
    );

    await consumer.process(makeJob());

    expect(checkpointStore.saveBatch).toHaveBeenCalledWith(
      `${ORG_ID}/processing/${SOURCE_ID}`,
      [{ number: 1, text: 'Seite eins' }],
    );
    expect(sourceRepository.updateProcessingProgress).toHaveBeenCalledWith(
      SOURCE_ID,
      {
        stage: SourceProcessingStage.EXTRACTING,
        processedPages: 1,
        totalPages: 2,
      },
    );
  });
});
