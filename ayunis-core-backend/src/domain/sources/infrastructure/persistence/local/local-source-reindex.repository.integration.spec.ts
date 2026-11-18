import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { LocalSourceReindexRepository } from './local-source-reindex.repository';
import { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';
import { TextSourceRecord } from './schema/source.record';
import { SourceContentChunkRecord } from './schema/source-content-chunk.record';

const sourceSchema = new EntitySchema<TextSourceRecord & { type: string }>({
  name: 'TextSourceRecord',
  target: TextSourceRecord,
  tableName: 'sources',
  columns: {
    id: { type: 'varchar', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    type: { type: 'varchar', default: 'text' },
    status: { type: 'varchar' },
    embeddingModelId: { type: 'varchar', nullable: true },
    processingError: { type: 'text', nullable: true },
    processingErrorCode: { type: 'varchar', nullable: true },
    processingStartedAt: { type: 'timestamp', nullable: true },
    knowledgeBaseId: { type: 'varchar', nullable: true },
    recordingId: { type: 'varchar', nullable: true },
  },
});

const detailsSchema = new EntitySchema({
  name: 'TextSourceDetails',
  tableName: 'text_source_details_record',
  columns: {
    id: { type: 'varchar', primary: true },
    sourceId: { type: 'varchar' },
  },
});

const chunkSchema = new EntitySchema<SourceContentChunkRecord>({
  name: 'SourceContentChunkRecord',
  target: SourceContentChunkRecord,
  tableName: 'source_content_chunks',
  columns: {
    id: { type: 'varchar', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    content: { type: 'text' },
    meta: { type: 'jsonb' },
  },
  relations: {
    source: {
      type: 'many-to-one',
      target: 'TextSourceDetails',
      joinColumn: { name: 'sourceId' },
    },
  },
});

const idTable = (name: string, columns: string[]) =>
  new EntitySchema({
    name,
    tableName: name,
    columns: {
      id: { type: 'varchar', primary: true },
      ...Object.fromEntries(
        columns.map((column) => [column, { type: 'varchar', nullable: true }]),
      ),
    },
  });

const linkTable = (name: string, left: string, right: string) =>
  new EntitySchema({
    name,
    tableName: name,
    columns: {
      [left]: { type: 'varchar', primary: true },
      [right]: { type: 'varchar', primary: true },
    },
  });

const MODEL_A = randomUUID();
const MODEL_B = randomUUID();

describe('Source re-index bookkeeping', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalSourceReindexRepository;

  beforeAll(async () => {
    schemaName = `reindex_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [
        sourceSchema,
        detailsSchema,
        chunkSchema,
        idTable('knowledge_bases', ['orgId']),
        idTable('recordings', ['orgId']),
        idTable('threads', ['userId']),
        idTable('users', ['orgId']),
        idTable('workspaces', ['orgId']),
        idTable('teams', ['org_id']),
        idTable('skills', ['userId', 'workspaceId', 'teamId', 'orgId']),
        linkTable('thread_source_assignments', 'threadId', 'sourceId'),
        linkTable('skill_sources', 'skillsId', 'sourcesId'),
      ],
      migrations: [],
      migrationsRun: false,
      // The queries are raw SQL with unqualified table names.
      extra: { options: `-c search_path=${schemaName}` },
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    repository = new LocalSourceReindexRepository(
      dataSource.getRepository(TextSourceRecord),
      new SourceContentChunkMapper(),
      new TransactionHost<TransactionalAdapterTypeOrm>({
        ...adapter.optionsFactory(dataSource),
        connectionName: undefined,
        enableTransactionProxy: false,
        defaultTxOptions: {},
        extraProviderTokens: [],
      }),
    );
  }, 30_000);

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

  async function insert(table: string, row: Record<string, unknown>) {
    await dataSource.getRepository(table).insert(row);
  }

  async function source(
    fields: Partial<{
      type: string;
      status: SourceStatus;
      embeddingModelId: string | null;
      knowledgeBaseId: string;
      recordingId: string;
      processingStartedAt: () => string;
      withChunk: boolean;
    }> = {},
  ): Promise<UUID> {
    const id = randomUUID();
    const { withChunk, ...columns } = fields;
    await insert('TextSourceRecord', {
      id,
      status: SourceStatus.READY,
      embeddingModelId: MODEL_A,
      ...columns,
    });
    if (withChunk) {
      const detailsId = randomUUID();
      await insert('TextSourceDetails', { id: detailsId, sourceId: id });
      await insert('SourceContentChunkRecord', {
        id: randomUUID(),
        content: 'Hebesatz der Grundsteuer B',
        meta: {},
        source: { id: detailsId },
      });
    }
    return id;
  }

  async function knowledgeBaseSource(
    orgId: UUID,
    fields: Parameters<typeof source>[0] = {},
  ): Promise<UUID> {
    const knowledgeBaseId = randomUUID();
    await insert('knowledge_bases', { id: knowledgeBaseId, orgId });
    return source({ ...fields, knowledgeBaseId });
  }

  async function statusOf(id: UUID): Promise<{
    status: string;
    embeddingModelId: string | null;
    processingErrorCode: string | null;
  }> {
    const [row] = await dataSource.query(
      `SELECT status, "embeddingModelId", "processingErrorCode"
       FROM sources WHERE id = $1`,
      [id],
    );
    return row;
  }

  describe('flagging an org for a new embedding model', () => {
    it("flags every path to the org's sources and none of another org's", async () => {
      const orgId = randomUUID();
      const otherOrgId = randomUUID();
      const knowledgeBase = await knowledgeBaseSource(orgId);
      const otherKnowledgeBase = await knowledgeBaseSource(otherOrgId);

      const recordingId = randomUUID();
      await insert('recordings', { id: recordingId, orgId });
      const recording = await source({ recordingId });

      const userId = randomUUID();
      const threadId = randomUUID();
      await insert('users', { id: userId, orgId });
      await insert('threads', { id: threadId, userId });
      const threadSource = await source();
      await insert('thread_source_assignments', {
        threadId,
        sourceId: threadSource,
      });

      const teamId = randomUUID();
      const workspaceId = randomUUID();
      const otherUserId = randomUUID();
      await insert('teams', { id: teamId, org_id: orgId });
      await insert('workspaces', { id: workspaceId, orgId });
      await insert('users', { id: otherUserId, orgId: otherOrgId });
      const skillSources: UUID[] = [];
      for (const owner of [
        { orgId },
        { teamId },
        { workspaceId },
        { userId },
      ]) {
        const skillId = randomUUID();
        await insert('skills', { id: skillId, ...owner });
        const skillSource = await source();
        await insert('skill_sources', {
          skillsId: skillId,
          sourcesId: skillSource,
        });
        skillSources.push(skillSource);
      }
      const otherSkillId = randomUUID();
      await insert('skills', { id: otherSkillId, userId: otherUserId });
      const otherSkillSource = await source();
      await insert('skill_sources', {
        skillsId: otherSkillId,
        sourcesId: otherSkillSource,
      });

      const flagged = await repository.flagOrgSourcesForReindex(orgId, MODEL_B);

      expect(new Set(flagged)).toEqual(
        new Set([knowledgeBase, recording, threadSource, ...skillSources]),
      );
      for (const untouched of [otherKnowledgeBase, otherSkillSource]) {
        await expect(statusOf(untouched)).resolves.toMatchObject({
          status: SourceStatus.READY,
        });
      }
      await expect(statusOf(knowledgeBase)).resolves.toMatchObject({
        status: SourceStatus.REINDEXING,
      });
    });

    it('flags sources indexed with another or an unknown model, failed ones with stored text and lost re-indexes, nothing else', async () => {
      const orgId = randomUUID();
      const otherModel = await knowledgeBaseSource(orgId);
      const unknownModel = await knowledgeBaseSource(orgId, {
        embeddingModelId: null,
      });
      const currentModel = await knowledgeBaseSource(orgId, {
        embeddingModelId: MODEL_B,
      });
      const failedWithText = await knowledgeBaseSource(orgId, {
        status: SourceStatus.FAILED,
        embeddingModelId: null,
        withChunk: true,
      });
      const failedWithoutText = await knowledgeBaseSource(orgId, {
        status: SourceStatus.FAILED,
        embeddingModelId: null,
      });
      const processing = await knowledgeBaseSource(orgId, {
        status: SourceStatus.PROCESSING,
      });
      const reindexing = await knowledgeBaseSource(orgId, {
        status: SourceStatus.REINDEXING,
        embeddingModelId: MODEL_B,
      });
      const dataSource = await knowledgeBaseSource(orgId, { type: 'data' });

      const flagged = await repository.flagOrgSourcesForReindex(orgId, MODEL_B);

      expect(new Set(flagged)).toEqual(
        new Set([otherModel, unknownModel, failedWithText, reindexing]),
      );
      for (const untouched of [currentModel, failedWithoutText, processing]) {
        await expect(statusOf(untouched)).resolves.not.toMatchObject({
          status: SourceStatus.REINDEXING,
        });
      }
      await expect(statusOf(dataSource)).resolves.toMatchObject({
        status: SourceStatus.READY,
      });
    });
  });

  it('flags a single ready source only when it was indexed with another model', async () => {
    const indexedWithA = await source();
    const indexedWithB = await source({ embeddingModelId: MODEL_B });
    const processing = await source({ status: SourceStatus.PROCESSING });

    await expect(
      repository.flagIfIndexedWithOtherModel(indexedWithA, MODEL_B),
    ).resolves.toBe(true);
    await expect(
      repository.flagIfIndexedWithOtherModel(indexedWithB, MODEL_B),
    ).resolves.toBe(false);
    await expect(
      repository.flagIfIndexedWithOtherModel(processing, MODEL_B),
    ).resolves.toBe(false);
    await expect(statusOf(indexedWithA)).resolves.toMatchObject({
      status: SourceStatus.REINDEXING,
    });
  });

  it('hands out re-indexes not queued for a while with their org, once per interval', async () => {
    const orgId = randomUUID();
    const longAgo = () => "now() - interval '1 hour'";
    const stale = await knowledgeBaseSource(orgId, {
      status: SourceStatus.REINDEXING,
      processingStartedAt: longAgo,
    });
    const fresh = await knowledgeBaseSource(orgId, {
      status: SourceStatus.REINDEXING,
      processingStartedAt: () => 'now()',
    });
    const unreachable = await source({
      status: SourceStatus.REINDEXING,
      processingStartedAt: longAgo,
    });
    const fifteenMinutes = 15 * 60 * 1000;

    const claimed = await repository.claimStaleReindexing(fifteenMinutes, 100);

    expect(claimed).toContainEqual({ sourceId: stale, orgId });
    expect(claimed.map((target) => target.sourceId)).not.toContain(fresh);
    expect(claimed.map((target) => target.sourceId)).not.toContain(unreachable);
    const again = await repository.claimStaleReindexing(fifteenMinutes, 100);
    expect(again.map((target) => target.sourceId)).not.toContain(stale);

    await expect(repository.deferReindex(fresh)).resolves.toBe(true);
    const deferred = await repository.claimStaleReindexing(fifteenMinutes, 100);
    expect(deferred).toContainEqual({ sourceId: fresh, orgId });
  });

  it('leaves REINDEXING only from REINDEXING, and a failed one keeps no model', async () => {
    const completed = await source({ status: SourceStatus.REINDEXING });
    const failed = await source({ status: SourceStatus.REINDEXING });
    const deletedMeanwhile = randomUUID();
    const alreadyReady = await source();

    await expect(repository.completeReindex(completed, MODEL_B)).resolves.toBe(
      true,
    );
    await expect(
      repository.failReindex(failed, {
        message: 'Embedding provider unavailable',
        code: SourceProcessingErrorCode.PROCESSING_UNAVAILABLE,
      }),
    ).resolves.toBe(true);
    await expect(
      repository.completeReindex(deletedMeanwhile, MODEL_B),
    ).resolves.toBe(false);
    await expect(
      repository.failReindex(alreadyReady, {
        message: 'late failure',
        code: SourceProcessingErrorCode.PROCESSING_FAILED,
      }),
    ).resolves.toBe(false);

    await expect(statusOf(completed)).resolves.toEqual({
      status: SourceStatus.READY,
      embeddingModelId: MODEL_B,
      processingErrorCode: null,
    });
    await expect(statusOf(failed)).resolves.toEqual({
      status: SourceStatus.FAILED,
      embeddingModelId: null,
      processingErrorCode: SourceProcessingErrorCode.PROCESSING_UNAVAILABLE,
    });
    await expect(statusOf(alreadyReady)).resolves.toMatchObject({
      status: SourceStatus.READY,
      embeddingModelId: MODEL_A,
    });
  });

  it('reads the stored chunks of a source', async () => {
    const withText = await source({ withChunk: true });

    const chunks = await repository.findContentChunks(withText);

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      'Hebesatz der Grundsteuer B',
    ]);
    await expect(repository.findContentChunks(randomUUID())).resolves.toEqual(
      [],
    );
  });
});
