import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { AddSourceProcessingErrorCode1790694911456 } from 'src/db/migrations/1790694911456-AddSourceProcessingErrorCode';

it('adds and reverts the error-code column without changing existing source diagnostics', async () => {
  const schema = `ayc1059_${randomUUID().replaceAll('-', '')}`;
  const db = new DataSource({
    ...(typeormConfigRaw as PostgresConnectionOptions),
    entities: [],
    migrations: [],
    migrationsRun: false,
    logging: false,
  });
  await db.initialize();
  const runner = db.createQueryRunner();
  await runner.connect();
  try {
    await runner.createSchema(schema, true);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(
      'CREATE TABLE sources (id integer PRIMARY KEY, "processingError" text)',
    );
    await runner.query('INSERT INTO sources VALUES (1, $1)', [
      'Private legacy diagnostic',
    ]);
    const migration = new AddSourceProcessingErrorCode1790694911456();
    await migration.up(runner);
    expect(await runner.query('SELECT * FROM sources')).toEqual([
      {
        id: 1,
        processingError: 'Private legacy diagnostic',
        processingErrorCode: null,
      },
    ]);
    await runner.query('UPDATE sources SET "processingErrorCode" = $1', [
      'DOCUMENT_UNREADABLE',
    ]);
    expect(
      await runner.query('SELECT "processingErrorCode" FROM sources'),
    ).toEqual([{ processingErrorCode: 'DOCUMENT_UNREADABLE' }]);
    await migration.down(runner);
    expect(await runner.query('SELECT * FROM sources')).toEqual([
      { id: 1, processingError: 'Private legacy diagnostic' },
    ]);
    await migration.up(runner);
    expect(
      await runner.query('SELECT "processingErrorCode" FROM sources'),
    ).toEqual([{ processingErrorCode: null }]);
  } finally {
    await runner.query('SET search_path TO public');
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }
});
