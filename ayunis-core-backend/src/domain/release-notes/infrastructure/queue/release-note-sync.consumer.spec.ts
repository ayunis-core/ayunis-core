import type { Job, Queue, Worker } from 'bullmq';
import type { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import type { MyClsStore } from 'src/common/context/services/context.service';
import { ContextService } from 'src/common/context/services/context.service';
import type { SyncReleaseNotesUseCase } from 'src/domain/release-notes/application/use-cases/sync-release-notes/sync-release-notes.use-case';
import { ReleaseNoteSyncConsumer } from './release-note-sync.consumer';

jest.mock('src/domain/sources/infrastructure/queue/job-telemetry', () => ({
  observeJob: (_job: unknown, run: () => Promise<unknown>) => run(),
}));

describe('ReleaseNoteSyncConsumer', () => {
  const syncReleaseNotes = { execute: jest.fn() };
  const queue = { upsertJobScheduler: jest.fn() };

  /** `releaseNotesEnabled` needs routines on and an Announcable org ID. */
  const consumer = (releaseNotesEnabled: boolean) => {
    const instance = new ReleaseNoteSyncConsumer(
      new ContextService(new AsyncLocalStorage<MyClsStore>()),
      syncReleaseNotes as unknown as SyncReleaseNotesUseCase,
      queue as unknown as Queue,
      {
        get: (key: string) =>
          key === 'features.releaseNotesEnabled'
            ? releaseNotesEnabled
            : undefined,
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

  it('schedules one sync an hour and starts syncing with release notes on', () => {
    const { instance, worker } = consumer(true);

    instance.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'sync-release-notes',
      { every: 3_600_000 },
      expect.objectContaining({ name: 'sync-release-notes' }),
    );
    expect(worker.run).toHaveBeenCalledTimes(1);
  });

  it('neither schedules nor runs syncs without an Announcable org ID or with routines off', () => {
    const { instance, worker } = consumer(false);

    instance.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
    expect(worker.run).not.toHaveBeenCalled();
  });

  it('boots although the sync cannot be scheduled', async () => {
    queue.upsertJobScheduler.mockRejectedValue(
      new Error('connect ECONNREFUSED'),
    );
    const { instance } = consumer(true);

    expect(() => instance.onApplicationBootstrap()).not.toThrow();
    await new Promise(process.nextTick);
  });

  it('syncs the release notes for each job', async () => {
    syncReleaseNotes.execute.mockResolvedValue(null);

    await consumer(true).instance.process({
      id: '1',
    } as Job);

    expect(syncReleaseNotes.execute).toHaveBeenCalledTimes(1);
  });

  it('fails the job when the sync fails', async () => {
    syncReleaseNotes.execute.mockRejectedValue(new Error('feed unavailable'));

    await expect(
      consumer(true).instance.process({ id: '1' } as Job),
    ).rejects.toThrow('feed unavailable');
  });
});
