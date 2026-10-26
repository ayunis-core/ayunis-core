import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';

import { UniqueThreadSourceAssignments1792764440690 } from 'src/db/migrations/1792764440690-UniqueThreadSourceAssignments';

describe('thread source uniqueness migration', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new UniqueThreadSourceAssignments1792764440690();

  beforeAll(async () => {
    db = new DataSource({
      ...typeormConfigRaw,
      entities: [],
      migrations: [],
      migrationsRun: false,
      synchronize: false,
      logging: false,
    });
    await db.initialize();
  }, 30_000);

  beforeEach(async () => {
    schema = `ayc547_${randomUUID().replaceAll('-', '')}`;
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.createSchema(schema, true);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`CREATE TABLE thread_source_assignments (
      id varchar PRIMARY KEY, "threadId" varchar NOT NULL,
      "sourceId" varchar NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now(), "originSkillId" uuid
    )`);
  });

  afterEach(async () => {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.query('SET search_path TO public');
    await runner.dropSchema(schema, true, true);
    await runner.release();
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  async function migrate(): Promise<void> {
    const ownsTransaction = !runner.isTransactionActive;
    if (ownsTransaction) await runner.startTransaction();
    try {
      await migration.up(runner);
      if (ownsTransaction) await runner.commitTransaction();
    } catch (error) {
      if (ownsTransaction) await runner.rollbackTransaction();
      throw error;
    }
  }

  async function insert(
    id: string,
    threadId = 'thread-1',
    sourceId = 'source-1',
  ): Promise<void> {
    await runner.query(
      `INSERT INTO thread_source_assignments (id, "threadId", "sourceId") VALUES ($1, $2, $3)`,
      [id, threadId, sourceId],
    );
  }

  async function rows(): Promise<Record<string, unknown>[]> {
    return runner.query('SELECT * FROM thread_source_assignments ORDER BY id');
  }

  it('retains the oldest assignment and its provenance, with id breaking timestamp ties', async () => {
    const skillId = randomUUID();
    await runner.query(
      `INSERT INTO thread_source_assignments (id, "threadId", "sourceId", "createdAt", "originSkillId") VALUES
      ('newer', 'thread-1', 'source-1', '2026-02-01', NULL),
      ('oldest', 'thread-1', 'source-1', '2026-01-01', $1),
      ('tie-b', 'thread-2', 'source-1', '2026-01-01', $1),
      ('tie-a', 'thread-2', 'source-1', '2026-01-01', NULL),
      ('other-source', 'thread-1', 'source-2', '2026-01-01', NULL)`,
      [skillId],
    );
    const before = await rows();
    await migrate();
    expect(await rows()).toEqual(
      before.filter((row) =>
        ['oldest', 'tie-a', 'other-source'].includes(String(row.id)),
      ),
    );
  });

  it('preserves already unique assignments and permits distinct pairs', async () => {
    await insert('original');
    const before = await rows();
    await migrate();
    expect(await rows()).toEqual(before);
    await insert('other-thread', 'thread-2');
    await insert('other-source', 'thread-1', 'source-2');
    expect(await rows()).toHaveLength(3);
  });

  it('applies to an empty table and rejects a repeated pair with 23505', async () => {
    await migrate();
    await insert('first');
    await expect(insert('duplicate')).rejects.toMatchObject({ code: '23505' });
    expect(await rows()).toHaveLength(1);
  });

  it('allows removal followed by recreation with fresh provenance', async () => {
    await migrate();
    await insert('first');
    await runner.query('DELETE FROM thread_source_assignments WHERE id = $1', [
      'first',
    ]);
    const skillId = randomUUID();
    await runner.query(
      `INSERT INTO thread_source_assignments (id, "threadId", "sourceId", "originSkillId") VALUES ('recreated', 'thread-1', 'source-1', $1)`,
      [skillId],
    );
    expect(await rows()).toEqual([
      expect.objectContaining({ id: 'recreated', originSkillId: skillId }),
    ]);
  });

  it('rolls back deduplication and the constraint together when the transaction fails', async () => {
    await insert('first');
    await insert('duplicate');
    const before = await rows();
    await runner.startTransaction();
    await migrate();
    await expect(runner.query('SELECT 1 / 0')).rejects.toMatchObject({
      code: '22012',
    });
    await runner.rollbackTransaction();
    expect(await rows()).toEqual(before);
    await insert('after-rollback');
  });

  it('reverts and reruns without resurrecting removed duplicates', async () => {
    await insert('first');
    await insert('duplicate');
    await migrate();
    const retained = await rows();
    await migration.down(runner);
    expect(await rows()).toEqual(retained);
    await insert('new-duplicate');
    await migrate();
    expect(await rows()).toEqual(retained);
  });

  it('permits exactly one of two concurrent inserts for the same pair', async () => {
    await migrate();
    const connections = [db.createQueryRunner(), db.createQueryRunner()];
    try {
      for (const connection of connections) {
        await connection.connect();
        await connection.query(`SET search_path TO "${schema}"`);
      }
      const outcomes = await Promise.allSettled(
        connections.map((connection, index) =>
          connection.query(
            `INSERT INTO thread_source_assignments (id, "threadId", "sourceId") VALUES ($1, 'thread-1', 'source-1')`,
            [`concurrent-${index}`],
          ),
        ),
      );
      expect(
        outcomes.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        outcomes.find((result) => result.status === 'rejected'),
      ).toMatchObject({ reason: { code: '23505' } });
      expect(await rows()).toHaveLength(1);
    } finally {
      for (const connection of connections) {
        await connection.query('SET search_path TO public');
        await connection.release();
      }
    }
  });
});
