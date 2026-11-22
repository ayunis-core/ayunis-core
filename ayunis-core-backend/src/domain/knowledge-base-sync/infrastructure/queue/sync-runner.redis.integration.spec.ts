import { randomUUID, type UUID } from 'crypto';
import {
  Queue,
  UnrecoverableError,
  Worker,
  type Job,
  type WorkerOptions,
} from 'bullmq';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import {
  CONNECTOR_ID,
  createSyncHarness,
  featureConfig,
  KNOWLEDGE_BASE_ID,
  ORG_ID,
} from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { FinishLocationSyncUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/finish-location-sync/finish-location-sync.use-case';
import { PauseSyncedLocationUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/pause-synced-location/pause-synced-location.use-case';
import { SyncDueLocationsUseCase } from 'src/domain/knowledge-base-sync/application/use-cases/sync-due-locations/sync-due-locations.use-case';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import { SYNC_INTERVALS_MS } from 'src/domain/knowledge-base-sync/domain/sync-schedule';
import { SyncedLocationProvider } from 'src/domain/knowledge-base-sync/domain/synced-location-provider.enum';
import {
  KNOWLEDGE_BASE_SYNC_QUEUE,
  SYNCED_FILE_JOB,
} from './knowledge-base-sync.constants';
import { SyncRunner } from './sync-runner';
import { SyncRunsProducer, syncRunJobId } from './sync-runs.producer';
import { SyncedFileJobsProducer } from './synced-file-jobs.producer';
import { SyncedFileProcessingConsumer } from './synced-file-processing.consumer';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const redisPort = process.env.QUEUE_TELEMETRY_REDIS_PORT;
const describeRedis = redisPort ? describe : describe.skip;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check: () => boolean, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('Timed out');
    await sleep(20);
  }
}

type Harness = ReturnType<typeof createSyncHarness>;

/**
 * Backend instances on one Redis: each with its own queue client, sync
 * runner and worker, all running the sync engine on the same in-memory
 * locations. Files are "processed" by `processFile`.
 */
