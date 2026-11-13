import 'src/config/env';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import {
  createOwnerContext,
  buildUploadSession,
  UPLOAD_USER_ID,
} from 'src/domain/sources/application/testing/source-upload.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';
import { SourceUploadSessionAccessService } from 'src/domain/sources/application/services/source-upload-session-access.service';
import { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { LocalSourceRepository } from 'src/domain/sources/infrastructure/persistence/local/local-source.repository';
import { LocalSourceUploadSessionRepository } from 'src/domain/sources/infrastructure/persistence/local/local-source-upload-session.repository';
import { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import { SourceContentChunkMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source-content-chunk.mapper';
import { SourceUploadSessionMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source-upload-session.mapper';
import {
  SourceRecord,
  TextSourceRecord,
  DataSourceRecord,
} from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import {
  DataSourceDetailsRecord,
  CSVDataSourceDetailsRecord,
} from 'src/domain/sources/infrastructure/persistence/local/schema/data-source-details.record';
import { SourceUploadSessionRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source-upload-session.record';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import {
  SourceType,
  DataType,
} from 'src/domain/sources/domain/source-type.enum';
import { LocalThreadAssignmentsRepository } from 'src/domain/threads/infrastructure/persistence/local/local-thread-assignments.repository';
import { ThreadSourceAssignmentMapper } from 'src/domain/threads/infrastructure/persistence/local/mappers/thread-source-assignment.mapper';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { ThreadSourceAssignmentRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread-source-assignment.record';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { CompleteSourceUploadUseCase } from './complete-source-upload.use-case';
import { CompleteSourceUploadCommand } from './complete-source-upload.command';

const base = {
  id: { type: 'uuid', primary: true },
  createdAt: { type: 'timestamp', createDate: true },
  updatedAt: { type: 'timestamp', updateDate: true },
} as const;
const sourceSchema = new EntitySchema<SourceRecord>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  inheritance: { pattern: 'STI', column: { name: 'type', type: String } },
  columns: {
    ...base,
    name: { type: String },
    createdBy: { type: String },
    status: { type: String },
    storageKey: { type: String, nullable: true },
    knowledgeBaseId: { type: 'uuid', nullable: true },
    processingError: { type: String, nullable: true },
    processingErrorCode: { type: String, nullable: true },
    processingStartedAt: { type: 'timestamp', nullable: true },
  },
});
const textSchema = new EntitySchema<TextSourceRecord>({
  name: 'TextSourceRecord',
  target: TextSourceRecord,
  type: 'entity-child',
  discriminatorValue: SourceType.TEXT,
  columns: {
    textType: { type: String },
    fileType: { type: String, nullable: true },
    url: { type: String, nullable: true },
    maxDepth: { type: Number, nullable: true },
  },
});
const dataSchema = new EntitySchema<DataSourceRecord>({
  name: 'DataSourceRecord',
  target: DataSourceRecord,
  type: 'entity-child',
  discriminatorValue: SourceType.DATA,
  columns: { dataType: { type: String } },
  relations: {
    dataSourceDetails: {
      type: 'one-to-one',
      target: 'DataSourceDetailsRecord',
      inverseSide: 'source',
    },
  },
});
const detailsSchema = new EntitySchema<DataSourceDetailsRecord>({
  name: 'DataSourceDetailsRecord',
  target: DataSourceDetailsRecord,
  tableName: 'data_source_details',
  inheritance: { pattern: 'STI', column: { name: 'dataType', type: String } },
  columns: base,
  relations: {
    source: {
      type: 'one-to-one',
      target: 'DataSourceRecord',
      joinColumn: { name: 'sourceId' },
      onDelete: 'CASCADE',
    },
  },
});
const csvSchema = new EntitySchema<CSVDataSourceDetailsRecord>({
  name: 'CSVDataSourceDetailsRecord',
  target: CSVDataSourceDetailsRecord,
  type: 'entity-child',
  discriminatorValue: DataType.CSV,
  columns: { data: { type: 'jsonb' } },
});
const sessionSchema = new EntitySchema<SourceUploadSessionRecord>({
  name: 'SourceUploadSessionRecord',
  target: SourceUploadSessionRecord,
  tableName: 'source_upload_sessions',
  columns: {
    ...base,
    orgId: { type: 'uuid' },
    userId: { type: 'uuid' },
    targetId: { type: 'uuid', nullable: true },
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
const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: { id: { type: 'uuid', primary: true }, userId: { type: 'uuid' } },
});
const assignmentSchema = new EntitySchema<ThreadSourceAssignmentRecord>({
  name: 'ThreadSourceAssignmentRecord',
  target: ThreadSourceAssignmentRecord,
  tableName: 'thread_source_assignments',
  columns: {
    ...base,
    threadId: { type: 'uuid' },
    sourceId: { type: 'uuid' },
    originSkillId: { type: 'uuid', nullable: true },
  },
});

describe('CompleteSourceUploadUseCase transaction', () => {
  let db: DataSource;
  let schema: string;
  let host: TransactionHost<TransactionalAdapterTypeOrm>;
  let sessions: LocalSourceUploadSessionRepository;
  let sources: LocalSourceRepository;
  let assignments: LocalThreadAssignmentsRepository;
  let useCase: CompleteSourceUploadUseCase;
  let session: ReturnType<typeof buildUploadSession>;
  let createdIds: UUID[];
  const queueing = { tryQueue: jest.fn() };

  let threadId: UUID;

  beforeAll(async () => {
    schema = `upload_completion_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      logging: false,
      entities: [
        sourceSchema,
        textSchema,
        dataSchema,
        detailsSchema,
        csvSchema,
        sessionSchema,
        threadSchema,
        assignmentSchema,
      ],
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
    host = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    const mapper = new SourceMapper(new SourceContentChunkMapper());
    sources = new LocalSourceRepository(
      db.getRepository(SourceRecord),
      mapper,
      new SourceContentChunkMapper(),
      host,
    );
    sessions = new LocalSourceUploadSessionRepository(
      db.getRepository(SourceUploadSessionRecord),
      new SourceUploadSessionMapper(),
      host,
    );
    assignments = new LocalThreadAssignmentsRepository(
      db.getRepository(ThreadRecord),
      db.getRepository(ThreadSourceAssignmentRecord),
      {} as never,
      new ThreadSourceAssignmentMapper(mapper),
      host,
    );
    useCase = new CompleteSourceUploadUseCase(
      new SourceUploadSessionAccessService(
        sessions,
        createOwnerContext() as unknown as ContextService,
      ),
      sessions,
      sources,
      { listDataSheets: async () => ['Plan 2026', 'Plan 2027'] } as never,
      new CreateProcessingSourceUseCase(sources),
      { execute: async () => ({ size: 1024, etag: 'verified' }) } as never,
      {
        execute: async () =>
          (async function* () {
            yield Buffer.from('workbook');
          })(),
      } as never,
      queueing as never,
      {} as never,
    );
  }, 30_000);

  beforeEach(async () => {
    threadId = randomUUID();
    session = buildUploadSession({ id: randomUUID(), targetId: threadId });
    createdIds = [];
    queueing.tryQueue.mockReset();
    queueing.tryQueue.mockImplementation(async () => {
      expect(host.isTransactionActive()).toBe(false);
      expect(await sessions.findById(session.id)).toMatchObject({
        expectedETag: 'verified',
      });
      const committed = await db
        .getRepository(ThreadSourceAssignmentRecord)
        .findBy({ threadId });
      expect(
        committed.map((row) => row.sourceId).sort((a, b) => a.localeCompare(b)),
      ).toEqual([...createdIds].sort((a, b) => a.localeCompare(b)));
      await sessions.transition(
        session.id,
        SourceUploadSessionStatus.SOURCES_CREATED,
        SourceUploadSessionStatus.COMPLETED,
      );
      return true;
    });
    await db
      .getRepository(ThreadRecord)
      .save({ id: threadId, userId: UPLOAD_USER_ID });
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  async function attach(created: Source[]): Promise<void> {
    createdIds = created.map((source) => source.id);
    for (const source of created) {
      await assignments.addSourceAssignment({
        threadId,
        userId: UPLOAD_USER_ID,
        sourceAssignment: new SourceAssignment({ source }),
      });
    }
  }

  function command(attachment = attach): CompleteSourceUploadCommand {
    return new CompleteSourceUploadCommand({
      uploadId: session.id,
      targetId: threadId,
      targetType: session.targetType,
      attach: attachment,
    });
  }

  it.each([false, true])(
    'rolls back source, session and assignments on attach failure (workbook=%s), then retries',
    async (workbook) => {
      if (workbook) {
        session.fileName = 'Haushalt.xlsx';
        session.fileType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
      await sessions.save(session);
      await expect(
        useCase.execute(
          command(async (created) => {
            await attach(created);
            throw new Error('target assignment failed');
          }),
        ),
      ).rejects.toThrow();

      expect(await sources.findByIds(createdIds)).toEqual([]);
      expect(
        await db
          .getRepository(ThreadSourceAssignmentRecord)
          .countBy({ threadId }),
      ).toBe(0);
      expect(await sessions.findById(session.id)).toMatchObject({
        status: SourceUploadSessionStatus.PENDING,
        sources: [],
        expectedETag: null,
      });
      expect(queueing.tryQueue).not.toHaveBeenCalled();

      const result = await useCase.execute(command());
      expect(result.sources).toHaveLength(workbook ? 2 : 1);
      expect(await sessions.findById(session.id)).toMatchObject({
        status: SourceUploadSessionStatus.COMPLETED,
        expectedETag: 'verified',
      });
      expect(
        await db
          .getRepository(ThreadSourceAssignmentRecord)
          .countBy({ threadId }),
      ).toBe(workbook ? 2 : 1);
    },
  );

  it('binds a staged upload atomically and rolls the binding back with a failed attachment', async () => {
    session.targetId = null;
    await sessions.save(session);
    await expect(
      useCase.execute(
        command(async (created) => {
          await attach(created);
          throw new Error('attachment interrupted');
        }),
      ),
    ).rejects.toThrow();
    expect(await sessions.findById(session.id)).toMatchObject({
      targetId: null,
      status: SourceUploadSessionStatus.PENDING,
    });

    const result = await useCase.execute(command());
    expect(result.sources).toHaveLength(1);
    expect(await sessions.findById(session.id)).toMatchObject({
      targetId: threadId,
      status: SourceUploadSessionStatus.COMPLETED,
    });
  });

  it('lets only one thread claim a staged upload during concurrent completions', async () => {
    session.targetId = null;
    await sessions.save(session);
    const otherThreadId = randomUUID();
    await db
      .getRepository(ThreadRecord)
      .save({ id: otherThreadId, userId: UPLOAD_USER_ID });
    queueing.tryQueue.mockResolvedValue(true);
    const otherCommand = new CompleteSourceUploadCommand({
      uploadId: session.id,
      targetId: otherThreadId,
      targetType: session.targetType,
      attach: async (created) => {
        for (const source of created)
          await assignments.addSourceAssignment({
            threadId: otherThreadId,
            userId: UPLOAD_USER_ID,
            sourceAssignment: new SourceAssignment({ source }),
          });
      },
    });
    const outcomes = await Promise.allSettled([
      useCase.execute(command()),
      useCase.execute(otherCommand),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: { code: 'SOURCE_UPLOAD_TARGET_MISMATCH' },
    });
  });

  it('commits once before enqueueing, and replays without attaching or queueing again', async () => {
    await sessions.save(session);
    const hook = jest.fn(attach);
    const first = await useCase.execute(command(hook));
    const replay = await useCase.execute(command(hook));
    expect(replay.sources.map((source) => source.id)).toEqual(
      first.sources.map((source) => source.id),
    );
    expect(hook).toHaveBeenCalledTimes(1);
    expect(queueing.tryQueue).toHaveBeenCalledTimes(1);
  });

  it('attaches one set of sources for concurrent completions of the same session', async () => {
    await sessions.save(session);
    const hook = jest.fn(attach);
    const [first, second] = await Promise.all([
      useCase.execute(command(hook)),
      useCase.execute(command(hook)),
    ]);
    expect(first.sources.map((source) => source.id)).toEqual(
      second.sources.map((source) => source.id),
    );
    expect(hook).toHaveBeenCalledTimes(1);
    expect(
      await db
        .getRepository(ThreadSourceAssignmentRecord)
        .countBy({ threadId }),
    ).toBe(1);
  });

  it('preserves attached sources when queueing fails, then retries only queueing', async () => {
    await sessions.save(session);
    queueing.tryQueue.mockResolvedValueOnce(false);
    const hook = jest.fn(attach);
    const first = await useCase.execute(command(hook));
    expect(await sessions.findById(session.id)).toMatchObject({
      status: SourceUploadSessionStatus.SOURCES_CREATED,
      expectedETag: 'verified',
    });
    const replay = await useCase.execute(command(hook));
    expect(replay.sources.map((source) => source.id)).toEqual(
      first.sources.map((source) => source.id),
    );
    expect(hook).toHaveBeenCalledTimes(1);
  });
});
