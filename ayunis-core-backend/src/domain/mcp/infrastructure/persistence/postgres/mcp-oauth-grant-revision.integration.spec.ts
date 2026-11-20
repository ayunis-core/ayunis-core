import { randomUUID } from 'crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { AddMcpOAuthGrantRevision1794842884851 } from 'src/db/migrations/1794842884851-AddMcpOAuthGrantRevision';

describe('OAuth grant revision migration (PostgreSQL)', () => {
  let db: DataSource;
  let runner: QueryRunner;
  const schema = `mcp_grant_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      entities: [],
      migrations: [],
      migrationsRun: false,
      synchronize: false,
      logging: false,
    });
    await db.initialize();
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(
      'CREATE TABLE mcp_oauth_user_tokens (id text PRIMARY KEY, encrypted_access_token text NOT NULL)',
    );
    await runner.query(
      "INSERT INTO mcp_oauth_user_tokens VALUES ('first', 'encrypted:first'), ('second', 'encrypted:second')",
    );
  }, 30_000);
  afterAll(async () => {
    if (runner) {
      await runner.query(`DROP SCHEMA "${schema}" CASCADE`);
      await runner.release();
    }
    if (db?.isInitialized) await db.destroy();
  });

  it('backfills distinct stable grant identities without changing existing credentials', async () => {
    const migration = new AddMcpOAuthGrantRevision1794842884851();
    await migration.up(runner);
    const rows: {
      id: string;
      encrypted_access_token: string;
      grant_revision: string;
    }[] = await runner.query('SELECT * FROM mcp_oauth_user_tokens ORDER BY id');
    expect(
      rows.map(({ id, encrypted_access_token }) => ({
        id,
        encrypted_access_token,
      })),
    ).toEqual([
      { id: 'first', encrypted_access_token: 'encrypted:first' },
      { id: 'second', encrypted_access_token: 'encrypted:second' },
    ]);
    expect(
      rows.every((row) => /^[0-9a-f-]{36}$/.test(row.grant_revision)),
    ).toBe(true);
    expect(new Set(rows.map((row) => row.grant_revision)).size).toBe(2);
    await runner.query(
      "UPDATE mcp_oauth_user_tokens SET encrypted_access_token = 'encrypted:refreshed' WHERE id = 'first'",
    );
    expect(
      await runner.query(
        "SELECT grant_revision FROM mcp_oauth_user_tokens WHERE id = 'first'",
      ),
    ).toEqual([{ grant_revision: rows[0].grant_revision }]);
    await migration.down(runner);
    expect(
      await runner.query(
        'SELECT count(*)::int AS count FROM mcp_oauth_user_tokens',
      ),
    ).toEqual([{ count: 2 }]);
  });
});
