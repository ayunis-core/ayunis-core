import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { LocalSourceRepository } from './local-source.repository';
import { SourceRecord } from './schema/source.record';
import type { SourceMapper } from './mappers/source.mapper';
import type { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';
import { SourceProcessingHeartbeatService } from 'src/domain/sources/infrastructure/queue/source-processing-heartbeat.service';
import { StaleProcessingCleanupTask } from 'src/domain/sources/infrastructure/tasks/stale-processing-cleanup.task';

const sourceSchema = new EntitySchema<SourceRecord>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  columns: {
    id: { type: 'uuid', primary: true },
    status: { type: 'varchar' },
    processingStartedAt: { type: 'timestamp', nullable: true },
  },
});

describe('Source processing heartbeat database guard', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalSourceRepository;
  const expired = new Date(Date.now() - 16 * 60 * 1000);

  beforeAll(async () => {
    schema = `heartbeat_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [sourceSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
      // Timestamp columns have no timezone; match the driver's local Date encoding.
      extra: {
        options: `-c timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      },
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    repository = new LocalSourceRepository(
      db.getRepository(SourceRecord),
      {} as SourceMapper,
      {} as SourceContentChunkMapper,
      { tx: db.manager } as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  it('renews an active source so stale cleanup no longer selects it', async () => {
    const id = randomUUID();
    await db.getRepository(SourceRecord).insert({
      id,
      status: SourceStatus.PROCESSING,
      processingStartedAt: expired,
    });
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    expect(
      await repository.findStaleProcessingSourceIds(cutoff, 100),
    ).toContain(id);
    await expect(repository.refreshProcessingHeartbeat(id)).resolves.toBe(true);
    expect(
      await repository.findStaleProcessingSourceIds(cutoff, 100),
    ).not.toContain(id);
  });

  it('periodically renews stored state so real stale cleanup leaves active work alone', async () => {
    const id = randomUUID();
    await db.getRepository(SourceRecord).insert({
      id,
      status: SourceStatus.PROCESSING,
      processingStartedAt: expired,
    });
    jest.useFakeTimers({
      doNotFake: ['Date', 'nextTick', 'setImmediate', 'hrtime', 'performance'],
    });
    let finish!: () => void;
    const work = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const service = new SourceProcessingHeartbeatService(repository);
    const processing = service.run(id, () => work);
    const failures: string[] = [];
    const cleanup = new StaleProcessingCleanupTask(repository, {
      execute: async (command: { sourceId: string }) => {
        failures.push(command.sourceId);
      },
    } as never);
    try {
      await jest.advanceTimersByTimeAsync(60 * 1000);
      finish();
      await processing;
      await cleanup.handleCleanup();
      expect(failures).not.toContain(id);
      const stored = await db
        .getRepository(SourceRecord)
        .findOneByOrFail({ id });
      expect(stored.status).toBe(SourceStatus.PROCESSING);
      expect(stored.processingStartedAt!.getTime()).toBeGreaterThan(
        expired.getTime(),
      );
    } finally {
      finish();
      await processing;
      jest.useRealTimers();
    }
  });

  it.each([SourceStatus.FAILED, SourceStatus.READY])(
    'does not renew or change a %s source',
    async (status) => {
      const id = randomUUID();
      const rows = db.getRepository(SourceRecord);
      await rows.insert({ id, status, processingStartedAt: expired });
      await expect(repository.refreshProcessingHeartbeat(id)).resolves.toBe(
        false,
      );
      expect(await rows.findOneByOrFail({ id })).toMatchObject({
        status,
        processingStartedAt: expired,
      });
    },
  );

  it('does not recreate a deleted source or renew its replacement in a terminal state', async () => {
    const id = randomUUID();
    const rows = db.getRepository(SourceRecord);
    await rows.insert({
      id,
      status: SourceStatus.PROCESSING,
      processingStartedAt: expired,
    });
    await rows.delete(id);
    await expect(repository.refreshProcessingHeartbeat(id)).resolves.toBe(
      false,
    );
    expect(await rows.findOneBy({ id })).toBeNull();
    await rows.insert({
      id,
      status: SourceStatus.READY,
      processingStartedAt: expired,
    });
    await expect(repository.refreshProcessingHeartbeat(id)).resolves.toBe(
      false,
    );
    expect(await rows.findOneByOrFail({ id })).toMatchObject({
      status: SourceStatus.READY,
      processingStartedAt: expired,
    });
  });
});
