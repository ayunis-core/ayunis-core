import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ReplaceWorkspaceOwnerWithMembers1794262673043 } from 'src/db/migrations/1794262673043-ReplaceWorkspaceOwnerWithMembers';

const migration = new ReplaceWorkspaceOwnerWithMembers1794262673043();
const anna = randomUUID();
const ben = randomUUID();
const clara = randomUUID();
const budget = randomUUID();
const permits = randomUUID();
const budgetCreatedAt = new Date('2026-03-01T09:00:00Z');
const permitsCreatedAt = new Date('2026-04-01T09:00:00Z');

describe('ReplaceWorkspaceOwnerWithMembers migration', () => {
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
  }, 30_000);

  beforeEach(async () => {
    schema = `ayc1696_${randomUUID().replaceAll('-', '')}`;
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    // The generated statements name the enum type and indexes in "public",
    // which already holds the migrated schema; point them at the test schema.
    const query = runner.query.bind(runner);
    jest
      .spyOn(runner, 'query')
      .mockImplementation((sql: string, parameters?: unknown[]) =>
        query(sql.replaceAll('"public".', `"${schema}".`), parameters),
      );
    await createPreMigrationSchema();
  }, 30_000);

  afterEach(async () => {
    jest.restoreAllMocks();
    await runner.rollbackTransaction();
    await runner.release();
  }, 30_000);

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  }, 30_000);

  async function createPreMigrationSchema(): Promise<void> {
    await runner.query('CREATE TABLE users (id character varying PRIMARY KEY)');
    await runner.query(`CREATE TABLE workspaces (
      id character varying PRIMARY KEY,
      "createdAt" timestamp NOT NULL,
      "userId" character varying NOT NULL,
      CONSTRAINT "FK_dc53b3d0b16419a8f5f17458403" FOREIGN KEY ("userId")
        REFERENCES users(id) ON DELETE CASCADE
    )`);
    await runner.query(
      'CREATE INDEX "IDX_dc53b3d0b16419a8f5f1745840" ON workspaces ("userId")',
    );
    await runner.query('INSERT INTO users VALUES ($1), ($2), ($3)', [
      anna,
      ben,
      clara,
    ]);
    await runner.query(
      'INSERT INTO workspaces VALUES ($1, $2, $3), ($4, $5, $6)',
      [budget, budgetCreatedAt, anna, permits, permitsCreatedAt, ben],
    );
  }

  async function members(): Promise<unknown[]> {
    return runner.query(
      `SELECT "workspaceId", "userId", role, "createdAt"
       FROM workspace_members ORDER BY "workspaceId", "createdAt", "userId"`,
    );
  }

  async function addMember(
    workspaceId: string,
    userId: string,
    role: string,
    createdAt: Date,
  ): Promise<void> {
    await runner.query(
      `INSERT INTO workspace_members
         (id, "createdAt", "updatedAt", "workspaceId", "userId", role)
       VALUES ($1, $2, $2, $3, $4, $5)`,
      [randomUUID(), createdAt, workspaceId, userId, role],
    );
  }

  it('makes every former owner the only member of their workspace, as admin since its creation', async () => {
    await migration.up(runner);

    expect(await members()).toEqual(
      [
        {
          workspaceId: budget,
          userId: anna,
          role: 'admin',
          createdAt: budgetCreatedAt,
        },
        {
          workspaceId: permits,
          userId: ben,
          role: 'admin',
          createdAt: permitsCreatedAt,
        },
      ].sort((a, b) => a.workspaceId.localeCompare(b.workspaceId)),
    );
    expect(
      await runner.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'workspaces'
         AND column_name = 'userId'`,
        [schema],
      ),
    ).toEqual([]);
  });

  it('keeps memberships when the member account is deleted but not the workspace', async () => {
    await migration.up(runner);

    await runner.query('DELETE FROM users WHERE id = $1', [anna]);

    expect(
      await runner.query('SELECT id FROM workspaces ORDER BY id'),
    ).toHaveLength(2);
    expect(
      await runner.query(
        'SELECT "userId" FROM workspace_members WHERE "workspaceId" = $1',
        [budget],
      ),
    ).toEqual([]);
  });

  it('restores each owner from the earliest admin on rollback, then backfills again', async () => {
    await migration.up(runner);
    // Clara joined the budget workspace before Ben became a second admin; she
    // is the longest-standing member but not an admin.
    await addMember(budget, clara, 'user', new Date('2026-03-02T09:00:00Z'));
    await addMember(budget, ben, 'admin', new Date('2026-03-03T09:00:00Z'));
    // A permits workspace whose admin is gone falls back to its earliest member.
    await runner.query(
      'DELETE FROM workspace_members WHERE "workspaceId" = $1',
      [permits],
    );
    await addMember(
      permits,
      clara,
      'manager',
      new Date('2026-04-02T09:00:00Z'),
    );
    await addMember(permits, anna, 'user', new Date('2026-04-03T09:00:00Z'));

    await migration.down(runner);

    expect(
      await runner.query(
        'SELECT id, "userId" FROM workspaces ORDER BY "createdAt"',
      ),
    ).toEqual([
      { id: budget, userId: anna },
      { id: permits, userId: clara },
    ]);

    await migration.up(runner);

    expect(
      await runner.query(
        `SELECT "workspaceId", "userId", role FROM workspace_members
         ORDER BY "createdAt"`,
      ),
    ).toEqual([
      { workspaceId: budget, userId: anna, role: 'admin' },
      { workspaceId: permits, userId: clara, role: 'admin' },
    ]);
  });
});
