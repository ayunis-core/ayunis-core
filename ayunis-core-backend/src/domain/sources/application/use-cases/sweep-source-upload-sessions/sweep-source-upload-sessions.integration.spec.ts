import { request as httpRequest, type ClientRequest } from 'http';
import storageConfig from 'src/config/storage.config';
import { MinioObjectStorageProvider } from 'src/domain/storage/infrastructure/providers/minio-object-storage.provider';
import { AbortMultipartUploadUseCase } from 'src/domain/storage/application/use-cases/abort-multipart-upload/abort-multipart-upload.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import 'src/config/env';
import { randomUUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema, getMetadataArgsStorage } from 'typeorm';
import type { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
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
const userRelation = getMetadataArgsStorage().relations.find(
  (relation) =>
    relation.target === SourceUploadSessionRecord &&
    relation.propertyName === 'user',
)!;
const ownerColumn = getMetadataArgsStorage().columns.find(
  (column) =>
    column.target === SourceUploadSessionRecord &&
    column.propertyName === 'userId',
)!;
const userSchema = new EntitySchema({
  name: 'CleanupUser',
  tableName: 'cleanup_users',
  columns: { id: { type: 'uuid', primary: true } },
});
const sessionSchema = new EntitySchema<SourceUploadSessionRecord>({
  name: 'SourceUploadSessionRecord',
  target: SourceUploadSessionRecord,
  tableName: 'source_upload_sessions',
  columns: {
    ...base,
    orgId: { type: 'uuid' },
    userId: { type: 'uuid', nullable: ownerColumn.options.nullable ?? false },
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
  relations: {
    user: {
      type: 'many-to-one',
      target: 'CleanupUser',
      joinColumn: { name: 'userId' },
      onDelete: userRelation.options.onDelete,
      nullable: userRelation.options.nullable,
    },
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
      entities: [sessionSchema, userSchema],
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

  beforeEach(async () => {
    await db.getRepository(SourceUploadSessionRecord).clear();
    await db
      .getRepository('CleanupUser')
      .upsert({ id: '11111111-1111-1111-1111-111111111111' }, ['id']);
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

  it('keeps the cleanup anchor after user deletion and removes a late upload after the signing window', async () => {
    const userId = randomUUID();
    await db.getRepository('CleanupUser').insert({ id: userId });
    const session = await sessions.save(
      buildUploadSession({
        id: randomUUID(),
        userId,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    );
    objects.add(session.storageKey);
    await cleanup.discard(session);
    await db.getRepository('CleanupUser').delete({ id: userId });
    expect(await sessions.findById(session.id)).toMatchObject({ userId: null });
    expect(
      await sessions.transition(
        session.id,
        SourceUploadSessionStatus.PENDING,
        SourceUploadSessionStatus.SOURCES_CREATED,
      ),
    ).toBe(false);
    objects.add(session.storageKey);
    await sweep.execute();
    expect(objects.has(session.storageKey)).toBe(false);
    expect(await sessions.findById(session.id)).toMatchObject({
      userId: null,
      status: SourceUploadSessionStatus.ABORTED,
    });
    objects.add(session.storageKey);
    await db
      .getRepository(SourceUploadSessionRecord)
      .update(session.id, { expiresAt: new Date(Date.now() - 16 * 60_000) });
    rejectRemoval = true;
    await sweep.execute();
    expect(await sessions.findById(session.id)).not.toBeNull();
    rejectRemoval = false;
    await sweep.execute();
    expect(objects.has(session.storageKey)).toBe(false);
    expect(await sessions.findById(session.id)).not.toBeNull();
  });

  it('removes a real MinIO PUT recreated with the same URL after user deletion', async () => {
    const baseConfig = storageConfig();
    const bucket = `ayc1541-cleanup-${randomUUID()}`;
    const config = {
      ...baseConfig,
      minio: {
        ...baseConfig.minio,
        bucket,
        public: baseConfig.minio.internal,
        upload: {
          accessKey: baseConfig.minio.accessKey,
          secretKey: baseConfig.minio.secretKey,
        },
      },
    };
    const storage = new MinioObjectStorageProvider(config);
    const storageCleanup = new SourceUploadStorageCleanupService(
      new AbortMultipartUploadUseCase(storage),
      new DeleteObjectUseCase(storage, config),
    );
    const userId = randomUUID();
    const session = buildUploadSession({
      id: randomUUID(),
      userId,
      storageKey: `${randomUUID()}/uploads/${randomUUID()}/meeting.txt`,
    });
    await db.getRepository('CleanupUser').insert({ id: userId });
    await sessions.save(session);
    await storage.createBucket(bucket);
    try {
      const signedUrl = await storage.presignUploadRequest(
        new StorageUrl(session.storageKey, bucket),
        { method: 'PUT', query: {}, contentLength: 5 },
        900,
      );
      expect(
        (await fetch(signedUrl, { method: 'PUT', body: 'draft' })).status,
      ).toBe(200);
      await db.getRepository('CleanupUser').delete({ id: userId });
      const liveSweep = new SweepSourceUploadSessionsUseCase(
        sessions,
        {} as never,
        storageCleanup,
        { execute: async () => [] } as never,
      );
      await liveSweep.execute();
      expect(await sessions.findById(session.id)).toMatchObject({
        userId: null,
      });
      expect(
        await storage.exists(new StorageUrl(session.storageKey, bucket)),
      ).toBe(false);
      expect(
        (await fetch(signedUrl, { method: 'PUT', body: 'later' })).status,
      ).toBe(200);
      await liveSweep.execute();
      expect(
        await storage.exists(new StorageUrl(session.storageKey, bucket)),
      ).toBe(false);
      expect(await sessions.findById(session.id)).not.toBeNull();
      await db
        .getRepository(SourceUploadSessionRecord)
        .update(session.id, { expiresAt: new Date(Date.now() - 16 * 60_000) });
      await liveSweep.execute();
      expect(await sessions.findById(session.id)).not.toBeNull();
    } finally {
      await storage.delete(new StorageUrl(session.storageKey, bucket));
      await storage.deleteBucket(bucket);
    }
  }, 30_000);

  it('keeps the anchor when an expired signed PUT is still in flight', async () => {
    const baseConfig = storageConfig();
    const bucket = `ayc1541-held-${randomUUID()}`;
    const config = {
      ...baseConfig,
      minio: {
        ...baseConfig.minio,
        bucket,
        public: baseConfig.minio.internal,
        upload: {
          accessKey: baseConfig.minio.accessKey,
          secretKey: baseConfig.minio.secretKey,
        },
      },
    };
    const storage = new MinioObjectStorageProvider(config);
    const userId = randomUUID();
    await db.getRepository('CleanupUser').insert({ id: userId });
    const session = await sessions.save(
      buildUploadSession({
        id: randomUUID(),
        userId,
        storageKey: `${randomUUID()}/uploads/${randomUUID()}/held.txt`,
      }),
    );
    const storageCleanup = new SourceUploadStorageCleanupService(
      new AbortMultipartUploadUseCase(storage),
      new DeleteObjectUseCase(storage, config),
    );
    await storage.createBucket(bucket);
    let upload: ClientRequest | undefined;
    let response: Promise<number> | undefined;
    try {
      const signedUrl = await storage.presignUploadRequest(
        new StorageUrl(session.storageKey, bucket),
        { method: 'PUT', query: {}, contentLength: 2 },
        2,
      );
      response = new Promise<number>((resolve, reject) => {
        upload = httpRequest(
          signedUrl,
          { method: 'PUT', headers: { 'content-length': 2 } },
          (result) => {
            result.resume();
            result.once('end', () => resolve(result.statusCode ?? 0));
          },
        );
        upload.on('error', reject);
        upload.write('A');
      });
      await new Promise((resolve) => setTimeout(resolve, 3100));
      await db.getRepository('CleanupUser').delete({ id: userId });
      await db
        .getRepository(SourceUploadSessionRecord)
        .update(session.id, { expiresAt: new Date(Date.now() - 16 * 60_000) });
      const liveSweep = new SweepSourceUploadSessionsUseCase(
        sessions,
        {} as never,
        storageCleanup,
        { execute: async () => [] } as never,
      );
      expect(
        await storage.exists(new StorageUrl(session.storageKey, bucket)),
      ).toBe(false);
      await liveSweep.execute();
      expect(await sessions.findById(session.id)).not.toBeNull();
      upload!.end('B');
      expect(await response).toBe(200);
      expect(
        await storage.exists(new StorageUrl(session.storageKey, bucket)),
      ).toBe(true);
      await liveSweep.execute();
      expect(
        await storage.exists(new StorageUrl(session.storageKey, bucket)),
      ).toBe(false);
      expect(await sessions.findById(session.id)).not.toBeNull();
    } finally {
      if (upload && !upload.writableEnded) upload.end('B');
      await response;
      await storage.delete(new StorageUrl(session.storageKey, bucket));
      await storage.deleteBucket(bucket);
    }
  }, 30_000);

  it('preserves session ownership when user deletion rolls back', async () => {
    const userId = randomUUID();
    await db.getRepository('CleanupUser').insert({ id: userId });
    const session = await sessions.save(
      buildUploadSession({ id: randomUUID(), userId }),
    );
    await expect(
      db.transaction(async (manager) => {
        await manager.getRepository('CleanupUser').delete({ id: userId });
        expect(
          await manager
            .getRepository(SourceUploadSessionRecord)
            .findOneBy({ id: session.id }),
        ).toMatchObject({ userId: null });
        throw new Error('rollback deletion');
      }),
    ).rejects.toThrow('rollback deletion');
    expect(await sessions.findById(session.id)).toMatchObject({ userId });
  });

  it('does not let a deleted-user backlog block another user’s queue retry', async () => {
    const records = Array.from({ length: 100 }, () =>
      new SourceUploadSessionMapper().toRecord(
        buildUploadSession({
          id: randomUUID(),
          userId: null,
          status: SourceUploadSessionStatus.SOURCES_CREATED,
          updatedAt: new Date(Date.now() - 60 * 60_000),
        }),
      ),
    );
    await db.getRepository(SourceUploadSessionRecord).insert(records);
    const active = await sessions.save(
      buildUploadSession({
        id: randomUUID(),
        status: SourceUploadSessionStatus.SOURCES_CREATED,
        updatedAt: new Date(Date.now() - 30 * 60_000),
      }),
    );
    const tryQueue = jest.fn().mockResolvedValue(true);
    const retrySweep = new SweepSourceUploadSessionsUseCase(
      sessions,
      { tryQueue } as never,
      cleanup,
      { execute: async () => [] } as never,
    );
    await retrySweep.execute();
    expect(tryQueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: active.id }),
    );
  });

  it('rotates cleanup batches so retained records cannot starve newer uploads', async () => {
    const records = Array.from({ length: 101 }, () =>
      new SourceUploadSessionMapper().toRecord(
        buildUploadSession({
          id: randomUUID(),
          userId: null,
          status: SourceUploadSessionStatus.ABORTED,
          updatedAt: new Date(Date.now() - 60 * 60_000),
        }),
      ),
    );
    await db.getRepository(SourceUploadSessionRecord).insert(records);
    const discard = jest.spyOn(cleanup, 'discard');
    try {
      await sweep.execute();
      await sweep.execute();
      expect(
        new Set(
          discard.mock.calls.map(
            ([session]) => (session as SourceUploadSession).id,
          ),
        ).size,
      ).toBe(101);
    } finally {
      discard.mockRestore();
    }
  });

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
