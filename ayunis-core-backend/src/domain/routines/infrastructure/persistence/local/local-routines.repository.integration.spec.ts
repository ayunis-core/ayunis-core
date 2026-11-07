import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { aRoutine } from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import { LocalRoutinesRepository } from './local-routines.repository';
import { RoutineMapper } from './mappers/routine.mapper';
import { RoutineRecord } from './schema/routine.record';

// The table without its foreign keys, so the test needs no users or orgs.
const routineSchema = new EntitySchema<RoutineRecord>({
  name: 'RoutineRecord',
  target: RoutineRecord,
  tableName: 'routines',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    name: { type: String },
    prompt: { type: String },
    userId: { type: 'uuid' },
    orgId: { type: 'uuid' },
    modelId: { type: 'uuid', nullable: true },
    dailyTime: { type: String },
    internetEnabled: { type: Boolean },
    enabled: { type: Boolean },
    lastRunStatus: { type: String, nullable: true },
    lastRunAt: { type: 'timestamp', nullable: true },
    lastRunFailureReason: { type: String, nullable: true },
    consecutiveFailureCount: { type: 'int', default: 0 },
    nextRunAt: { type: 'timestamptz', nullable: true },
    lastRunStartedAt: { type: 'timestamptz', nullable: true },
    recentExecutionKeys: { type: String, array: true, default: () => "'{}'" },
    pausedAt: { type: 'timestamptz', nullable: true },
  },
});

