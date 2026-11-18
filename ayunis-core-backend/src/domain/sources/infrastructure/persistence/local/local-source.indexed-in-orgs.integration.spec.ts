import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { LocalSourceRepository } from './local-source.repository';
import { SourceRecord } from './schema/source.record';
import type { SourceMapper } from './mappers/source.mapper';
import type { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';

// `type` is the table-inheritance discriminator, which has no entity property.
const sourceSchema = new EntitySchema<SourceRecord & { type: SourceType }>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  columns: {
    id: { type: 'varchar', primary: true },
    type: { type: 'varchar' },
    status: { type: 'varchar' },
    knowledgeBaseId: { type: 'varchar', nullable: true },
    recordingId: { type: 'varchar', nullable: true },
  },
});

function idTable(name: string, tableName: string, columns: string[]) {
  return new EntitySchema({
    name,
    tableName,
    columns: Object.fromEntries([
      ['id', { type: 'varchar', primary: true }],
      ...columns.map((column) => [column, { type: 'varchar', nullable: true }]),
    ]),
  });
}

const schemas = [
  sourceSchema,
  idTable('KnowledgeBase', 'knowledge_bases', ['orgId']),
  idTable('Recording', 'recordings', ['orgId']),
  idTable('Thread', 'threads', ['userId']),
  idTable('User', 'users', ['orgId']),
  idTable('Workspace', 'workspaces', ['orgId']),
  idTable('Team', 'teams', ['org_id']),
  idTable('Skill', 'skills', ['userId', 'workspaceId', 'teamId', 'orgId']),
  new EntitySchema({
    name: 'ThreadSourceAssignment',
    tableName: 'thread_source_assignments',
    columns: {
      threadId: { type: 'varchar', primary: true },
      sourceId: { type: 'varchar', primary: true },
    },
  }),
  new EntitySchema({
    name: 'SkillSource',
    tableName: 'skill_sources',
    columns: {
      skillsId: { type: 'varchar', primary: true },
      sourcesId: { type: 'varchar', primary: true },
    },
  }),
];

describe('Indexed sources of organizations', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalSourceRepository;

  beforeAll(async () => {
    schemaName = `indexed_in_orgs_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: schemas,
      migrations: [],
      migrationsRun: false,
      // The reachability query is raw SQL with unqualified table names,
      // so every pooled connection must resolve it inside the throwaway schema.
      extra: { options: `-c search_path=${schemaName}` },
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalSourceRepository(
      dataSource.getRepository(SourceRecord),
      {} as SourceMapper,
      {} as SourceContentChunkMapper,
      createTransactionHost(dataSource),
    );
  }, 30_000);

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

  async function insert(entity: string, row: Record<string, unknown>) {
    await dataSource.getRepository(entity).insert(row);
  }

  async function insertSource(
    overrides: Partial<Record<keyof SourceRecord | 'type', unknown>> = {},
  ): Promise<UUID> {
    const id = randomUUID();
    await insert('SourceRecord', {
      id,
      type: SourceType.TEXT,
      status: SourceStatus.READY,
      ...overrides,
    });
    return id;
  }

  async function insertUser(orgId: UUID): Promise<UUID> {
    const id = randomUUID();
    await insert('User', { id, orgId });
    return id;
  }

  async function attachToSkill(
    sourceId: UUID,
    owner: Record<string, UUID>,
  ): Promise<void> {
    const skillId = randomUUID();
    await insert('Skill', { id: skillId, ...owner });
    await insert('SkillSource', { skillsId: skillId, sourcesId: sourceId });
  }

  it('finds a knowledge-base document of the organization', async () => {
    const orgId = randomUUID();
    const knowledgeBaseId = randomUUID();
    await insert('KnowledgeBase', { id: knowledgeBaseId, orgId });
    await insertSource({ knowledgeBaseId });

    await expect(repository.hasIndexedSourceInOrgs([orgId])).resolves.toBe(
      true,
    );
  });

  it('finds a recording transcript of the organization', async () => {
    const orgId = randomUUID();
    const recordingId = randomUUID();
    await insert('Recording', { id: recordingId, orgId });
    await insertSource({ recordingId });

    await expect(repository.hasIndexedSourceInOrgs([orgId])).resolves.toBe(
      true,
    );
  });

  it("finds a chat document through its thread owner's organization", async () => {
    const orgId = randomUUID();
    const threadId = randomUUID();
    await insert('Thread', { id: threadId, userId: await insertUser(orgId) });
    const sourceId = await insertSource();
    await insert('ThreadSourceAssignment', { threadId, sourceId });

    await expect(repository.hasIndexedSourceInOrgs([orgId])).resolves.toBe(
      true,
    );
  });

  it.each<[string, (orgId: UUID) => Promise<Record<string, UUID>>]>([
    ['personal', async (orgId) => ({ userId: await insertUser(orgId) })],
    [
      'workspace',
      async (orgId) => {
        const workspaceId = randomUUID();
        await insert('Workspace', { id: workspaceId, orgId });
        return { workspaceId };
      },
    ],
    [
      'team',
      async (orgId) => {
        const teamId = randomUUID();
        await insert('Team', { id: teamId, org_id: orgId });
        return { teamId };
      },
    ],
    ['org', (orgId) => Promise.resolve({ orgId })],
  ])(
    "finds a %s skill's document through the skill owner's organization",
    async (_owner, createOwner) => {
      const orgId = randomUUID();
      await attachToSkill(await insertSource(), await createOwner(orgId));

      await expect(repository.hasIndexedSourceInOrgs([orgId])).resolves.toBe(
        true,
      );
    },
  );

  it("ignores another organization's documents", async () => {
    const orgId = randomUUID();
    const otherOrgId = randomUUID();
    const knowledgeBaseId = randomUUID();
    await insert('KnowledgeBase', { id: knowledgeBaseId, orgId: otherOrgId });
    await insertSource({ knowledgeBaseId });
    await attachToSkill(await insertSource(), {
      userId: await insertUser(otherOrgId),
    });

    await expect(repository.hasIndexedSourceInOrgs([orgId])).resolves.toBe(
      false,
    );
    await expect(
      repository.hasIndexedSourceInOrgs([orgId, otherOrgId]),
    ).resolves.toBe(true);
  });

  it('ignores failed documents and data sources, which hold no vectors', async () => {
    const orgId = randomUUID();
    const knowledgeBaseId = randomUUID();
    await insert('KnowledgeBase', { id: knowledgeBaseId, orgId });
    await insertSource({ knowledgeBaseId, status: SourceStatus.FAILED });
    await insertSource({ knowledgeBaseId, type: SourceType.DATA });

    await expect(repository.hasIndexedSourceInOrgs([orgId])).resolves.toBe(
      false,
    );
  });

  it('counts a document that is still being indexed', async () => {
    const orgId = randomUUID();
    const knowledgeBaseId = randomUUID();
    await insert('KnowledgeBase', { id: knowledgeBaseId, orgId });
    await insertSource({ knowledgeBaseId, status: SourceStatus.PROCESSING });

    await expect(repository.hasIndexedSourceInOrgs([orgId])).resolves.toBe(
      true,
    );
  });
});

function createTransactionHost(
  dataSource: DataSource,
): TransactionHost<TransactionalAdapterTypeOrm> {
  const adapter = new TransactionalAdapterTypeOrm({
    dataSourceToken: DataSource,
  });
  return new TransactionHost<TransactionalAdapterTypeOrm>({
    ...adapter.optionsFactory(dataSource),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: {},
    extraProviderTokens: [],
  });
}
