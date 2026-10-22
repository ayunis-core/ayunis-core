import { Appsignal } from '@appsignal/nodejs';
import type { UUID } from 'crypto';
import type { Job } from 'bullmq';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { FileType } from 'src/domain/sources/domain/source-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { FileTooLargeError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentProcessingConsumer } from './document-processing.consumer';
import { StaleProcessingCleanupTask } from 'src/domain/sources/infrastructure/tasks/stale-processing-cleanup.task';
import { SourceProcessingHeartbeatService } from './source-processing-heartbeat.service';
import { ExtractionJobRunner } from './extraction-job-runner.service';
import { InMemoryDocumentExtractionAdapter } from 'src/domain/sources/infrastructure/extraction/in-memory-document-extraction.adapter';
import type { ExtractionConfig } from 'src/config/extraction.config';
import { Readable } from 'stream';

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { metrics: jest.fn() } },
  setTag: jest.fn(),
}));

const metrics = {
  addDistributionValue: jest.fn(),
  incrementCounter: jest.fn(),
};

function pdfBytes() {
  return (async function* () {
    yield Buffer.from('pdf-bytes');
  })();
}

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
    sha256: 'abc',
    fileSizeBytes: 9,
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
  const job = {
    data: makeJobData(),
    id: 'job-1',
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as unknown as Job<DocumentProcessingJobData>;
  job.updateData = (data) => {
    job.data = data;
    return Promise.resolve();
  };
  return job;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const deleteObjectUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

const sourceRepository = {
  findById: jest.fn(),
  save: jest.fn().mockImplementation((s: unknown) => Promise.resolve(s)),
  refreshProcessingHeartbeat: jest.fn().mockResolvedValue(true),
  saveTextSource: jest
    .fn<Promise<unknown>, [unknown, { text: string }]>()
    .mockResolvedValue(undefined),
  updateStatusConditionally: jest.fn(),
};

const spreadsheetParser = {
  parseWorkbook: jest.fn(),
  parseCsv: jest.fn(),
};

const helper = {
  index: jest.fn().mockResolvedValue({ embeddingMs: 0, indexingMs: 0 }),
  markFailed: jest.fn().mockResolvedValue(undefined),
  cleanupIndex: jest.fn().mockResolvedValue(undefined),
};

const admitOrgProcessing = {
  execute: jest.fn().mockResolvedValue(true),
};

const purgeStoragePrefixesUseCase = {
  execute: jest.fn().mockResolvedValue({ deletedCount: 0, failedCount: 0 }),
};

const DISABLED: ExtractionConfig = {
  url: undefined,
  token: undefined,
  requestTimeoutMs: 1000,
  pollIntervalMs: 5,
};
const ENABLED: ExtractionConfig = { ...DISABLED, url: 'https://extraction' };

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('DocumentProcessingConsumer', () => {
  let consumer: DocumentProcessingConsumer;
  let extractionAdapter: InMemoryDocumentExtractionAdapter;

  function buildConsumer(config: ExtractionConfig): DocumentProcessingConsumer {
    return new DocumentProcessingConsumer(
      contextService as never,
      retrieveFileContentUseCase as never,
      splitTextUseCase as never,
      downloadObjectUseCase as never,
      deleteObjectUseCase as never,
      sourceRepository as never,
      helper as never,
      spreadsheetParser as never,
      admitOrgProcessing as never,
      new SourceProcessingHeartbeatService(sourceRepository as never),
      new ExtractionJobRunner(
        extractionAdapter,
        sourceRepository as never,
        downloadObjectUseCase as never,
        purgeStoragePrefixesUseCase as never,
        config,
        { processingMaxPdfPages: 1000 } as never,
      ),
      config,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(true);
    sourceRepository.saveTextSource.mockResolvedValue(undefined);
    admitOrgProcessing.execute.mockResolvedValue(true);
    extractionAdapter = new InMemoryDocumentExtractionAdapter();

    consumer = buildConsumer(DISABLED);
  });

  it.each([
    ['doc.pdf', 'application/pdf'],
    [
      'Vorlage.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ['Nachricht.eml', 'message/rfc822'],
    ['Nachricht.msg', 'application/vnd.ms-outlook'],
    ['Notiz.txt', 'text/plain'],
  ])(
    'never contacts the extraction service for %s while EXTRACTION_SERVICE_URL is unset',
    async (fileName, fileType) => {
      sourceRepository.findById.mockResolvedValue(makeSource());
      sourceRepository.updateStatusConditionally.mockResolvedValue(true);

      await consumer.process(
        makeJob({ data: makeJobData({ fileName, fileType }) }),
      );

      expect(extractionAdapter.startCalls).toHaveLength(0);
      expect(retrieveFileContentUseCase.execute).toHaveBeenCalledTimes(1);
      expect(retrieveFileContentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ fileName, fileType }),
      );
      expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ objectName: MINIO_PATH }),
      );
      expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
    },
  );

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
    expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
    expect(deleteObjectUseCase.execute).toHaveBeenCalled();
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
  });

  it('rethrows the original error on the final attempt', async () => {
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

  it('should skip saving and clean up when source is deleted mid-processing', async () => {
    const source = makeSource(SourceStatus.PROCESSING);

    // First findById (loadSourceOrSkip) returns the source
    // Second findById (isSourceStillProcessing) returns null — deleted
    sourceRepository.findById
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    // saveTextSource should never be called — we aborted before writing
    expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
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

    // saveTextSource should have been called (source was still processing at check time)
    expect(sourceRepository.saveTextSource).toHaveBeenCalled();
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

    expect(sourceRepository.saveTextSource).toHaveBeenCalled();
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

  it('reports per-stage timings, file size and page count when a document completes', async () => {
    const logger = createLoggerMock();
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);
    downloadObjectUseCase.execute.mockResolvedValueOnce(pdfBytes());
    retrieveFileContentUseCase.execute.mockResolvedValueOnce({
      pages: [{ text: 'Seite 1' }, { text: 'Seite 2' }],
      conversionMs: 40,
    });
    helper.index.mockResolvedValueOnce({ embeddingMs: 300, indexingMs: 20 });

    await consumer.process(makeJob());

    expect(contextService.set).toHaveBeenCalledWith('sourceId', SOURCE_ID);
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: SOURCE_ID,
        fileType: 'pdf',
        fileSizeBytes: 9,
        pageCount: 2,
        chunks: 1,
        downloadMs: expect.any(Number),
        conversionMs: 40,
        extractionMs: expect.any(Number),
        chunkingMs: expect.any(Number),
        persistMs: expect.any(Number),
        embeddingMs: 300,
        indexingMs: 20,
        totalMs: expect.any(Number),
      }),
      'Document processing complete',
    );
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'document_processing_stage_duration_ms',
      300,
      { stage: 'embedding', file_type: 'pdf' },
    );
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'document_processing_file_size_bytes',
      9,
      { file_type: 'pdf' },
    );
    expect(metrics.addDistributionValue).toHaveBeenCalledWith(
      'document_processing_page_count',
      2,
      { file_type: 'pdf' },
    );
  });

  it('names the stage that failed', async () => {
    const logger = createLoggerMock();
    const source = makeSource(SourceStatus.PROCESSING);
    sourceRepository.findById.mockResolvedValue(source);
    retrieveFileContentUseCase.execute.mockRejectedValueOnce(
      new FileTooLargeError(),
    );

    await consumer.process(makeJob());

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: SOURCE_ID,
        failedStage: 'extraction',
        elapsedMs: expect.any(Number),
      }),
      'Document processing failed',
    );
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
    sourceRepository.saveTextSource.mockImplementation(async (_, content) => {
      savedText = content.text;
      return source;
    });
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

    const [saved] = sourceRepository.saveTextSource.mock.calls[0];
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
      expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
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

  describe('with the extraction service configured', () => {
    const RESULT_KEY = `${ORG_ID}/processing/${SOURCE_ID}/extraction/result.json`;
    const KEY = `v1:${SOURCE_ID}:abc`;
    let inputBytesRead: number;

    function resultRef(pageCount: number) {
      return {
        bucket: 'ayunis',
        key: RESULT_KEY,
        bytes: 1,
        sha256: 'r',
        pageCount,
      };
    }

    function resultJson(texts: string[]): string {
      return JSON.stringify({
        schemaVersion: 1,
        jobId: 'j',
        idempotencyKey: KEY,
        document: {
          fileName: 'doc.pdf',
          pageCount: texts.length,
          warnings: [],
        },
        pages: texts.map((text, index) => ({
          index,
          number: index + 1,
          text,
          method: 'text',
          ocrReason: null,
        })),
      });
    }

    function inputStream(bytes: number): Readable {
      const chunk = Buffer.alloc(64 * 1024);
      let sent = 0;
      return new Readable({
        read() {
          if (sent >= bytes) {
            this.push(null);
            return;
          }
          sent += chunk.length;
          inputBytesRead += chunk.length;
          this.push(chunk);
        },
      });
    }

    async function startedJob(): Promise<string> {
      await sleep(2);
      const job = extractionAdapter.findByKey(KEY);
      if (!job) throw new Error('extraction job was not started');
      return job.jobId;
    }

    beforeEach(() => {
      inputBytesRead = 0;
      consumer = buildConsumer(ENABLED);
      sourceRepository.findById.mockResolvedValue(makeSource());
      sourceRepository.updateStatusConditionally.mockResolvedValue(true);
      downloadObjectUseCase.execute.mockImplementation(
        (command: { objectName: string }) =>
          Promise.resolve(
            command.objectName === RESULT_KEY
              ? Readable.from([Buffer.from(resultJson(['Seite 1', 'Seite 2']))])
              : inputStream(9),
          ),
      );
    });

    it('polls the job, records progress, indexes the result and purges the prefix', async () => {
      const logger = createLoggerMock();
      const processing = consumer.process(makeJob());
      const jobId = await startedJob();
      extractionAdapter.run(jobId);
      extractionAdapter.progress(jobId, { pagesTotal: 2, pagesDone: 1 });
      await sleep(12);
      extractionAdapter.succeed(jobId, resultRef(2));
      await processing;

      expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
      expect(inputBytesRead).toBe(0);
      expect(sourceRepository.refreshProcessingHeartbeat).toHaveBeenCalledWith(
        SOURCE_ID,
        { pagesTotal: 2, pagesDone: 1 },
      );
      expect(sourceRepository.saveTextSource.mock.calls[0][1].text).toBe(
        'Seite 1\nSeite 2',
      );
      expect(helper.index).toHaveBeenCalledTimes(1);
      expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
        SOURCE_ID,
        SourceStatus.PROCESSING,
        SourceStatus.READY,
        { processingError: null },
      );
      expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prefixes: [`${ORG_ID}/processing/${SOURCE_ID}/`],
        }),
      );
      expect(extractionAdapter.jobCount).toBe(0);
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          fileType: 'pdf',
          fileSizeBytes: 9,
          pageCount: 2,
          extractionMs: expect.any(Number),
        }),
        'Document processing complete',
      );
    });

    it('reconnects a retried attempt to the running job instead of starting a second one', async () => {
      const job = makeJob();
      const first = consumer.process(job);
      const jobId = await startedJob();
      extractionAdapter.run(jobId);
      await sleep(6);
      extractionAdapter.fail(jobId, {
        code: 'OCR_UNAVAILABLE',
        message: 'mistral down',
        retryable: true,
      });
      await expect(first).rejects.toMatchObject({
        name: 'JobRetryScheduledError',
      });
      expect(helper.markFailed).not.toHaveBeenCalled();
      expect(extractionAdapter.jobCount).toBe(1);

      job.attemptsMade = 1;
      const second = consumer.process(job);
      await sleep(2);
      expect(extractionAdapter.findByKey(KEY)).toMatchObject({
        jobId,
        state: 'queued',
        attempt: 2,
      });
      extractionAdapter.succeed(jobId, resultRef(2));
      await second;

      expect(extractionAdapter.startCalls).toHaveLength(2);
      expect(
        new Set(extractionAdapter.startCalls.map((c) => c.idempotencyKey)).size,
      ).toBe(1);
      expect(helper.index).toHaveBeenCalledTimes(1);
      expect(extractionAdapter.jobCount).toBe(0);
    });

    it('picks up the job a previous backend process started before it died mid-poll', async () => {
      const earlier = await extractionAdapter.start({
        idempotencyKey: KEY,
        owner: { orgId: ORG_ID, sourceId: SOURCE_ID },
        input: { key: MINIO_PATH, sha256: 'abc' },
        fileName: 'doc.pdf',
        declaredMimeType: 'application/pdf',
        outputKeyPrefix: `${ORG_ID}/processing/${SOURCE_ID}/extraction/`,
      });
      extractionAdapter.run(earlier.jobId);

      const processing = consumer.process(
        makeJob({ attemptsMade: 1 } as never),
      );
      await sleep(6);
      extractionAdapter.succeed(earlier.jobId, resultRef(2));
      await processing;

      expect(extractionAdapter.startCalls).toHaveLength(2);
      expect(extractionAdapter.startCalls[1].idempotencyKey).toBe(KEY);
      expect(helper.index).toHaveBeenCalledTimes(1);
    });

    it('indexes nothing and leaves the source alone when the job is cancelled', async () => {
      const processing = consumer.process(makeJob());
      const jobId = await startedJob();
      extractionAdapter.run(jobId);
      await extractionAdapter.cancel(jobId);
      extractionAdapter.succeed(jobId, resultRef(2));
      await processing;

      expect(helper.index).not.toHaveBeenCalled();
      expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
      expect(helper.markFailed).not.toHaveBeenCalled();
    });

    it('ends the attempt without a restart when source deletion released the job', async () => {
      const job = makeJob();
      const processing = consumer.process(job);
      const jobId = await startedJob();
      extractionAdapter.run(jobId);
      await extractionAdapter.releaseOwner({
        orgId: ORG_ID,
        sourceIds: [SOURCE_ID],
      });
      await expect(processing).resolves.toBeUndefined();

      expect(extractionAdapter.startCalls).toHaveLength(1);
      expect(extractionAdapter.jobCount).toBe(0);
      expect(helper.index).not.toHaveBeenCalled();
      expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
      expect(helper.markFailed).not.toHaveBeenCalled();
    });

    it('exits and purges when the heartbeat reports the source gone mid-poll', async () => {
      const processing = consumer.process(makeJob());
      const jobId = await startedJob();
      extractionAdapter.run(jobId);
      sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(false);
      await processing;

      expect(helper.index).not.toHaveBeenCalled();
      expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
      expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prefixes: [`${ORG_ID}/processing/${SOURCE_ID}/`],
        }),
      );
      expect(extractionAdapter.jobCount).toBe(0);
    });

    it('settles a document the service cannot read without retrying', async () => {
      const processing = consumer.process(makeJob());
      const jobId = await startedJob();
      extractionAdapter.fail(jobId, {
        code: 'UNPROCESSABLE_DOCUMENT',
        message: 'encrypted',
        retryable: false,
      });

      await expect(processing).resolves.toBeUndefined();
      expect(helper.markFailed).toHaveBeenCalledWith(
        SOURCE_ID,
        expect.objectContaining({ code: 'UNPROCESSABLE_DOCUMENT' }),
      );
      expect(helper.index).not.toHaveBeenCalled();
      expect(extractionAdapter.jobCount).toBe(0);
      expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalled();
    });

    it('processes a 200 MB object without the API ever reading the file', async () => {
      const size = 200 * 1024 * 1024;
      downloadObjectUseCase.execute.mockImplementation(
        (command: { objectName: string }) =>
          Promise.resolve(
            command.objectName === RESULT_KEY
              ? Readable.from([Buffer.from(resultJson(['Seite 1']))])
              : inputStream(size),
          ),
      );
      const before = process.memoryUsage();

      const processing = consumer.process(
        makeJob({ data: makeJobData({ fileSizeBytes: size }) }),
      );
      const jobId = await startedJob();
      extractionAdapter.succeed(jobId, resultRef(1));
      await processing;

      const after = process.memoryUsage();
      expect(inputBytesRead).toBe(0);
      expect(
        after.heapUsed +
          after.arrayBuffers -
          before.heapUsed -
          before.arrayBuffers,
      ).toBeLessThan(64 * 1024 * 1024);
      expect(helper.index).toHaveBeenCalledTimes(1);
      expect(metrics.addDistributionValue).toHaveBeenCalledWith(
        'document_processing_file_size_bytes',
        size,
        { file_type: 'pdf' },
      );
    });

    it.each([
      [
        'Vorlage.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      [
        'Folien.pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
      ['Nachricht.eml', 'message/rfc822'],
      ['Nachricht.msg', 'application/vnd.ms-outlook'],
      ['Notiz.txt', 'text/plain'],
      ['Notiz.md', 'text/markdown'],
    ])(
      'routes %s through the service and never the in-process parsers',
      async (fileName, fileType) => {
        const processing = consumer.process(
          makeJob({ data: makeJobData({ fileName, fileType }) }),
        );
        const jobId = await startedJob();
        extractionAdapter.succeed(jobId, resultRef(1));
        await processing;

        expect(extractionAdapter.startCalls).toHaveLength(1);
        expect(extractionAdapter.startCalls[0]).toMatchObject({
          fileName,
          declaredMimeType: fileType,
        });
        expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
        expect(sourceRepository.saveTextSource).toHaveBeenCalled();
      },
    );

    it.each([
      [
        'Tabelle.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      ['Aufnahme.mp3', 'audio/mpeg'],
    ])('keeps %s on the in-process path', async (fileName, fileType) => {
      spreadsheetParser.parseWorkbook.mockResolvedValue([
        { sheetName: 'Fees', headers: ['Permit'], rows: [['Use']] },
      ]);

      await consumer.process(
        makeJob({ data: makeJobData({ fileName, fileType }) }),
      );

      expect(extractionAdapter.startCalls).toHaveLength(0);
      expect(deleteObjectUseCase.execute).toHaveBeenCalled();
    });
  });
});