describe('LocalRoutinesRepository (PostgreSQL)', () => {
  let db: DataSource;
  let repository: LocalRoutinesRepository;
  let schema: string;
  /** The manager the repository sees as the ambient transaction. */
  let ambient: EntityManager | undefined;

  beforeAll(async () => {
    schema = `routines_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [routineSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    repository = new LocalRoutinesRepository(
      db.getRepository(RoutineRecord),
      new RoutineMapper(),
      {
        get tx() {
          return ambient;
        },
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    ambient = undefined;
    await db.getRepository(RoutineRecord).clear();
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  async function stored(overrides: Parameters<typeof aRoutine>[0] = {}) {
    return repository.create(aRoutine({ id: randomUUID(), ...overrides }));
  }

  describe('markRunQueued', () => {
    it.each([null, RoutineRunStatus.SUCCEEDED, RoutineRunStatus.FAILED])(
      'queues a routine whose last status is %s',
      async (lastRunStatus) => {
        const routine = await stored({ lastRunStatus });

        await expect(repository.markRunQueued(routine.id)).resolves.toBe(true);
        expect(
          (await repository.findByIdForExecution(routine.id))?.lastRunStatus,
        ).toBe(RoutineRunStatus.QUEUED);
      },
    );

    it.each([RoutineRunStatus.QUEUED, RoutineRunStatus.RUNNING])(
      'keeps the status of a run that is already %s',
      async (lastRunStatus) => {
        const routine = await stored({ lastRunStatus });

        await expect(repository.markRunQueued(routine.id)).resolves.toBe(false);
        expect(
          (await repository.findByIdForExecution(routine.id))?.lastRunStatus,
        ).toBe(lastRunStatus);
      },
    );
  });

  describe('recordRunOutcome', () => {
    it('counts consecutive failures and keeps the reason', async () => {
      const routine = await stored({ consecutiveFailureCount: 1 });
      const finishedAt = new Date('2026-11-07T06:30:00.000Z');

      await repository.recordRunOutcome(
        routine.id,
        { status: 'failed', failureReason: 'timeout' },
        finishedAt,
      );

      expect(await repository.findByIdForExecution(routine.id)).toMatchObject({
        lastRunStatus: RoutineRunStatus.FAILED,
        lastRunFailureReason: 'timeout',
        consecutiveFailureCount: 2,
        lastRunAt: finishedAt,
      });
    });

    it('resets the failure count and reason on success', async () => {
      const routine = await stored({
        consecutiveFailureCount: 2,
        lastRunStatus: RoutineRunStatus.FAILED,
        lastRunFailureReason: 'timeout',
      });

      await repository.recordRunOutcome(
        routine.id,
        { status: 'succeeded' },
        new Date(),
      );

      expect(await repository.findByIdForExecution(routine.id)).toMatchObject({
        lastRunStatus: RoutineRunStatus.SUCCEEDED,
        lastRunFailureReason: null,
        consecutiveFailureCount: 0,
      });
    });

    it('records a skipped run with its reason, without counting a failure or pausing', async () => {
      const nextRunAt = new Date('2026-11-08T06:30:00.000Z');
      const routine = await stored({ consecutiveFailureCount: 2, nextRunAt });
      const finishedAt = new Date('2026-11-07T06:30:00.000Z');

      await expect(
        repository.recordRunOutcome(
          routine.id,
          { status: 'skipped', reason: 'permission_missing' },
          finishedAt,
        ),
      ).resolves.toEqual({ paused: false });

      expect(await repository.findByIdForExecution(routine.id)).toMatchObject({
        lastRunStatus: RoutineRunStatus.SKIPPED,
        lastRunFailureReason: 'permission_missing',
        lastRunAt: finishedAt,
        consecutiveFailureCount: 2,
        enabled: true,
        nextRunAt,
        pausedAt: null,
      });
    });
  });

  describe('updateDefinition', () => {
    it('writes only the sent fields and keeps the run status', async () => {
      const routine = await stored({ lastRunStatus: RoutineRunStatus.RUNNING });

      const updated = await repository.updateDefinition(
        routine.userId,
        routine.id,
        { enabled: false, name: undefined },
      );

      expect(updated).toMatchObject({
        enabled: false,
        name: routine.name,
        prompt: routine.prompt,
        lastRunStatus: RoutineRunStatus.RUNNING,
      });
    });

    it('clears a stored model', async () => {
      const routine = await stored();

      const updated = await repository.updateDefinition(
        routine.userId,
        routine.id,
        { modelId: null },
      );

      expect(updated?.modelId).toBeNull();
    });

    it('moves updatedAt forward', async () => {
      const routine = await stored();
      await db.query(
        `UPDATE "${schema}"."routines" SET "updatedAt" = '2026-01-01T00:00:00' WHERE id = $1`,
        [routine.id],
      );

      const updated = await repository.updateDefinition(
        routine.userId,
        routine.id,
        { name: 'Amtsblatt Kreis' },
      );

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        new Date('2026-01-01T00:00:00').getTime(),
      );
    });

    it("does not change another user's routine", async () => {
      const routine = await stored();

      await expect(
        repository.updateDefinition(randomUUID(), routine.id, {
          name: 'Übernommen',
        }),
      ).resolves.toBeNull();
      expect((await repository.findByIdForExecution(routine.id))?.name).toBe(
        routine.name,
      );
    });
  });

  it("deletes only the owner's routine", async () => {
    const routine = await stored();

    await expect(repository.delete(randomUUID(), routine.id)).resolves.toBe(
      false,
    );
    await expect(repository.delete(routine.userId, routine.id)).resolves.toBe(
      true,
    );
    await expect(
      repository.findByIdForExecution(routine.id),
    ).resolves.toBeNull();
  });
  describe('findDue', () => {
    const now = new Date('2026-11-07T06:35:00.000Z');

    it('returns enabled routines due by now, earliest first', async () => {
      const later = await stored({
        nextRunAt: new Date('2026-11-07T06:34:00.000Z'),
      });
      const earlier = await stored({
        nextRunAt: new Date('2026-11-06T06:30:00.000Z'),
      });
      const exactlyNow = await stored({ nextRunAt: now });
      await stored({ nextRunAt: new Date('2026-11-07T06:36:00.000Z') });
      await stored({ enabled: false, nextRunAt: earlier.nextRunAt });
      await stored({ nextRunAt: null });

      const due = await repository.findDue(now, 10);

      expect(due.map((routine) => routine.id)).toEqual([
        earlier.id,
        later.id,
        exactlyNow.id,
      ]);
      expect(due[0]).toEqual({
        id: earlier.id,
        userId: earlier.userId,
        orgId: earlier.orgId,
        dailyTime: earlier.dailyTime,
        nextRunAt: earlier.nextRunAt,
      });
    });

    it('returns at most the limit', async () => {
      for (let minute = 10; minute < 15; minute++) {
        await stored({ nextRunAt: new Date(`2026-11-07T06:${minute}:00Z`) });
      }

      await expect(repository.findDue(now, 3)).resolves.toHaveLength(3);
    });
  });

  describe('moveNextRunAt', () => {
    const due = new Date('2026-11-07T06:30:00.000Z');
    const next = new Date('2026-11-08T06:30:00.000Z');

    it('lets exactly one of two concurrent sweeps take a due run', async () => {
      const routine = await stored({ nextRunAt: due });

      const results = await Promise.all([
        repository.moveNextRunAt(routine.id, due, next),
        repository.moveNextRunAt(routine.id, due, next),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(
        (await repository.findByIdForExecution(routine.id))?.nextRunAt,
      ).toEqual(next);
    });

    it('takes a due run whose stored time is more precise than a JS date', async () => {
      const routine = await stored();
      await db.query(
        `UPDATE "${schema}"."routines" SET "nextRunAt" = '2026-11-07T06:30:00.123456Z' WHERE id = $1`,
        [routine.id],
      );
      const [found] = await repository.findDue(
        new Date('2026-11-07T07:00:00.000Z'),
        10,
      );

      await expect(
        repository.moveNextRunAt(routine.id, found.nextRunAt, next),
      ).resolves.toBe(true);
    });

    it('does not move a run that was moved meanwhile', async () => {
      const routine = await stored({
        nextRunAt: new Date('2026-11-07T09:00:00.000Z'),
      });

      await expect(
        repository.moveNextRunAt(routine.id, due, next),
      ).resolves.toBe(false);
    });

    it('does not schedule a disabled routine', async () => {
      const routine = await stored({ enabled: false, nextRunAt: due });

      await expect(
        repository.moveNextRunAt(routine.id, due, next),
      ).resolves.toBe(false);
    });
  });

  describe('markRunStarted', () => {
    const startedAt = new Date('2026-11-07T06:31:00.000Z');
    const executionKey = 'routine-job-1';

    it('marks the run as running from its start', async () => {
      const routine = await stored({ lastRunStatus: RoutineRunStatus.QUEUED });

      await expect(
        repository.markRunStarted(routine.id, startedAt, {
          executionKey,
          onlyIfEnabled: true,
        }),
      ).resolves.toBe(true);
      expect(await repository.findByIdForExecution(routine.id)).toMatchObject({
        lastRunStatus: RoutineRunStatus.RUNNING,
        lastRunStartedAt: startedAt,
      });
    });

    it('starts each execution request only once, so a retried job does not run again', async () => {
      const routine = await stored();
      const start = () =>
        repository.markRunStarted(routine.id, startedAt, {
          executionKey,
          onlyIfEnabled: false,
        });

      await expect(start()).resolves.toBe(true);
      await expect(start()).resolves.toBe(false);
      await expect(
        repository.markRunStarted(routine.id, startedAt, {
          executionKey: 'routine-job-2',
          onlyIfEnabled: false,
        }),
      ).resolves.toBe(true);
    });

    it('still refuses a redelivered job after other runs of the routine started meanwhile', async () => {
      const routine = await stored();
      const start = (key: string) =>
        repository.markRunStarted(routine.id, startedAt, {
          executionKey: key,
          onlyIfEnabled: false,
        });

      await start('scheduled-job');
      await start('run-now-job-1');
      await start('run-now-job-2');

      await expect(start('scheduled-job')).resolves.toBe(false);
    });

    it('leaves a disabled routine alone when it must be enabled', async () => {
      const routine = await stored({
        enabled: false,
        lastRunStatus: RoutineRunStatus.SUCCEEDED,
      });

      await expect(
        repository.markRunStarted(routine.id, startedAt, {
          executionKey,
          onlyIfEnabled: true,
        }),
      ).resolves.toBe(false);
      expect(
        (await repository.findByIdForExecution(routine.id))?.lastRunStatus,
      ).toBe(RoutineRunStatus.SUCCEEDED);
    });

    it('starts a disabled routine when it need not be enabled (Run now)', async () => {
      const routine = await stored({ enabled: false });

      await expect(
        repository.markRunStarted(routine.id, startedAt, {
          executionKey,
          onlyIfEnabled: false,
        }),
      ).resolves.toBe(true);
    });
  });

  describe('pausing after repeated failures', () => {
    const finishedAt = new Date('2026-11-07T06:40:00.000Z');
    const failure = { status: 'failed', failureReason: 'timeout' } as const;

    it('pauses an enabled routine at its third consecutive failure', async () => {
      const routine = await stored({
        consecutiveFailureCount: 2,
        nextRunAt: new Date('2026-11-08T06:30:00.000Z'),
      });

      await expect(
        repository.recordRunOutcome(routine.id, failure, finishedAt),
      ).resolves.toEqual({ paused: true });
      expect(await repository.findByIdForExecution(routine.id)).toMatchObject({
        enabled: false,
        nextRunAt: null,
        pausedAt: finishedAt,
        consecutiveFailureCount: 3,
        lastRunStatus: RoutineRunStatus.FAILED,
      });
    });

    it('keeps the routine enabled before the third failure', async () => {
      const nextRunAt = new Date('2026-11-08T06:30:00.000Z');
      const routine = await stored({ consecutiveFailureCount: 1, nextRunAt });

      await expect(
        repository.recordRunOutcome(routine.id, failure, finishedAt),
      ).resolves.toEqual({ paused: false });
      expect(await repository.findByIdForExecution(routine.id)).toMatchObject({
        enabled: true,
        nextRunAt,
        pausedAt: null,
      });
    });

    it('does not mark a disabled routine as paused by failures', async () => {
      const routine = await stored({
        enabled: false,
        consecutiveFailureCount: 2,
      });

      await expect(
        repository.recordRunOutcome(routine.id, failure, finishedAt),
      ).resolves.toEqual({ paused: false });
      expect(
        (await repository.findByIdForExecution(routine.id))?.pausedAt,
      ).toBeNull();
    });

    it('keeps a paused routine paused when a later run succeeds', async () => {
      const pausedAt = new Date('2026-11-06T06:40:00.000Z');
      const routine = await stored({
        enabled: false,
        pausedAt,
        consecutiveFailureCount: 3,
      });

      await repository.recordRunOutcome(
        routine.id,
        { status: 'succeeded' },
        finishedAt,
      );

      expect(await repository.findByIdForExecution(routine.id)).toMatchObject({
        enabled: false,
        pausedAt,
        consecutiveFailureCount: 0,
      });
    });
  });

  describe('failRunsStartedBefore', () => {
    const cutoff = new Date('2026-11-07T06:10:00.000Z');
    const finishedAt = new Date('2026-11-07T06:30:00.000Z');

    it('fails runs left running since before the cutoff and returns them', async () => {
      const stale = await stored({
        lastRunStatus: RoutineRunStatus.RUNNING,
        lastRunStartedAt: new Date('2026-11-07T06:00:00.000Z'),
        consecutiveFailureCount: 2,
        nextRunAt: new Date('2026-11-08T06:30:00.000Z'),
      });
      const recent = await stored({
        lastRunStatus: RoutineRunStatus.RUNNING,
        lastRunStartedAt: new Date('2026-11-07T06:20:00.000Z'),
      });
      const finished = await stored({
        lastRunStatus: RoutineRunStatus.SUCCEEDED,
        lastRunStartedAt: new Date('2026-11-07T05:00:00.000Z'),
      });

      await expect(
        repository.failRunsStartedBefore(cutoff, 'interrupted', finishedAt),
      ).resolves.toEqual([
        {
          routine: {
            id: stale.id,
            userId: stale.userId,
            orgId: stale.orgId,
            name: stale.name,
          },
          paused: true,
        },
      ]);

      expect(await repository.findByIdForExecution(stale.id)).toMatchObject({
        lastRunStatus: RoutineRunStatus.FAILED,
        lastRunFailureReason: 'interrupted',
        lastRunAt: finishedAt,
        consecutiveFailureCount: 3,
        enabled: false,
        nextRunAt: null,
        pausedAt: finishedAt,
      });
      expect(
        (await repository.findByIdForExecution(recent.id))?.lastRunStatus,
      ).toBe(RoutineRunStatus.RUNNING);
      expect(
        (await repository.findByIdForExecution(finished.id))?.lastRunStatus,
      ).toBe(RoutineRunStatus.SUCCEEDED);
    });

    it('reports an interrupted run that did not pause its routine as not paused', async () => {
      await stored({
        lastRunStatus: RoutineRunStatus.RUNNING,
        lastRunStartedAt: new Date('2026-11-07T06:00:00.000Z'),
        consecutiveFailureCount: 0,
      });

      const [run] = await repository.failRunsStartedBefore(
        cutoff,
        'interrupted',
        finishedAt,
      );

      expect(run.paused).toBe(false);
    });
  });

  describe('updateDefinition with schedule changes', () => {
    it('resumes a paused routine in one write', async () => {
      const routine = await stored({
        enabled: false,
        pausedAt: new Date('2026-11-06T06:40:00.000Z'),
        consecutiveFailureCount: 3,
      });
      const nextRunAt = new Date('2026-11-08T06:30:00.000Z');

      const updated = await repository.updateDefinition(
        routine.userId,
        routine.id,
        {
          enabled: true,
          nextRunAt,
          consecutiveFailureCount: 0,
          pausedAt: null,
        },
      );

      expect(updated).toMatchObject({
        enabled: true,
        nextRunAt,
        consecutiveFailureCount: 0,
        pausedAt: null,
      });
    });
  });

  describe('findByIdForUpdate', () => {
    it('holds a run outcome until the edit that read the routine commits', async () => {
      const routine = await stored({ consecutiveFailureCount: 2 });
      const events: string[] = [];
      let outcome: Promise<unknown> = Promise.resolve();

      await db.transaction(async (manager) => {
        ambient = manager;
        await expect(
          repository.findByIdForUpdate(routine.userId, routine.id),
        ).resolves.toMatchObject({ id: routine.id });
        ambient = undefined;
        outcome = repository
          .recordRunOutcome(
            routine.id,
            { status: 'failed', failureReason: 'timeout' },
            new Date(),
          )
          .then(() => events.push('outcome recorded'));
        await new Promise((resolve) => setTimeout(resolve, 200));
        ambient = manager;
        await repository.updateDefinition(routine.userId, routine.id, {
          enabled: true,
          consecutiveFailureCount: 0,
        });
        ambient = undefined;
        events.push('edit written');
      });
      await outcome;

      expect(events).toEqual(['edit written', 'outcome recorded']);
      expect(
        (await repository.findByIdForExecution(routine.id))
          ?.consecutiveFailureCount,
      ).toBe(1);
    });

    it("does not return another user's routine", async () => {
      const routine = await stored();

      await db.transaction(async (manager) => {
        ambient = manager;
        await expect(
          repository.findByIdForUpdate(randomUUID(), routine.id),
        ).resolves.toBeNull();
      });
    });
  });
});
