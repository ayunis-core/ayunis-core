import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import {
  LocalSourceRepository,
  UNREFERENCED_LOOKUP_CHUNK_SIZE,
} from './local-source.repository';
import { SourceRecord } from './schema/source.record';
import type { SourceMapper } from './mappers/source.mapper';
import type { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';

const sourceSchema = new EntitySchema<SourceRecord>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  columns: {
    id: { type: 'uuid', primary: true },
    knowledgeBaseId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamp' },
  },
});

const skillSourceSchema = new EntitySchema({
  name: 'SkillSource',
  tableName: 'skill_sources',
  columns: {
    skillsId: { type: 'uuid', primary: true },
    sourcesId: { type: 'uuid', primary: true },
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const CANDIDATE_COUNT = 2 * UNREFERENCED_LOOKUP_CHUNK_SIZE + 500;
const EXCLUSION_STRIDE = 250;
const INSERT_CHUNK = 500;

type SourceRow = Pick<SourceRecord, 'id' | 'knowledgeBaseId' | 'createdAt'>;

describe('Unreferenced source lookup', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalSourceRepository;

  beforeAll(async () => {
    schemaName = `unreferenced_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [sourceSchema, skillSourceSchema],
      migrations: [],
      migrationsRun: false,
      // The skill reference check is raw SQL with an unqualified table name,
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
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('filters candidates across chunks down to orphaned sources older than the cutoff', async () => {
    const cutoff = new Date(Date.now() - 30 * DAY_MS);
    const old = new Date(Date.now() - 40 * DAY_MS);
    const recent = new Date(Date.now() - DAY_MS);
    const rows: SourceRow[] = [];
    const skillLinks: { skillsId: UUID; sourcesId: UUID }[] = [];
    const expected: UUID[] = [];
    for (let index = 0; index < CANDIDATE_COUNT; index += 1) {
      const id = randomUUID();
      const remainder = index % EXCLUSION_STRIDE;
      if (remainder === 0) {
        rows.push({ id, knowledgeBaseId: randomUUID(), createdAt: old });
      } else if (remainder === 1) {
        rows.push({ id, knowledgeBaseId: null, createdAt: recent });
      } else if (remainder === 2) {
        rows.push({ id, knowledgeBaseId: null, createdAt: old });
        skillLinks.push({ skillsId: randomUUID(), sourcesId: id });
      } else {
        rows.push({ id, knowledgeBaseId: null, createdAt: old });
        expected.push(id);
      }
    }
    const sources = dataSource.getRepository(SourceRecord);
    for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
      await sources.insert(rows.slice(start, start + INSERT_CHUNK));
    }
    await dataSource.getRepository('SkillSource').insert(skillLinks);
    const candidateIds = [
      ...rows.map((row) => row.id),
      randomUUID(),
      randomUUID(),
    ];

    const unreferenced = await repository.findUnreferencedIds(
      candidateIds,
      cutoff,
    );

    expect([...unreferenced].sort((a, b) => a.localeCompare(b))).toEqual(
      [...expected].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('returns nothing for an empty candidate list', async () => {
    await expect(
      repository.findUnreferencedIds([], new Date()),
    ).resolves.toEqual([]);
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
