import { randomUUID } from 'crypto';
import { Queue, Worker, type Job, type WorkerOptions } from 'bullmq';
import {
  DocumentConversionTimeoutError,
  DocumentConverterBusyError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  classifyJobFailure,
  DOCUMENT_JOB_OPTIONS,
  type JobFailureOutcome,
} from './bullmq-job.helpers';
import { DocumentProcessingConsumer } from './document-processing.consumer';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';

const redisPort = process.env.QUEUE_TELEMETRY_REDIS_PORT;
const describeRedis = redisPort ? describe : describe.skip;

async function waitFor(check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('Queue transition timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

// BullMQ throws "Unknown backoff strategy" on the first retry when a job's
// backoff type has no strategy on the worker, and hands the previous attempt's
// failure to the next one only through Redis, so these run the options the
// producer enqueues against the settings the consumer registers.
describeRedis('document retry spacing against real Redis', () => {
  const connection = {
    host: '127.0.0.1',
    port: Number(redisPort),
    password: process.env.QUEUE_TELEMETRY_REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };
  let queue: Queue;
  let worker: Worker;
  let outcomes: JobFailureOutcome[];

  // Ends each attempt the way the consumer does, failing with the next error
  // in `failures` and succeeding once none is left.
  function start(failures: Error[]): void {
    const prefix = `retry-spacing-test-${randomUUID()}`;
    const consumerOptions = Reflect.getMetadata(
      'bullmq:worker_metadata',
      DocumentProcessingConsumer,
    ) as WorkerOptions;
    outcomes = [];
    queue = new Queue(DOCUMENT_PROCESSING_QUEUE, { connection, prefix });
    worker = new Worker(
      DOCUMENT_PROCESSING_QUEUE,
      (job: Job) => {
        const failure = failures.shift();
        if (!failure) return Promise.resolve();
        const outcome = classifyJobFailure(job, failure);
        outcomes.push(outcome);
        return outcome.rethrow
          ? Promise.reject(outcome.rethrow)
          : Promise.resolve();
      },
      { ...consumerOptions, connection, prefix },
    );
  }

  async function enqueueAndWaitForRetry(): Promise<Job> {
    const job = await queue.add('process-document', {}, DOCUMENT_JOB_OPTIONS);
    await waitFor(async () => (await job.getState()) === 'delayed');
    const delayed = await queue.getJob(job.id ?? '');
    if (!delayed) throw new Error('Job disappeared');
    return delayed;
  }

  async function runRetryNow(job: Job): Promise<void> {
    await job.promote();
    await waitFor(async () => (await job.getState()) === 'completed');
  }

  afterEach(async () => {
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
  });

  it('retries a document that found every converter replica occupied a minute later', async () => {
    start([new DocumentConverterBusyError('report.docx')]);

    const delayed = await enqueueAndWaitForRetry();

    expect(delayed.delay).toBe(60_000);
  }, 30_000);

  it('retries a timed-out conversion after 30 s and fails the document when the retry times out too', async () => {
    start([
      new DocumentConversionTimeoutError('report.docx'),
      new DocumentConversionTimeoutError('report.docx'),
    ]);

    const delayed = await enqueueAndWaitForRetry();
    expect(delayed.delay).toBe(30_000);
    await runRetryNow(delayed);

    expect(outcomes).toEqual([
      { final: false, rethrow: expect.any(Error) as Error },
      { final: true, rethrow: null },
    ]);
  }, 30_000);

  it('completes a document whose retry after a timeout converts', async () => {
    start([new DocumentConversionTimeoutError('report.docx')]);

    const delayed = await enqueueAndWaitForRetry();
    expect(delayed.delay).toBe(30_000);
    await runRetryNow(delayed);

    expect(outcomes).toHaveLength(1);
    expect((await queue.getJob(delayed.id ?? ''))?.attemptsMade).toBe(2);
  }, 30_000);

  it('gives a retry that finds every replica occupied the busy spacing and one more attempt', async () => {
    start([
      new DocumentConversionTimeoutError('report.docx'),
      new DocumentConverterBusyError('report.docx'),
      new DocumentConversionTimeoutError('report.docx'),
    ]);

    const afterTimeout = await enqueueAndWaitForRetry();
    await afterTimeout.promote();
    await waitFor(
      async () =>
        (await queue.getJob(afterTimeout.id ?? ''))?.delay === 120_000,
    );
    await runRetryNow(afterTimeout);

    expect(outcomes.map((outcome) => outcome.final)).toEqual([
      false,
      false,
      true,
    ]);
    expect(outcomes[2].rethrow).toBeNull();
  }, 30_000);
});
