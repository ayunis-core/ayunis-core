import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { RenameSubscriptionEndsAt1793203591999 } from 'src/db/migrations/1793203591999-RenameSubscriptionEndsAt';
import { AddOriginalSubscriptionEnd1793203663170 } from 'src/db/migrations/1793203663170-AddOriginalSubscriptionEnd';

const migrations = [
  new RenameSubscriptionEndsAt1793203591999(),
  new AddOriginalSubscriptionEnd1793203663170(),
];

describe('subscription end column migrations', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const end = new Date('2027-01-15T00:00:00Z');

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
    schema = `ayc1429_names_${randomUUID().replaceAll('-', '')}`;
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.createSchema(schema, true);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(
      'CREATE TABLE subscriptions (id text PRIMARY KEY, "accessEndsAt" timestamp)',
    );
    await runner.query(
      'CREATE TABLE subscription_access_adjustments (id text PRIMARY KEY, "accessEndsAt" timestamp NOT NULL)',
    );
    await runner.query(
      'INSERT INTO subscriptions VALUES ($1, $2), ($3, NULL)',
      ['bounded', end, 'open'],
    );
    await runner.query(
      'INSERT INTO subscription_access_adjustments VALUES ($1, $2)',
      ['audit', end],
    );
  });

  afterEach(async () => {
    await runner.query('SET search_path TO public');
    await runner.dropSchema(schema, true, true);
    await runner.release();
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  async function migrate(): Promise<void> {
    for (const migration of migrations) await migration.up(runner);
  }

  it('preserves bounded and open-ended access and audit dates under the new names', async () => {
    await migrate();
    expect(
      await runner.query(
        'SELECT id, "endsAt", "originalEndsAt" FROM subscriptions ORDER BY id',
      ),
    ).toEqual([
      { id: 'bounded', endsAt: end, originalEndsAt: null },
      { id: 'open', endsAt: null, originalEndsAt: null },
    ]);
    expect(
      await runner.query(
        'SELECT "endsAt" FROM subscription_access_adjustments',
      ),
    ).toEqual([{ endsAt: end }]);
  });

  it('can roll back and reapply without losing existing dates', async () => {
    await migrate();
    for (const migration of [...migrations].reverse())
      await migration.down(runner);
    expect(
      await runner.query(
        'SELECT id, "accessEndsAt" FROM subscriptions ORDER BY id',
      ),
    ).toEqual([
      { id: 'bounded', accessEndsAt: end },
      { id: 'open', accessEndsAt: null },
    ]);
    expect(
      await runner.query(
        'SELECT "accessEndsAt" FROM subscription_access_adjustments',
      ),
    ).toEqual([{ accessEndsAt: end }]);
    await migrate();
    expect(
      await runner.query('SELECT "endsAt" FROM subscriptions WHERE id = $1', [
        'bounded',
      ]),
    ).toEqual([{ endsAt: end }]);
  });
});
