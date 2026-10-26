import { AddUrlToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.command';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { selectCrawledFilesWithinCapacity } from 'src/domain/sources/infrastructure/persistence/local/crawled-file-sources.helpers';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { KnowledgeBaseSourceLimitExceededError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { LocalKnowledgeBaseRepository } from './local-knowledge-base.repository';

const knowledgeBaseSchema = new EntitySchema<KnowledgeBaseRecord>({
  name: 'KnowledgeBaseRecord',
  target: KnowledgeBaseRecord,
  tableName: 'knowledge_bases',
  columns: { id: { type: 'uuid', primary: true } },
});
const sourceSchema = new EntitySchema<SourceRecord>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  columns: {
    id: { type: 'uuid', primary: true },
    knowledgeBaseId: { type: 'uuid', nullable: true },
  },
  relations: {
    knowledgeBase: {
      type: 'many-to-one',
      target: 'KnowledgeBaseRecord',
      joinColumn: { name: 'knowledgeBaseId' },
    },
  },
});

describe('Knowledge-base capacity across source writers', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalKnowledgeBaseRepository;
  const transactions = new AsyncLocalStorage<EntityManager>();
  beforeAll(async () => {
    schema = `source_capacity_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [knowledgeBaseSchema, sourceSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    const txHost = {
      get tx() {
        return transactions.getStore() ?? db.manager;
      },
      withTransaction: (operation: () => Promise<unknown>) =>
        db.transaction((manager) => transactions.run(manager, operation)),
    };
    repository = new LocalKnowledgeBaseRepository(
      db.getRepository(KnowledgeBaseRecord),
      db.getRepository(SourceRecord),
      {} as never,
      {
        toDomain: (record: KnowledgeBaseRecord) =>
          new PersonalKnowledgeBase({
            id: record.id,
            name: 'Statutes',
            orgId: randomUUID(),
            userId: randomUUID(),
          }),
      } as never,
      {} as never,
      txHost as never,
    );
  }, 30_000);
  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  async function addUrl(
    knowledgeBaseId: ReturnType<typeof randomUUID>,
    id: ReturnType<typeof randomUUID>,
  ) {
    const create = {
      execute: async () => {
        await transactions
          .getStore()!
          .getRepository(SourceRecord)
          .update(id, { knowledgeBaseId });
        return new UrlSource({
          id,
          knowledgeBaseId,
          name: 'Statutes',
          url: 'https://municipality.test/statutes',
          type: TextType.WEB,
        });
      },
    };
    const enqueue = {
      execute: async () => {
        expect(transactions.getStore()).toBeUndefined();
        expect(
          (await db.getRepository(SourceRecord).findOneByOrFail({ id }))
            .knowledgeBaseId,
        ).toBe(knowledgeBaseId);
      },
    };
    const txHost = {
      withTransaction: (operation: () => Promise<unknown>) =>
        db.transaction((manager) => transactions.run(manager, operation)),
    };
    const useCase = new AddUrlToKnowledgeBaseUseCase(
      repository,
      { requireWrite: async () => undefined } as never,
      create as never,
      enqueue as never,
      {} as never,
      { get: () => randomUUID() } as never,
      txHost as never,
    );
    return useCase.execute(
      new AddUrlToKnowledgeBaseCommand({
        knowledgeBaseId,
        url: 'https://municipality.test/statutes',
        maxDepth: 0,
      }),
    );
  }

  it.each(['upload', 'URL'])(
    'rejects a %s admission racing the last slot taken by a PDF registration',
    async (kind) => {
      const knowledgeBaseId = randomUUID();
      const uploadId = randomUUID();
      const rootId = randomUUID();
      await db
        .getRepository(KnowledgeBaseRecord)
        .insert({ id: knowledgeBaseId });
      await db.getRepository(SourceRecord).insert([
        { id: rootId, knowledgeBaseId },
        ...Array.from({ length: 498 }, () => ({
          id: randomUUID(),
          knowledgeBaseId,
        })),
        { id: uploadId },
      ]);
      const pdf = new FileSource({
        name: 'Statute',
        type: TextType.FILE,
        fileType: FileType.PDF,
        knowledgeBaseId,
      });
      let unlock!: () => void;
      let locked!: () => void;
      const release = new Promise<void>((resolve) => {
        unlock = resolve;
      });
      const acquired = new Promise<void>((resolve) => {
        locked = resolve;
      });
      const registration = db.transaction(async (manager) => {
        const selected = await selectCrawledFilesWithinCapacity(
          manager,
          rootId,
          [pdf],
          500,
        );
        expect(selected).toHaveLength(1);
        locked();
        await release;
        await manager
          .getRepository(SourceRecord)
          .insert({ id: pdf.id, knowledgeBaseId });
      });
      await acquired;
      const admission = (
        kind === 'upload'
          ? repository.assignSourceToKnowledgeBase(uploadId, knowledgeBaseId)
          : addUrl(knowledgeBaseId, uploadId)
      ).then(
        () => undefined,
        (error: unknown) => error,
      );
      try {
        // Wait for the competing writer to reach its database lock, not a timer guess.
        let waiting = false;
        for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
          const rows = await db.query<Array<{ waiting: boolean }>>(
            "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE $1) AS waiting",
            [`%${schema}%`],
          );
          waiting = rows[0].waiting;
          if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
      } finally {
        unlock();
      }
      await registration;
      expect(await admission).toBeInstanceOf(
        KnowledgeBaseSourceLimitExceededError,
      );
      expect(
        await db.getRepository(SourceRecord).countBy({ knowledgeBaseId }),
      ).toBe(500);
      expect(
        (await db.getRepository(SourceRecord).findOneByOrFail({ id: uploadId }))
          .knowledgeBaseId,
      ).toBeNull();
    },
  );
  it('allows an unchanged assignment when the collection is already full', async () => {
    const knowledgeBaseId = randomUUID();
    const id = randomUUID();
    await db.getRepository(KnowledgeBaseRecord).insert({ id: knowledgeBaseId });
    await db.getRepository(SourceRecord).insert([
      { id, knowledgeBaseId },
      ...Array.from({ length: 499 }, () => ({
        id: randomUUID(),
        knowledgeBaseId,
      })),
    ]);
    await repository.assignSourceToKnowledgeBase(id, knowledgeBaseId);
    expect(
      await db.getRepository(SourceRecord).countBy({ knowledgeBaseId }),
    ).toBe(500);
  });
});
