import type { Job, Queue, Worker } from 'bullmq';
import type { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import type { MyClsStore } from 'src/common/context/services/context.service';
import { ContextService } from 'src/common/context/services/context.service';
import type { SweepDueRoutinesUseCase } from 'src/domain/routines/application/use-cases/sweep-due-routines/sweep-due-routines.use-case';
import { RoutineSweepConsumer } from './routine-sweep.consumer';

jest.mock('src/domain/sources/infrastructure/queue/job-telemetry', () => ({
  observeJob: (_job: unknown, run: () => Promise<unknown>) => run(),
}));

describe('RoutineSweepConsumer', () => {
  const sweepDueRoutines = { execute: jest.fn() };
  const queue = { upsertJobScheduler: jest.fn() };

  const consumer = (routinesEnabled: boolean) => {
    const instance = new RoutineSweepConsumer(
      new ContextService(new AsyncLocalStorage<MyClsStore>()),
      sweepDueRoutines as unknown as SweepDueRoutinesUseCase,
      queue as unknown as Queue,
      {
        get: (key: string) =>
          key === 'features.routinesEnabled' ? routinesEnabled : undefined,
      } as unknown as ConfigService,
    );
    const worker = { run: jest.fn().mockResolvedValue(undefined) };
    (instance as unknown as { _worker: Partial<Worker> })._worker = worker;
    return { instance, worker };
  };

  beforeEach(() => {
    jest.resetAllMocks();
    queue.upsertJobScheduler.mockResolvedValue(undefined);
  });

  it('schedules one sweep a minute and starts sweeping when routines are enabled', () => {
    const { instance, worker } = consumer(true);

    instance.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'sweep-due-routines',
      { every: 60_000 },
      expect.objectContaining({ name: 'sweep-due-routines' }),
    );
    expect(worker.run).toHaveBeenCalledTimes(1);
  });

  it('neither schedules nor runs sweeps while routines are disabled', () => {
    const { instance, worker } = consumer(false);

    instance.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
    expect(worker.run).not.toHaveBeenCalled();
  });

  it('sweeps against the current time', async () => {
    sweepDueRoutines.execute.mockResolvedValue({
      started: 0,
      skipped: 0,
      interrupted: 0,
    });
    const before = Date.now();

    await consumer(true).instance.process({ id: '1' } as Job);

    const [command] = sweepDueRoutines.execute.mock.calls[0] as [{ now: Date }];
    expect(command.now.getTime()).toBeGreaterThanOrEqual(before);
  });
});
