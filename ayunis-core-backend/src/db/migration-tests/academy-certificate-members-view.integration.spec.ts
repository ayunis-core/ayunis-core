import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateAcademyCertificateMembersView1792430205613 } from 'src/db/migrations/1792430205613-CreateAcademyCertificateMembersView';

const migration = new CreateAcademyCertificateMembersView1792430205613();
const orgId = randomUUID();
const completedUserId = randomUUID();
const pendingUserId = randomUUID();

async function createFixtures(runner: QueryRunner): Promise<void> {
  await runner.query(`
    CREATE TABLE users (id uuid PRIMARY KEY, "orgId" uuid, name text, email text);
    CREATE TABLE academy_completion (id uuid PRIMARY KEY, "userId" uuid UNIQUE REFERENCES users(id), "completedAt" timestamp);
    CREATE TABLE sources (id uuid PRIMARY KEY, "processingProgress" jsonb);
    CREATE TABLE typeorm_metadata (id serial PRIMARY KEY, type varchar, database varchar, schema varchar, "table" varchar, name varchar, value text);
  `);
  await runner.query(
    `INSERT INTO users VALUES ($1, $3, 'Lena Müller', 'lena@example.com'), ($2, $3, 'Ben Becker', 'ben@example.com')`,
    [completedUserId, pendingUserId, orgId],
  );
  await runner.query(
    `INSERT INTO academy_completion VALUES ($1, $2, '2025-01-15 12:00:00')`,
    [randomUUID(), completedUserId],
  );
  await runner.query(`INSERT INTO sources VALUES ($1, '{"processed":7}')`, [
    randomUUID(),
  ]);
}

async function existingState(runner: QueryRunner, schema: string) {
  return {
    columns: await runner.query(
      `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns WHERE table_schema = $1
       AND table_name IN ('users', 'academy_completion', 'sources')
       ORDER BY table_name, ordinal_position`,
      [schema],
    ),
    users: await runner.query('SELECT * FROM users ORDER BY id'),
    completions: await runner.query(
      'SELECT * FROM academy_completion ORDER BY id',
    ),
    sources: await runner.query('SELECT * FROM sources ORDER BY id'),
  };
}

describe('Academy certificate members view migration', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let schema: string;

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
  });

  beforeEach(async () => {
    schema = `academy_view_migration_${randomUUID().replaceAll('-', '')}`;
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}", public`);
    await createFixtures(runner);
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  it('only adds the view and metadata while preserving existing columns and rows', async () => {
    const before = await existingState(runner, schema);
    const queries = jest.spyOn(runner, 'query');
    await migration.up(runner);
    const statements = queries.mock.calls.map(([sql]) => sql);
    queries.mockRestore();
    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatch(
      /^CREATE VIEW "academy_certificate_members" AS SELECT /,
    );
    expect(statements[1]).toMatch(/^INSERT INTO "typeorm_metadata"/);
    expect(await existingState(runner, schema)).toEqual(before);
    expect(
      await runner.query(
        `SELECT "userId", "orgId", name, "completedAt"::text FROM academy_certificate_members ORDER BY name`,
      ),
    ).toEqual([
      { userId: pendingUserId, orgId, name: 'Ben Becker', completedAt: null },
      {
        userId: completedUserId,
        orgId,
        name: 'Lena Müller',
        completedAt: '2025-01-15 12:00:00',
      },
    ]);
  });

  it('can revert and reapply without changing existing data', async () => {
    const before = await existingState(runner, schema);
    await migration.up(runner);
    await migration.down(runner);
    expect(await existingState(runner, schema)).toEqual(before);
    expect(await runner.query('SELECT * FROM typeorm_metadata')).toEqual([]);
    expect(
      await runner.query(
        `SELECT viewname FROM pg_views WHERE schemaname = $1 AND viewname = 'academy_certificate_members'`,
        [schema],
      ),
    ).toEqual([]);
    await migration.up(runner);
    expect(await existingState(runner, schema)).toEqual(before);
    expect(
      await runner.query('SELECT "userId" FROM academy_certificate_members'),
    ).toHaveLength(2);
  });
});
