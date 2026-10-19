import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { RequireContextWindowSizeForLanguageModels1792416285770 } from 'src/db/migrations/1792416285770-RequireContextWindowSizeForLanguageModels';

const migration = new RequireContextWindowSizeForLanguageModels1792416285770();

const providers = ['openai', 'anthropic', 'ollama', 'synaforce', 'ayunis'];

describe('required context window migration', () => {
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
    await runner.query(`CREATE TEMP TABLE models (
      id serial PRIMARY KEY, type text NOT NULL, provider text NOT NULL,
      "contextWindowSize" integer
    ) ON COMMIT DROP`);
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  afterAll(async () => {
    if (db.isInitialized) await db.destroy();
  });

  it('preserves the previous trimming fallback for every provider and existing values', async () => {
    for (const provider of providers) {
      await runner.query(
        `INSERT INTO models (type, provider, "contextWindowSize")
         VALUES ('language', $1, NULL), ('language', $1, 64000)`,
        [provider],
      );
    }
    await runner.query(`INSERT INTO models (type, provider)
      VALUES ('embedding', 'openai'), ('image-generation', 'openai')`);

    await migration.up(runner);

    expect(
      await runner.query('SELECT "contextWindowSize" FROM models ORDER BY id'),
    ).toEqual([
      ...providers.flatMap(() => [
        { contextWindowSize: 200000 },
        { contextWindowSize: 64000 },
      ]),
      { contextWindowSize: null },
      { contextWindowSize: null },
    ]);
  });

  it('rejects a language model without a context window', async () => {
    await migration.up(runner);

    await expect(
      runner.query(
        "INSERT INTO models (type, provider) VALUES ('language', 'ollama')",
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('permits other model types without a context window', async () => {
    await migration.up(runner);

    await runner.query(`INSERT INTO models (type, provider)
      VALUES ('embedding', 'openai'), ('image-generation', 'openai')`);
    expect(
      await runner.query('SELECT "contextWindowSize" FROM models'),
    ).toEqual([{ contextWindowSize: null }, { contextWindowSize: null }]);
  });

  it('can revert and rerun without changing configured windows', async () => {
    await migration.up(runner);
    await migration.down(runner);
    await runner.query(`INSERT INTO models (type, provider, "contextWindowSize")
      VALUES ('language', 'ollama', NULL), ('language', 'openai', 128000)`);

    await migration.up(runner);

    expect(
      await runner.query('SELECT "contextWindowSize" FROM models ORDER BY id'),
    ).toEqual([{ contextWindowSize: 200000 }, { contextWindowSize: 128000 }]);
  });
});
