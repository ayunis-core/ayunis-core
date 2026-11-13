import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ParentChildIndexerRepository } from './parent-child-index.repository';
import { ParentChildIndexerMapper } from './infrastructure/persistence/mappers/parent-child-indexer.mapper';
import { ParentChunk } from './domain/parent-chunk.entity';
import { ChildChunk } from './domain/child-chunk.entity';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { ChildChunkRecord } from './infrastructure/persistence/schema/child-chunk.record';

// Jest compiles each file on its own, so the records' decorators carry no
// column types here; these describe the same tables for the test connection.
const parentChunkSchema = new EntitySchema<ParentChunkRecord>({
  name: 'ParentChunkRecord',
  target: ParentChunkRecord,
  tableName: 'parent_chunks',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    relatedDocumentId: { type: String },
    relatedChunkId: { type: String },
    content: { type: String },
  },
});

const childChunkSchema = new EntitySchema<ChildChunkRecord>({
  name: 'ChildChunkRecord',
  target: ChildChunkRecord,
  tableName: 'child_chunks',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    parentId: { type: String },
    embedding1024: { name: 'embedding_1024', type: 'vector', nullable: true },
    embedding1536: { name: 'embedding_1536', type: 'vector', nullable: true },
    embedding2560: { name: 'embedding_2560', type: 'vector', nullable: true },
  },
});

const DOCUMENT_ID = randomUUID();

function vector(dimensions: number, seed: number): number[] {
  return Array.from({ length: dimensions }, (_, i) => ((seed + i) % 97) / 100);
}

function parent(index: number, children: number, id?: UUID): ParentChunk {
  const parentId = id ?? randomUUID();
  return new ParentChunk({
    id: parentId,
    relatedDocumentId: DOCUMENT_ID,
    relatedChunkId: randomUUID(),
    content: `Abschnitt ${index} der Niederschrift`,
    children: Array.from(
      { length: children },
      (_, child) =>
        new ChildChunk({ parentId, embedding: vector(1024, index + child) }),
    ),
  });
}

describe('ParentChildIndexerRepository against Postgres', () => {
  const schema = `ayc1814_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let runner: QueryRunner;
  let repository: ParentChildIndexerRepository;
  let statements: string[];

  const count = async (table: string): Promise<number> => {
    const rows: { count: string }[] = await runner.query(
      `SELECT count(*) FROM ${table}`,
    );
    return Number(rows[0].count);
  };

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      entities: [parentChunkSchema, childChunkSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.query('CREATE EXTENSION IF NOT EXISTS vector');
    await runner.createSchema(schema, true);
    await runner.query(`SET search_path TO "${schema}", public`);
    await runner.query(`CREATE TABLE parent_chunks (
      id uuid PRIMARY KEY,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(),
      "relatedDocumentId" uuid NOT NULL,
      "relatedChunkId" uuid NOT NULL,
      content text NOT NULL)`);
    await runner.query(`CREATE TABLE child_chunks (
      id uuid PRIMARY KEY,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(),
      "parentId" uuid NOT NULL REFERENCES parent_chunks(id) ON DELETE CASCADE,
      embedding_1024 vector(1024),
      embedding_1536 vector(1536),
      embedding_2560 vector(2560))`);
    repository = new ParentChildIndexerRepository(
      {} as never,
      new ParentChildIndexerMapper(),
      { tx: runner.manager } as never,
    );
  }, 120_000);

  beforeEach(async () => {
    await runner.query('TRUNCATE parent_chunks CASCADE');
    statements = [];
    const query = runner.query.bind(runner);
    jest.spyOn(runner, 'query').mockImplementation((sql, ...rest) => {
      statements.push(String(sql).trimStart().split(' ')[0].toUpperCase());
      return query(sql, ...rest);
    });
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await runner.query('SET search_path TO public');
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  it('writes every chunk and vector of a large document with inserts only', async () => {
    const parents = Array.from({ length: 1100 }, (_, i) => parent(i, 2));

    await repository.saveMany(parents);

    const written = statements.filter((kind) => kind !== 'SELECT').join(' ');
    expect(statements).not.toContain('SELECT');
    expect(statements.filter((kind) => kind === 'INSERT')).toHaveLength(8);
    expect(written).toMatch(/^START( INSERT){8} COMMIT$/);
    expect(await count('parent_chunks')).toBe(1100);
    expect(await count('child_chunks')).toBe(2200);
    const [stored]: { content: string; children: string; first: string }[] =
      await runner.query(
        `SELECT p.content, count(c.id) AS children,
                min(c.embedding_1024::text) AS first
         FROM parent_chunks p JOIN child_chunks c ON c."parentId" = p.id
         WHERE p.id = $1 GROUP BY p.id`,
        [parents[7].id],
      );
    expect(stored.content).toBe('Abschnitt 7 der Niederschrift');
    expect(Number(stored.children)).toBe(2);
    expect(JSON.parse(stored.first).slice(0, 3)).toEqual(
      vector(1024, 7).slice(0, 3),
    );
  }, 60_000);

  it('stores a vector in the column of its dimension', async () => {
    const parentId = randomUUID();
    await repository.saveMany([
      new ParentChunk({
        id: parentId,
        relatedDocumentId: DOCUMENT_ID,
        relatedChunkId: randomUUID(),
        content: 'Satzung',
        children: [new ChildChunk({ parentId, embedding: vector(1536, 3) })],
      }),
    ]);

    const [row]: { small: string | null; large: string | null }[] =
      await runner.query(
        `SELECT embedding_1024::text AS small, embedding_1536::text AS large
         FROM child_chunks WHERE "parentId" = $1`,
        [parentId],
      );
    expect(row.small).toBeNull();
    expect(JSON.parse(row.large ?? '[]')).toHaveLength(1536);
  });

  it('leaves nothing of a document behind when a later batch fails', async () => {
    const existing = parent(0, 1);
    await repository.saveMany([existing]);
    const parents = Array.from({ length: 600 }, (_, i) => parent(i + 1, 1));
    parents.push(parent(601, 1, existing.id));

    await expect(repository.saveMany(parents)).rejects.toThrow();

    expect(await count('parent_chunks')).toBe(1);
    expect(await count('child_chunks')).toBe(1);
  }, 60_000);

  it('writes nothing and opens no transaction for an empty list', async () => {
    await repository.saveMany([]);

    expect(statements).toEqual([]);
  });
});
