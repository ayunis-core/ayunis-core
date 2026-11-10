import { StoredFileMismatchError } from 'src/domain/sources/application/sources.errors';
import type { UUID } from 'crypto';
import type { Job } from 'bullmq';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import {
  FileTooLargeError,
  TooManyPagesError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentProcessingConsumer } from './document-processing.consumer';
import { StaleProcessingCleanupTask } from 'src/domain/sources/infrastructure/tasks/stale-processing-cleanup.task';
import { SourceProcessingHeartbeatService } from 'src/domain/sources/application/services/source-processing-heartbeat.service';

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
  execute: jest.fn().mockResolvedValue({ pages: [{ text: 'hello world' }] }),
};

const preflightCheckUseCase = {
  execute: jest.fn().mockResolvedValue(undefined),
};

const splitTextUseCase = {
  execute: jest.fn().mockReturnValue({
    chunks: [{ text: 'hello world', metadata: { start: 0 } }],
  }),
};

const storedFiles = {
  read: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
  readRetained: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
  readToFile: jest.fn().mockResolvedValue({ size: 1234, sha256: 'abc' }),
  readRetainedToFile: jest
    .fn()
    .mockResolvedValue({ size: 1234, sha256: 'abc' }),
};

const deleteObjectUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

const checkpoints = {
  create: () => undefined,
  cleanup: jest.fn().mockResolvedValue(undefined),
};

const sourceRepository = {
  findById: jest.fn(),
  save: jest.fn().mockImplementation((s: unknown) => Promise.resolve(s)),
  refreshProcessingHeartbeat: jest.fn().mockResolvedValue(true),
  saveProcessingTextSourceContent: jest
    .fn<Promise<unknown>, [unknown, { text: string }]>()
    .mockResolvedValue(undefined),
  updateStatusConditionally: jest.fn(),
};

const spreadsheetParser = {
  parseWorkbook: jest.fn(),
  parseCsv: jest.fn(),
};

const helper = {
  index: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
  cleanupIndex: jest.fn().mockResolvedValue(undefined),
};