describeRedis('location syncs against real Redis', () => {
  const connection = {
    host: '127.0.0.1',
    port: Number(redisPort),
    password: process.env.QUEUE_TELEMETRY_REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };
  const consumerOptions = Reflect.getMetadata(
    'bullmq:worker_metadata',
    SyncedFileProcessingConsumer,
  ) as WorkerOptions;
  let prefix: string;
  let instances: { queue: Queue; worker: Worker; runs: SyncRunsProducer }[];

  beforeEach(() => {
    prefix = `sync-runner-test-${randomUUID()}`;
    instances = [];
  });

  afterEach(async () => {
    for (const { worker } of instances) await worker.close();
    await instances[0]?.queue.obliterate({ force: true });
    for (const { queue } of instances) await queue.close();
  });

  function startInstance(
    harness: Harness,
    processFile: (job: Job<SyncedFileJobData>) => Promise<void>,
    options: { name?: string; connectorsEnabled?: boolean } = {},
  ) {
    const features = featureConfig(options.connectorsEnabled ?? true);
    const queue = new Queue(KNOWLEDGE_BASE_SYNC_QUEUE, { connection, prefix });
    const runs = new SyncRunsProducer(queue);
    const runner = new SyncRunner(
      queue,
      { run: <T>(work: () => T) => work(), set: () => undefined } as never,
      harness.syncLocation,
      harness.nextBatch,
      new FinishLocationSyncUseCase(harness.repository),
      new PauseSyncedLocationUseCase(harness.repository, {} as never),
      new SyncDueLocationsUseCase(harness.repository, runs, features),
      new SyncedFileJobsProducer(
        { execute: () => Promise.resolve() } as never,
        queue,
      ),
      features,
    );
    const worker = new Worker(
      KNOWLEDGE_BASE_SYNC_QUEUE,
      (job: Job, token?: string) =>
        runner.handles(job)
          ? runner.process(job, token)
          : processFile(job as Job<SyncedFileJobData>),
      {
        ...consumerOptions,
        connection,
        prefix,
        name: options.name,
        concurrency: 2,
      },
    );
    instances.push({ queue, worker, runs });
    return { runner, runs };
  }

  function addLocation(harness: Harness): ConnectorSyncedLocation {
    const location = new ConnectorSyncedLocation({
      orgId: ORG_ID,
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      connectorId: CONNECTOR_ID,
      location: `https://municipality.sharepoint.com/sites/${randomUUID()}`,
    });
    void harness.repository.create(location);
    return location;
  }

  it('never runs a location twice at once across two instances, however often its sync is due or asked for', async () => {
    const harness = createSyncHarness();
    const locations = [harness.location, addLocation(harness)];
    const running = new Map<UUID, number>();
    const runs = new Map<UUID, number>();
    const runningAtOnce: number[] = [];
    const listLocation = harness.syncLocation.execute.bind(
      harness.syncLocation,
    );
    harness.syncLocation.execute = async (command) => {
      const id = command.locationId;
      running.set(id, (running.get(id) ?? 0) + 1);
      runningAtOnce.push(running.get(id)!);
      runs.set(id, (runs.get(id) ?? 0) + 1);
      await sleep(100);
      try {
        return await listLocation(command);
      } finally {
        running.set(id, running.get(id)! - 1);
      }
    };
    const claimDue = harness.repository.claimDue.bind(harness.repository);
    let sweeps = 0;
    harness.repository.claimDue = (...args) => {
      sweeps++;
      return claimDue(...args);
    };
    const first = startInstance(harness, () => Promise.resolve(), {
      name: 'first',
    });
    const second = startInstance(harness, () => Promise.resolve(), {
      name: 'second',
    });
    const startedAt = Date.now();
    await Promise.all([
      first.runner.schedule(250),
      second.runner.schedule(250),
    ]);

    while (Date.now() - startedAt < 2_000) {
      // "Sync now" from both instances at once.
      await Promise.all(
        [first.runs, second.runs].map((producer) =>
          producer.enqueue(
            locations.map((location) => ({
              orgId: location.orgId,
              locationId: location.id,
            })),
          ),
        ),
      );
      await sleep(30);
    }
    const elapsed = Date.now() - startedAt;
    await waitFor(() => [...running.values()].every((count) => count === 0));

    expect(Math.max(...runningAtOnce)).toBe(1);
    for (const location of locations)
      expect(runs.get(location.id)).toBeGreaterThanOrEqual(3);
    // One sweep per interval for both instances together.
    expect(sweeps).toBeGreaterThanOrEqual(2);
    expect(sweeps).toBeLessThanOrEqual(Math.ceil(elapsed / 250) + 2);
  }, 30_000);

  it('feeds a large listing in batches, each only once the previous one is processed, also past a file that fails for good', async () => {
    const harness = createSyncHarness();
    for (let index = 0; index < 45; index++)
      harness.system.add(`Massentest/Datei ${index}.txt`);
    const batches: UUID[][] = [];
    const nextBatch = harness.nextBatch.execute.bind(harness.nextBatch);
    harness.nextBatch.execute = async (query) => {
      const batch = await nextBatch(query);
      if (batch.length > 0) batches.push(batch.map((job) => job.syncedFileId));
      return batch;
    };
    const started = new Map<UUID, number>();
    const ended = new Map<UUID, number>();
    let failing: UUID | null = null;
    const { runs } = startInstance(harness, async (job) => {
      if (job.name !== SYNCED_FILE_JOB) throw new Error(job.name);
      const { syncedFileId, version } = job.data;
      started.set(syncedFileId, Date.now());
      await sleep(5);
      ended.set(syncedFileId, Date.now());
      failing ??= syncedFileId;
      if (failing === syncedFileId) throw new UnrecoverableError('broken');
      harness.repository.files
        .get(syncedFileId)!
        .recordProcessed(version, null);
    });

    await runs.enqueue([{ orgId: ORG_ID, locationId: harness.location.id }]);
    await waitFor(() => batches.length === 3 && ended.size === 45);
    await waitFor(
      () =>
        harness.repository.locations.get(harness.location.id)?.syncingSince ===
        null,
    );

    expect(batches.map((batch) => batch.length)).toEqual([20, 20, 5]);
    for (let index = 1; index < batches.length; index++) {
      const previousEnd = Math.max(
        ...batches[index - 1].map((id) => ended.get(id)!),
      );
      const nextStart = Math.min(
        ...batches[index].map((id) => started.get(id)!),
      );
      expect(nextStart).toBeGreaterThanOrEqual(previousEnd);
    }
    const location = harness.repository.locations.get(harness.location.id)!;
    expect(location.nextSyncAt.getTime()).toBeGreaterThan(
      Date.now() + SYNC_INTERVALS_MS[SyncedLocationProvider.CONNECTOR] - 60_000,
    );
    expect(
      await instances[0].queue.getJob(syncRunJobId(harness.location.id)),
    ).toBeUndefined();
  }, 30_000);

  it('starts a sync ahead of the files other syncs queued before it', async () => {
    const harness = createSyncHarness();
    for (let index = 0; index < 12; index++)
      harness.system.add(`Satzungen/Satzung ${index}.pdf`);
    const busy = harness.location;
    const asked = addLocation(harness);
    let filesProcessed = 0;
    let filesProcessedBeforeAsked: number | null = null;
    const listLocation = harness.syncLocation.execute.bind(
      harness.syncLocation,
    );
    harness.syncLocation.execute = (command) => {
      if (command.locationId === asked.id)
        filesProcessedBeforeAsked ??= filesProcessed;
      return listLocation(command);
    };
    const { runs } = startInstance(harness, async (job) => {
      await sleep(50);
      filesProcessed++;
      harness.repository.files
        .get(job.data.syncedFileId)!
        .recordProcessed(job.data.version, null);
    });
    await runs.enqueue([{ orgId: ORG_ID, locationId: busy.id }]);
    await waitFor(() => harness.filesOf().length === 12);

    await runs.enqueue([{ orgId: ORG_ID, locationId: asked.id }]);
    await waitFor(() => filesProcessedBeforeAsked !== null);

    expect(filesProcessedBeforeAsked).toBeLessThanOrEqual(4);
  }, 30_000);

  it('registers no schedule with connectors switched off, and removes one registered before', async () => {
    const harness = createSyncHarness();
    const on = startInstance(harness, () => Promise.resolve());
    await on.runner.schedule();
    expect(await instances[0].queue.getJobSchedulers()).toHaveLength(1);

    const off = startInstance(harness, () => Promise.resolve(), {
      connectorsEnabled: false,
    });
    await off.runner.schedule();

    expect(await instances[0].queue.getJobSchedulers()).toEqual([]);
  }, 30_000);

  it('waits out the pause a throttling connector asks for, then syncs', async () => {
    const harness = createSyncHarness();
    harness.system.add('Hundesteuer.pdf');
    harness.system.throttledUntil = new Date(Date.now() + 500);
    const processed: UUID[] = [];
    const { runs } = startInstance(harness, (job) => {
      processed.push(job.data.syncedFileId);
      harness.repository.files
        .get(job.data.syncedFileId)!
        .recordProcessed(job.data.version, null);
      return Promise.resolve();
    });

    await runs.enqueue([{ orgId: ORG_ID, locationId: harness.location.id }]);
    await waitFor(() => harness.system.listings === 1);
    const delayed = await instances[0].queue.getJob(
      syncRunJobId(harness.location.id),
    );
    expect(await delayed?.getState()).toBe('delayed');
    harness.system.throttledUntil = null;
    await waitFor(() => processed.length === 1);

    expect(harness.knowledgeBase.names()).toEqual(['Hundesteuer.pdf']);
  }, 30_000);
});
