import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import { MemoryEntryMapper } from './mappers/memory-entry.mapper';
import { MemoryEntryRecord } from './schema/memory-entry.record';
import { LocalMemoryRepository } from './local-memory.repository';

const memoryEntrySchema = new EntitySchema<MemoryEntryRecord>({
  name: 'MemoryEntryRecord',
  target: MemoryEntryRecord,
  tableName: 'user_memory_entries',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    userId: { type: String },
    key: { type: String },
    content: { type: 'text' },
    description: { type: String, nullable: true },
  },
  uniques: [{ columns: ['userId', 'key'] }],
});

describe('LocalMemoryRepository', () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const schema = `ayc1817_memory_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let repository: LocalMemoryRepository;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [memoryEntrySchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    repository = new LocalMemoryRepository(
      db.getRepository(MemoryEntryRecord),
      new MemoryEntryMapper(),
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  beforeEach(async () => {
    await db.getRepository(MemoryEntryRecord).clear();
  });

  const write = (
    userId: typeof userA,
    key: string,
    content: string,
    { description = null as string | null, keepDescription = false } = {},
  ) =>
    repository.upsertWithinLimit(
      new MemoryEntry({ userId, key, content, description }),
      { limit: 3, keepDescription },
    );

  it('replaces the content of an existing key instead of adding a second entry', async () => {
    const first = await write(userA, 'personal', 'Bauamt');

    const second = await write(userA, 'personal', 'Ordnungsamt');

    expect(second?.id).toBe(first?.id);
    expect(await repository.findAllByUserId(userA)).toEqual([
      expect.objectContaining({ key: 'personal', content: 'Ordnungsamt' }),
    ]);
  });

  it('keeps the stored description only when the write asks for it', async () => {
    await write(userA, 'reports', 'Gliederung A', {
      description: 'Wenn Ratsberichte entstehen',
    });

    const kept = await write(userA, 'reports', 'Gliederung B', {
      keepDescription: true,
    });
    const cleared = await write(userA, 'reports', 'Gliederung C');

    expect(kept?.description).toBe('Wenn Ratsberichte entstehen');
    expect(cleared?.description).toBeNull();
  });

  it('leaves another user’s entry of the same key untouched on write and delete', async () => {
    await write(userA, 'personal', 'Bauamt');
    await write(userB, 'personal', 'Kämmerei');

    await write(userA, 'personal', 'Ordnungsamt');
    await repository.deleteByUserIdAndKey(userA, 'personal');

    expect(await repository.findAllByUserId(userA)).toEqual([]);
    expect(await repository.findAllByUserId(userB)).toEqual([
      expect.objectContaining({ key: 'personal', content: 'Kämmerei' }),
    ]);
  });

  // Tool calls of one turn run concurrently, so new keys can race each other.
  it('never stores more new keys than the limit, even when the writes race', async () => {
    const results = await Promise.all(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((key) => write(userA, key, key)),
    );

    expect(results.filter((result) => result === null)).toHaveLength(3);
    expect(await repository.findAllByUserId(userA)).toHaveLength(3);
  });

  it('still updates an existing key once the limit is reached', async () => {
    for (const key of ['a', 'b', 'c']) await write(userA, key, key);

    expect(await write(userA, 'd', 'd')).toBeNull();
    expect(await write(userA, 'a', 'neu')).toEqual(
      expect.objectContaining({ key: 'a', content: 'neu' }),
    );
  });
});