const admitOrgProcessing = {
  execute: jest.fn().mockResolvedValue(true),
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('DocumentProcessingConsumer worker', () => {
  it('runs four document jobs at once per instance', () => {
    expect(
      Reflect.getMetadata('bullmq:worker_metadata', DocumentProcessingConsumer),
    ).toMatchObject({ concurrency: 4 });
  });
});

describe('DocumentProcessingConsumer', () => {
  let consumer: DocumentProcessingConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(true);
    sourceRepository.saveProcessingTextSourceContent.mockResolvedValue(true);
    admitOrgProcessing.execute.mockResolvedValue(true);

    consumer = new DocumentProcessingConsumer(
      contextService as never,
      retrieveFileContentUseCase as never,
      preflightCheckUseCase as never,
      splitTextUseCase as never,
      storedFiles as never,
      deleteObjectUseCase as never,
      sourceRepository as never,
      helper as never,
      spreadsheetParser as never,
      admitOrgProcessing as never,
      new SourceProcessingHeartbeatService(sourceRepository as never),
      checkpoints as never,
      { tempDirectory: undefined } as never,
    );
  });

  it('cleans saved results when a resumed source has already failed', async () => {
    sourceRepository.findById.mockResolvedValue(
      makeSource(SourceStatus.FAILED),
    );
    await consumer.process(makeJob());
    expect(checkpoints.cleanup).toHaveBeenCalledWith(ORG_ID, SOURCE_ID);
    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
  });

  it('does not index when deletion wins the final content update', async () => {
    sourceRepository.findById.mockResolvedValue(makeSource());
    sourceRepository.saveProcessingTextSourceContent.mockResolvedValueOnce(
      false,
    );
    await consumer.process(makeJob());
    expect(helper.index).not.toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
    expect(checkpoints.cleanup).toHaveBeenCalledWith(ORG_ID, SOURCE_ID);
  });

  it('skips work when deletion wins before processing admission', async () => {
    admitOrgProcessing.execute.mockResolvedValue(false);

    await consumer.process(makeJob());

    expect(sourceRepository.findById).not.toHaveBeenCalled();
    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
  });

  it('skips processing when the queued source can no longer be claimed', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(false);

    await consumer.process(makeJob());

    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    expect(
      sourceRepository.saveProcessingTextSourceContent,
    ).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('rethrows as JobRetryScheduledError when retries remain, so AppSignal ignores the attempt', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    storedFiles.readToFile.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(consumer.process(makeJob())).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).not.toHaveBeenCalled();
  });

  it('rethrows the original error on the final attempt', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    storedFiles.readToFile.mockRejectedValueOnce(
      new Error('MinIO object not found'),
    );

    await expect(
      consumer.process(makeJob({ attemptsMade: 2 } as never)),
    ).rejects.toMatchObject({
      name: 'Error',
      message: 'MinIO object not found',
    });
    expect(helper.markFailed).toHaveBeenCalled();
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
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('fails the source before OCR when the preflight rejects the file', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    preflightCheckUseCase.execute.mockRejectedValueOnce(
      new TooManyPagesError({ fileName: 'doc.pdf', pageCount: 2, maxPages: 1 }),
    );

    await expect(consumer.process(makeJob())).resolves.toBeUndefined();

    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    expect(helper.markFailed).toHaveBeenCalledWith(
      SOURCE_ID,
      expect.any(TooManyPagesError),
    );
  });

  it('reads the original at the size and identity verified at completion', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(
      makeJob({
        data: makeJobData({
          retainFile: true,
          expectedSize: 1234,
          expectedETag: 'verified',
        }),
      } as never),
    );

    expect(storedFiles.readRetainedToFile).toHaveBeenCalledWith(
      MINIO_PATH,
      expect.stringContaining('ayunis-documents'),
      1234,
      'verified',
    );
    expect(storedFiles.readRetained).not.toHaveBeenCalled();
    expect(storedFiles.readToFile).not.toHaveBeenCalled();
  });

  it('hands a PDF to the page check and the retriever as a file on disk, never as bytes', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const localFile = expect.objectContaining({
      path: expect.stringContaining('ayunis-documents'),
      size: 1234,
      sha256: 'abc',
    }) as unknown;
    expect(storedFiles.read).not.toHaveBeenCalled();
    expect(preflightCheckUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ localFile, fileData: Buffer.alloc(0) }),
    );
    expect(retrieveFileContentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ localFile, fileData: Buffer.alloc(0) }),
    );
  });

  it('stages an office document on disk like a PDF', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(
      makeJob({
        data: makeJobData({
          fileName: 'Beschlussvorlage.docx',
          fileType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      } as never),
    );

    expect(storedFiles.readToFile).toHaveBeenCalled();
    expect(storedFiles.read).not.toHaveBeenCalled();
    expect(retrieveFileContentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'Beschlussvorlage.docx',
        localFile: expect.objectContaining({ size: 1234 }) as unknown,
      }),
    );
  });

  it('streams a recording to disk and transcribes it from that path', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(
      makeJob({
        data: makeJobData({
          retainFile: true,
          expectedSize: 1234,
          expectedETag: 'verified',
          fileName: 'sitzung.mp3',
          fileType: 'audio/mpeg',
        }),
      } as never),
    );

    expect(storedFiles.readRetainedToFile).toHaveBeenCalledWith(
      MINIO_PATH,
      expect.stringContaining('download-'),
      1234,
      'verified',
    );
    expect(storedFiles.readRetained).not.toHaveBeenCalled();
    expect(retrieveFileContentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        localFile: expect.objectContaining({ size: 1234, sha256: 'abc' }),
        fileName: 'sitzung.mp3',
      }),
    );
  });

  it('fails the source without OCR when the stored file no longer matches', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    storedFiles.readRetainedToFile.mockRejectedValueOnce(
      new StoredFileMismatchError(MINIO_PATH),
    );

    await expect(
      consumer.process(
        makeJob({
          data: makeJobData({
            retainFile: true,
            expectedSize: 1234,
            expectedETag: 'verified',
          }),
        } as never),
      ),
    ).resolves.toBeUndefined();

    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    expect(helper.markFailed).toHaveBeenCalledWith(
      SOURCE_ID,
      expect.any(StoredFileMismatchError),
    );
  });

  it('keeps a directly uploaded original in storage after processing', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(
      makeJob({
        data: makeJobData({
          retainFile: true,
          expectedSize: 1234,
          expectedETag: 'verified',
        }),
      } as never),
    );

    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('keeps a directly uploaded original when processing fails for good', async () => {
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    retrieveFileContentUseCase.execute.mockRejectedValueOnce(
      new FileTooLargeError(),
    );

    await consumer.process(
      makeJob({
        data: makeJobData({
          retainFile: true,
          expectedSize: 1234,
          expectedETag: 'verified',
        }),
      } as never),
    );

    expect(helper.markFailed).toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should skip saving and clean up when source is deleted mid-processing', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // First findById (loadSourceOrSkip) returns the source
    // Second findById (isSourceStillProcessing) returns null — deleted
    sourceRepository.findById
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    // saveProcessingTextSourceContent should never be called — we aborted before writing
    expect(
      sourceRepository.saveProcessingTextSourceContent,
    ).not.toHaveBeenCalled();
    // updateStatusConditionally should never be called either
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    // MinIO file should be cleaned up
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
  });

  it('should skip marking ready when conditional update returns false', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // Both findById calls return the source (still processing)
    sourceRepository.findById.mockResolvedValue(source);
    // But the conditional update fails — source was deleted between check and update
    sourceRepository.updateStatusConditionally.mockResolvedValue(false);

    await consumer.process(makeJob());

    // saveProcessingTextSourceContent should have been called (source was still processing at check time)
    expect(sourceRepository.saveProcessingTextSourceContent).toHaveBeenCalled();
    // Conditional update was attempted
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    // Partial index should be cleaned up since update failed
    expect(helper.cleanupIndex).toHaveBeenCalledWith(SOURCE_ID);
  });

  it('should process normally when source exists throughout', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    expect(sourceRepository.saveProcessingTextSourceContent).toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    // Chunks are indexed via the shared helper (delete-then-bulk-ingest)
    expect(helper.index).toHaveBeenCalledTimes(1);
    const [indexedSourceId, indexedOrgId, indexedChunks] =
      helper.index.mock.calls[0];
    expect(indexedSourceId).toBe(SOURCE_ID);
    expect(indexedOrgId).toBe(ORG_ID);
    expect(indexedChunks).toHaveLength(1);
    expect(indexedChunks[0].content).toBe('hello world');
  });

  it('saves a long-running email even when stale cleanup runs during extraction', async () => {
    jest.useFakeTimers();
    const source = makeSource();
    let savedText: string | undefined;
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.refreshProcessingHeartbeat.mockImplementation(async () => {
      if (source.status !== SourceStatus.PROCESSING) return false;
      source.processingStartedAt = new Date();
      return true;
    });
    sourceRepository.saveProcessingTextSourceContent.mockImplementation(
      async (_, content) => {
        savedText = content.text;
        return true;
      },
    );
    sourceRepository.updateStatusConditionally.mockImplementation(async () => {
      source.status = SourceStatus.READY;
      return true;
    });
    retrieveFileContentUseCase.execute.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                pages: [
                  { text: 'Email body and extracted attachment content' },
                ],
              }),
            16 * 60 * 1000,
          ),
        ),
    );
    const cleanup = new StaleProcessingCleanupTask(
      {
        findStaleProcessingSourceIds: async (cutoff: Date) =>
          source.status === SourceStatus.PROCESSING &&
          source.processingStartedAt! < cutoff
            ? [SOURCE_ID]
            : [],
      } as never,
      {
        execute: async () => {
          source.status = SourceStatus.FAILED;
        },
      } as never,
    );
    const cleanupTimer = setTimeout(
      () => {
        void cleanup.handleCleanup();
      },
      15.5 * 60 * 1000,
    );
    try {
      const processing = consumer.process(
        makeJob({
          data: makeJobData({
            fileName: 'meeting.eml',
            fileType: 'message/rfc822',
          }),
        }),
      );
      await jest.advanceTimersByTimeAsync(16 * 60 * 1000);
      await processing;
      expect(source.status).toBe(SourceStatus.READY);
      expect(savedText).toBe('Email body and extracted attachment content');
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      clearTimeout(cleanupTimer);
      jest.useRealTimers();
    }
  });

  it('saves the fresh source state rather than the pre-extraction snapshot', async () => {
    const initial = makeSource();
    const fresh = makeSource();
    fresh.processingStartedAt = new Date(
      initial.processingStartedAt!.getTime() + 16 * 60 * 1000,
    );
    sourceRepository.findById
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(fresh);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const [saved] =
      sourceRepository.saveProcessingTextSourceContent.mock.calls[0];
    expect((saved as FileSource).processingStartedAt).toEqual(
      fresh.processingStartedAt,
    );
  });

  it.each([SourceStatus.FAILED, SourceStatus.READY])(
    'preserves a source changed to %s during extraction',
    async (status) => {
      sourceRepository.findById
        .mockResolvedValueOnce(makeSource())
        .mockResolvedValueOnce(makeSource(status));
      await consumer.process(makeJob());
      expect(
        sourceRepository.saveProcessingTextSourceContent,
      ).not.toHaveBeenCalled();
      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
      expect(deleteObjectUseCase.execute).toHaveBeenCalled();
      expect(checkpoints.cleanup).toHaveBeenCalledWith(ORG_ID, SOURCE_ID);
    },
  );

  it('flattens a workbook to text and never calls the file retriever', async () => {
    sourceRepository.findById.mockResolvedValue(
      makeSource(SourceStatus.PROCESSING),
    );
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);
    spreadsheetParser.parseWorkbook.mockResolvedValue([
      { sheetName: 'Fees', headers: ['Permit', 'Cost'], rows: [['Use', '50']] },
      { sheetName: 'Rooms', headers: ['Room'], rows: [['A1']] },
    ]);

    await consumer.process(
      makeJob({
        data: makeJobData({
          fileName: 'fees.xlsx',
          fileType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      }),
    );

    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    expect(splitTextUseCase.execute.mock.calls[0][0].text).toBe(
      '## Fees\nPermit: Use | Cost: 50\n\n## Rooms\nRoom: A1',
    );
  });

  it('flattens CSV without a sheet title', async () => {
    sourceRepository.findById.mockResolvedValue(
      makeSource(SourceStatus.PROCESSING),
    );
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);
    spreadsheetParser.parseCsv.mockResolvedValue({
      headers: ['Permit', 'Cost'],
      rows: [['Use', '50']],
    });

    await consumer.process(
      makeJob({
        data: makeJobData({ fileName: 'fees.csv', fileType: 'text/csv' }),
      }),
    );

    expect(splitTextUseCase.execute.mock.calls[0][0].text).toBe(
      'Permit: Use | Cost: 50',
    );
  });
});
