import type { Job } from 'bullmq';
import { createHash } from 'crypto';
import type { UUID } from 'crypto';
import { Readable } from 'stream';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import { InMemoryDocumentExtractionAdapter } from 'src/domain/sources/infrastructure/extraction/in-memory-document-extraction.adapter';
import { ExtractionJobRunner } from './extraction-job-runner.service';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;
const MINIO_PATH = `${ORG_ID}/processing/${SOURCE_ID}/doc.pdf`;
const RESULT_KEY = `${ORG_ID}/processing/${SOURCE_ID}/extraction/result.json`;

function makeJob(
  overrides: Partial<DocumentProcessingJobData> = {},
): Job<DocumentProcessingJobData> {
  const job = {
    id: SOURCE_ID,
    attemptsMade: 0,
    data: {
      sourceId: SOURCE_ID,
      orgId: ORG_ID,
      userId: USER_ID,
      minioPath: MINIO_PATH,
      sha256: 'abc',
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
      ...overrides,
    },
  } as unknown as Job<DocumentProcessingJobData>;
  job.updateData = (data) => {
    job.data = data;
    return Promise.resolve();
  };
  return job;
}

const resultJson = JSON.stringify({
  schemaVersion: 1,
  jobId: 'job-1',
  idempotencyKey: 'k',
  document: { fileName: 'doc.pdf', pageCount: 1, warnings: [] },
  pages: [
    { index: 0, number: 1, text: 'Seite 1', method: 'text', ocrReason: null },
  ],
});

describe(ExtractionJobRunner.name, () => {
  let adapter: InMemoryDocumentExtractionAdapter;
  let runner: ExtractionJobRunner;
  const sourceRepository = { refreshProcessingHeartbeat: jest.fn() };
  const downloadObjectUseCase = { execute: jest.fn() };
  const purgeStoragePrefixesUseCase = { execute: jest.fn() };

  function settle(jobId: string, transition: () => void, afterMs = 8) {
    setTimeout(transition, afterMs);
    return jobId;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new InMemoryDocumentExtractionAdapter();
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(true);
    downloadObjectUseCase.execute.mockImplementation(
      (command: { objectName: string }) =>
        Promise.resolve(
          Readable.from(
            command.objectName === RESULT_KEY
              ? [Buffer.from(resultJson)]
              : [Buffer.from('pdf-bytes')],
          ),
        ),
    );
    purgeStoragePrefixesUseCase.execute.mockResolvedValue({
      deletedCount: 0,
      failedCount: 0,
    });
    runner = new ExtractionJobRunner(
      adapter,
      sourceRepository as never,
      downloadObjectUseCase as never,
      purgeStoragePrefixesUseCase as never,
      {
        url: 'https://extraction:8000',
        token: undefined,
        requestTimeoutMs: 1,
        pollIntervalMs: 5,
      },
      { processingMaxPdfPages: 1000 } as never,
    );
  });

  it('starts the job per contract and records the job id on the BullMQ job', async () => {
    const job = makeJob();
    const run = runner.run(job);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const started = adapter.findByKey(`v1:${SOURCE_ID}:abc`)!;
    adapter.succeed(started.jobId, {
      bucket: 'ayunis',
      key: RESULT_KEY,
      bytes: 1,
      sha256: 'r',
      pageCount: 1,
    });

    const outcome = await run;

    expect(outcome.kind).toBe('succeeded');
    expect(adapter.startCalls[0]).toMatchObject({
      idempotencyKey: `v1:${SOURCE_ID}:abc`,
      owner: { orgId: ORG_ID, sourceId: SOURCE_ID },
      input: { key: MINIO_PATH, sha256: 'abc' },
      outputKeyPrefix: `${ORG_ID}/processing/${SOURCE_ID}/extraction/`,
      options: { maxPages: 1000 },
    });
    expect(job.data.extractionJobId).toBe(started.jobId);
  });

  it('hashes the staged object for a job enqueued before the hash was recorded', async () => {
    const job = makeJob({ sha256: undefined });
    const expected = createHash('sha256').update('pdf-bytes').digest('hex');
    const run = runner.run(job);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const started = adapter.findByKey(`v1:${SOURCE_ID}:${expected}`);
    expect(started).toBeDefined();
    adapter.fail(started!.jobId, {
      code: 'UNPROCESSABLE_DOCUMENT',
      message: 'corrupt',
      retryable: false,
    });

    await expect(run).rejects.toBeInstanceOf(UnprocessableDocumentError);
    expect(job.data.sha256).toBe(expected);
  });

  it('refreshes the heartbeat with page progress on every poll', async () => {
    const run = runner.run(makeJob());
    await new Promise((resolve) => setTimeout(resolve, 2));
    const { jobId } = adapter.findByKey(`v1:${SOURCE_ID}:abc`)!;
    adapter.run(jobId);
    adapter.progress(jobId, { pagesTotal: 12, pagesDone: 3 });
    await new Promise((resolve) => setTimeout(resolve, 12));
    adapter.succeed(jobId, {
      bucket: 'ayunis',
      key: RESULT_KEY,
      bytes: 1,
      sha256: 'r',
      pageCount: 12,
    });
    await run;

    expect(sourceRepository.refreshProcessingHeartbeat).toHaveBeenCalledWith(
      SOURCE_ID,
      { pagesTotal: 12, pagesDone: 3 },
    );
  });

  it('abandons the attempt when the heartbeat says the source is gone', async () => {
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(false);
    const run = runner.run(makeJob());
    await new Promise((resolve) => setTimeout(resolve, 2));
    adapter.run(adapter.findByKey(`v1:${SOURCE_ID}:abc`)!.jobId);

    await expect(run).resolves.toEqual({ kind: 'abandoned' });
  });

  it('ends the attempt when the job was released, even while the source row still looks alive', async () => {
    const run = runner.run(makeJob());
    await new Promise((resolve) => setTimeout(resolve, 2));
    settle(adapter.findByKey(`v1:${SOURCE_ID}:abc`)!.jobId, () => {
      void adapter.releaseOwner({ orgId: ORG_ID, sourceIds: [SOURCE_ID] });
    });

    await expect(run).resolves.toEqual({ kind: 'released' });
    expect(adapter.startCalls).toHaveLength(1);
    expect(adapter.jobCount).toBe(0);
  });

  it('purges the prefix even when the service cannot release the job', async () => {
    const failing = {
      release: jest.fn().mockRejectedValue(new Error('service down')),
    };
    const isolated = new ExtractionJobRunner(
      failing as never,
      sourceRepository as never,
      downloadObjectUseCase as never,
      purgeStoragePrefixesUseCase as never,
      {
        url: 'https://extraction:8000',
        token: undefined,
        requestTimeoutMs: 1,
        pollIntervalMs: 5,
      },
      { processingMaxPdfPages: 1000 } as never,
    );

    await isolated.release(makeJob({ extractionJobId: 'job-9' }).data);

    expect(failing.release).toHaveBeenCalledWith('job-9');
    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('reports a cancelled job without a result', async () => {
    const run = runner.run(makeJob());
    await new Promise((resolve) => setTimeout(resolve, 2));
    const { jobId } = adapter.findByKey(`v1:${SOURCE_ID}:abc`)!;
    await adapter.cancel(jobId);

    await expect(run).resolves.toEqual({ kind: 'cancelled' });
  });

  it('releases the job and purges the whole processing prefix', async () => {
    await runner.release(makeJob({ extractionJobId: 'job-9' }).data);

    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        prefixes: [`${ORG_ID}/processing/${SOURCE_ID}/`],
      }),
    );
  });
});
