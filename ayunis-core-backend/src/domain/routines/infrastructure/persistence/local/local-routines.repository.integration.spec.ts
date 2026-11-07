import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
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
  },
});

describe('LocalRoutinesRepository (PostgreSQL)', () => {
  let db: DataSource;
  let repository: LocalRoutinesRepository;
  let schema: string;

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
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
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
});
