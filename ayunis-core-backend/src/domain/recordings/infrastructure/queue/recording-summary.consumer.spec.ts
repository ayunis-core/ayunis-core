import { AsyncLocalStorage } from 'async_hooks';
import type { Job, Worker } from 'bullmq';
import type { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { MyClsStore } from 'src/common/context/services/context.service';
import { ContextService } from 'src/common/context/services/context.service';
import { ProviderServerError } from 'src/common/errors/provider.errors';
import type { RecordingSummaryJobData } from 'src/domain/recordings/application/ports/recording-summary-queue.port';
import type { FailRecordingSummaryCommand } from 'src/domain/recordings/application/use-cases/fail-recording-summary/fail-recording-summary.command';
import type { FailRecordingSummaryUseCase } from 'src/domain/recordings/application/use-cases/fail-recording-summary/fail-recording-summary.use-case';
import type { GenerateRecordingSummaryUseCase } from 'src/domain/recordings/application/use-cases/generate-recording-summary/generate-recording-summary.use-case';
import { JobRetryScheduledError } from 'src/domain/sources/infrastructure/queue/bullmq-job.helpers';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';
import { RecordingSummaryConsumer } from './recording-summary.consumer';

jest.mock('src/domain/sources/infrastructure/queue/job-telemetry', () => ({
  observeJob: (_job: unknown, run: () => Promise<unknown>) => run(),
  recordJobFailure: jest.fn(),
  isFinalAttempt: (job: Job) =>
    job.attemptsMade + 1 >= (job.opts.attempts ?? 1),
}));

describe(RecordingSummaryConsumer.name, () => {
  const data: RecordingSummaryJobData = {
    recordingId: randomUUID(),
    runId: randomUUID(),
    orgId: randomUUID(),
    userId: randomUUID(),
  };

  function job(attemptsMade: number): Job<RecordingSummaryJobData> {
    return {
      id: data.runId,
      data,
      attemptsMade,
      opts: { attempts: 3 },
    } as Job<RecordingSummaryJobData>;
  }

  function consumer(options: { error?: Error; recordingsEnabled?: boolean }) {
    const failed: FailRecordingSummaryCommand[] = [];
    const instance = new RecordingSummaryConsumer(
      new ContextService(new AsyncLocalStorage<MyClsStore>()),
      {
        execute: () =>
          options.error ? Promise.reject(options.error) : Promise.resolve(),
      } as unknown as GenerateRecordingSummaryUseCase,
      {
        execute: (command: FailRecordingSummaryCommand) => {
          failed.push(command);
          return Promise.resolve();
        },
      } as unknown as FailRecordingSummaryUseCase,
      {
        get: (key: string, fallback?: unknown) => {
          if (key === 'features.recordingsEnabled')
            return options.recordingsEnabled ?? true;
          if (key === 'recordings.summaryConcurrency') return 3;
          return fallback;
        },
      } as unknown as ConfigService,
    );
    const worker = {
      concurrency: 1,
      run: jest.fn().mockResolvedValue(undefined),
    };
    (instance as unknown as { _worker: Partial<Worker> })._worker = worker;
    return { instance, worker, failed };
  }

  it('takes no summary jobs while recordings are disabled', () => {
    const { instance, worker } = consumer({ recordingsEnabled: false });

    instance.onApplicationBootstrap();

    expect(worker.run).not.toHaveBeenCalled();
  });

  it('fails a run at once, without retrying, when the budget of the org is used up', async () => {
    const error = new CreditBudgetExceededError();
    const { instance, failed } = consumer({ error });

    await expect(instance.process(job(0))).resolves.toBeUndefined();

    expect(failed).toEqual([
      expect.objectContaining({
        recordingId: data.recordingId,
        runId: data.runId,
        error,
      }),
    ]);
  });

  it('retries a provider outage and fails the run only after its last attempt', async () => {
    const error = new ProviderServerError({
      provider: 'mistral',
      modelId: 'mistral-large-latest',
    });
    const { instance, failed } = consumer({ error });

    await expect(instance.process(job(0))).rejects.toBeInstanceOf(
      JobRetryScheduledError,
    );
    expect(failed).toEqual([]);

    await expect(instance.process(job(2))).rejects.toBe(error);
    expect(failed).toEqual([expect.objectContaining({ error })]);
  });
});
