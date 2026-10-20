import 'src/config/env';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

it('times out an exhausted pool and recovers after its connection is released', async () => {
  const original = process.env.POSTGRES_CONNECTION_TIMEOUT_MS;
  process.env.POSTGRES_CONNECTION_TIMEOUT_MS = '1000';
  let options: PostgresConnectionOptions;
  try {
    options = jest.requireActual<{
      typeormConfigRaw: PostgresConnectionOptions;
    }>('./typeorm.config').typeormConfigRaw;
  } finally {
    if (original === undefined)
      delete process.env.POSTGRES_CONNECTION_TIMEOUT_MS;
    else process.env.POSTGRES_CONNECTION_TIMEOUT_MS = original;
  }
  const db = new DataSource({
    ...options,
    entities: [],
    migrations: [],
    migrationsRun: false,
    poolSize: 1,
  });
  await db.initialize();
  const held = db.createQueryRunner();
  try {
    await held.connect();
    await expect(db.query('SELECT 1')).rejects.toThrow(
      'timeout exceeded when trying to connect',
    );
    await held.release();
    await expect(db.query('SELECT 1 AS available')).resolves.toEqual([
      { available: 1 },
    ]);
  } finally {
    if (!held.isReleased) await held.release();
    await db.destroy();
  }
});
