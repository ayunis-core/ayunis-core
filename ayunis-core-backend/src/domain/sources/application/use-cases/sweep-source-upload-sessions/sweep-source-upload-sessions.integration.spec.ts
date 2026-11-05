import 'src/config/env';
import { randomUUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { buildUploadSession } from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadStorageCleanupService } from 'src/domain/sources/application/services/source-upload-storage-cleanup.service';
import { LocalSourceUploadSessionRepository } from 'src/domain/sources/infrastructure/persistence/local/local-source-upload-session.repository';
import { SourceUploadSessionMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source-upload-session.mapper';
import { SourceUploadSessionRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source-upload-session.record';
import { SweepSourceUploadSessionsUseCase } from './sweep-source-upload-sessions.use-case';

const base = {
  id: { type: 'uuid', primary: true },
  createdAt: { type: 'timestamp', createDate: true },
  updatedAt: { type: 'timestamp', updateDate: true },
} as const;
const sessionSchema = new EntitySchema<SourceUploadSessionRecord>({
  name: 'SourceUploadSessionRecord',
  target: SourceUploadSessionRecord,
  tableName: 'source_upload_sessions',
  columns: {
    ...base,
    orgId: { type: 'uuid' },
    userId: { type: 'uuid' },
    targetId: { type: 'uuid' },
    targetType: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: 'bigint' },
    storageKey: { type: String },
    expectedETag: { type: String, nullable: true },
    multipart: { type: Boolean },
    multipartUploadId: { type: String, nullable: true },
    status: { type: String },
    sources: { type: 'jsonb' },
    expiresAt: { type: 'timestamp' },
  },
});

describe('Source upload retention cleanup', () => {
  let db: DataSource;
  let schema: string;
  let sessions: LocalSourceUploadSessionRepository;
  let sweep: SweepSourceUploadSessionsUseCase;
  let cleanup: SourceUploadStorageCleanupService;
  const objects = new Set<string>();
  let rejectRemoval = false;
  const before = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    schema = `upload_retention_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      logging: false,
      entities: [sessionSchema],
      migrations: [],
      migrationsRun: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    const host = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    sessions = new LocalSourceUploadSessionRepository(
      db.getRepository(SourceUploadSessionRecord),
      new SourceUploadSessionMapper(),
      host,
    );
    cleanup = new SourceUploadStorageCleanupService(
      { execute: async () => undefined } as never,
      {
        execute: async (command: { objectName: string }) => {
          if (rejectRemoval) throw new Error('storage unavailable');
          objects.delete(command.objectName);
        },
      } as never,
    );
    sweep = new SweepSourceUploadSessionsUseCase(
      sessions,
      {} as never,
      cleanup,
      { execute: async () => [] } as never,
    );
  }, 30_000);

  beforeEach(() => {
    objects.clear();
    rejectRemoval = false;
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  async function abandoned(status = SourceUploadSessionStatus.ABORTED) {
    const id = randomUUID();
    return sessions.save(
      buildUploadSession({
        id,
        status,
        storageKey: `org/uploads/${id}/document.pdf`,
        updatedAt: new Date(before.getTime() - 24 * 60 * 60 * 1000),
      }),
    );
  }

  it.each([
    SourceUploadSessionStatus.ABORTED,
    SourceUploadSessionStatus.EXPIRED,
  ])('deletes a late object before forgetting a %s upload', async (status) => {
    const session = await abandoned(status);
    await cleanup.discard(session);
    objects.add(session.storageKey);
    await sweep.execute();
    expect(objects.has(session.storageKey)).toBe(false);
    expect(await sessions.findById(session.id)).toBeNull();
  });

  it('retains a failed cleanup record and removes it only after a successful retry', async () => {
    const session = await abandoned();
    objects.add(session.storageKey);
    rejectRemoval = true;
    await sweep.execute();
    expect(await sessions.findById(session.id)).not.toBeNull();
    expect(objects.has(session.storageKey)).toBe(true);
    rejectRemoval = false;
    await sweep.execute();
    expect(await sessions.findById(session.id)).toBeNull();
    expect(objects.has(session.storageKey)).toBe(false);
  });

  it('purges completed session metadata while preserving its original object', async () => {
    const session = await abandoned(SourceUploadSessionStatus.COMPLETED);
    objects.add(session.storageKey);
    expect(await sessions.deleteAbandonedBefore([session.id], before)).toBe(0);
    await sweep.execute();
    expect(await sessions.findById(session.id)).toBeNull();
    expect(objects.has(session.storageKey)).toBe(true);
  });

  it('does not clean or purge a recent abandoned upload', async () => {
    const session = await sessions.save(
      buildUploadSession({
        id: randomUUID(),
        status: SourceUploadSessionStatus.ABORTED,
      }),
    );
    objects.add(session.storageKey);
    await sweep.execute();
    expect(await sessions.findById(session.id)).not.toBeNull();
    expect(objects.has(session.storageKey)).toBe(true);
  });
});
