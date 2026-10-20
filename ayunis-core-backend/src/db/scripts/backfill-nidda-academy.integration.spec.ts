import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';

const NIDDA_ORG_ID = '64dc46da-a9b8-4510-b666-1c0c9b6d9517';
const CUTOFF = '2026-10-07T12:09:09.646Z';
const COMPLETED_AT = '2026-10-07 00:00:00';

describe('AYC-1180 Stadt Nidda Academy backfill', () => {
  let db: DataSource;
  let runner: QueryRunner;

  beforeAll(async () => {
    db = new DataSource({
      ...typeormConfigRaw,
      entities: [],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
  });

  beforeEach(async () => {
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE TEMP TABLE users (
      id varchar PRIMARY KEY, "orgId" varchar NOT NULL,
      "createdAt" timestamp NOT NULL
    ) ON COMMIT DROP`);
    await runner.query(`CREATE TEMP TABLE academy_completion (
      id varchar PRIMARY KEY, "userId" varchar NOT NULL UNIQUE REFERENCES users(id)
      ON DELETE CASCADE, "completedAt" timestamp NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    ) ON COMMIT DROP`);
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  afterAll(async () => {
    if (db.isInitialized) await db.destroy();
  });

  function backfill(): Promise<unknown[]> {
    const sql = readFileSync(
      join(__dirname, 'backfill-nidda-academy.sql'),
      'utf8',
    );
    return runner.query(sql) as Promise<unknown[]>;
  }

  async function createUser(orgId = NIDDA_ORG_ID, createdAt = CUTOFF) {
    const id = randomUUID();
    await runner.query('INSERT INTO users VALUES ($1, $2, $3)', [
      id,
      orgId,
      createdAt,
    ]);
    return id;
  }

  async function completions() {
    return runner.query(
      `SELECT "userId", to_char("completedAt", 'YYYY-MM-DD HH24:MI:SS')
       AS "completedAt" FROM academy_completion ORDER BY "userId"`,
    ) as Promise<{ userId: string; completedAt: string }[]>;
  }

  it('records a completion for a Nidda account existing at the confirmation cutoff', async () => {
    const userId = await createUser();

    await backfill();

    expect(await completions()).toEqual([
      { userId, completedAt: COMPLETED_AT },
    ]);
  });

  it('excludes later Nidda accounts and accounts in other organizations', async () => {
    await createUser(NIDDA_ORG_ID, '2026-10-07T12:09:09.647Z');
    await createUser(randomUUID(), '2026-10-01T00:00:00.000Z');

    await backfill();

    expect(await completions()).toEqual([]);
  });

  it('preserves every field of existing completions, including on a rerun', async () => {
    const userId = await createUser();
    await runner.query('INSERT INTO academy_completion VALUES ($1, $2, $3)', [
      randomUUID(),
      userId,
      '2026-08-01T09:00:00.000Z',
    ]);
    const before = await runner.query('SELECT * FROM academy_completion');

    await backfill();
    await backfill();

    expect(await runner.query('SELECT * FROM academy_completion')).toEqual(
      before,
    );
  });

  it('is idempotent for inserted completions', async () => {
    await createUser();
    await backfill();
    const before = await runner.query('SELECT * FROM academy_completion');

    expect(await backfill()).toEqual([]);
    expect(await runner.query('SELECT * FROM academy_completion')).toEqual(
      before,
    );
  });

  it('supports an empty organization', async () => {
    expect(await backfill()).toEqual([]);
  });

  it('rolls back the repair when the operator previews it', async () => {
    await createUser();
    await runner.query('SAVEPOINT preview');
    await backfill();
    expect(await completions()).toHaveLength(1);

    await runner.query('ROLLBACK TO SAVEPOINT preview');

    expect(await completions()).toEqual([]);
  });

  it('does not certify an account recreated after the cutoff', async () => {
    const userId = await createUser();
    await backfill();
    await runner.query('DELETE FROM users WHERE id = $1', [userId]);
    await createUser(NIDDA_ORG_ID, '2026-10-20T00:00:00.000Z');

    await backfill();

    expect(await completions()).toEqual([]);
  });

  it('preserves all prior data when one eligible completion cannot be inserted', async () => {
    await createUser();
    const rejectedUserId = await createUser();
    await runner.query(
      `ALTER TABLE academy_completion ADD CHECK ("userId" <> '${rejectedUserId}')`,
    );
    await runner.query('SAVEPOINT invalid_completion');

    await expect(backfill()).rejects.toMatchObject({ code: '23514' });
    await runner.query('ROLLBACK TO SAVEPOINT invalid_completion');

    expect(await completions()).toEqual([]);
  });
});
