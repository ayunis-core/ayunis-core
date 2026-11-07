import type { Job, Worker } from 'bullmq';
import type { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import type { MyClsStore } from 'src/common/context/services/context.service';
import { ContextService } from 'src/common/context/services/context.service';
import type { RoutineExecutionJobData } from 'src/domain/routines/application/ports/routine-execution-queue.port';
import type { ExecuteRoutineUseCase } from 'src/domain/routines/application/use-cases/execute-routine/execute-routine.use-case';
import {
  TEST_ORG_ID,
  TEST_ROUTINE_ID,
  TEST_USER_ID,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineRunTrigger } from 'src/domain/routines/domain/routine-run-trigger.enum';
import { RoutineExecutionConsumer } from './routine-execution.consumer';

jest.mock('src/domain/sources/infrastructure/queue/job-telemetry', () => ({
  observeJob: (_job: unknown, run: () => Promise<unknown>) => run(),
}));

describe('RoutineExecutionConsumer', () => {
  const executeRoutine = { execute: jest.fn() };
  const job = {
    id: 'routine-44444444-4444-4444-8444-444444444444-2026-11-07-0732',
    data: {
      routineId: TEST_ROUTINE_ID,
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      trigger: RoutineRunTrigger.SCHEDULED,
    },
  } as Job<RoutineExecutionJobData>;

  const consumer = (routinesEnabled: boolean, workerConcurrency = 3) => {
    const instance = new RoutineExecutionConsumer(
      new ContextService(new AsyncLocalStorage<MyClsStore>()),
      executeRoutine as unknown as ExecuteRoutineUseCase,
      {
        get: (key: string, fallback?: unknown) => {
          if (key === 'features.routinesEnabled') return routinesEnabled;
          if (key === 'routines.workerConcurrency') return workerConcurrency;
          return fallback;
        },
      } as unknown as ConfigService,
    );
    const worker = {
      concurrency: 1,
      run: jest.fn().mockResolvedValue(undefined),
    };
    (instance as unknown as { _worker: Partial<Worker> })._worker = worker;
    return { instance, worker };
  };

  beforeEach(() => jest.resetAllMocks());

  it('starts taking routine runs with the configured concurrency', () => {
    const { instance, worker } = consumer(true, 3);

    instance.onApplicationBootstrap();

    expect(worker.concurrency).toBe(3);
    expect(worker.run).toHaveBeenCalledTimes(1);
  });

  it('takes no routine runs while routines are disabled', () => {
    const { instance, worker } = consumer(false);

    instance.onApplicationBootstrap();

    expect(worker.run).not.toHaveBeenCalled();
  });

  it('executes the routine of the job with its trigger', async () => {
    executeRoutine.execute.mockResolvedValue({ status: 'succeeded' });

    await consumer(true).instance.process(job);

    expect(executeRoutine.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: TEST_ROUTINE_ID,
        trigger: RoutineRunTrigger.SCHEDULED,
        executionKey: job.id,
      }),
    );
  });

  it('fails the job when the execution fails unexpectedly', async () => {
    executeRoutine.execute.mockRejectedValue(new Error('database gone'));

    await expect(consumer(true).instance.process(job)).rejects.toThrow(
      'database gone',
    );
  });
});
