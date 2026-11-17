import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { AddAliasToLanguageModels1794377813655 } from 'src/db/migrations/1794377813655-AddAliasToLanguageModels';

const migration = new AddAliasToLanguageModels1794377813655();

describe('add alias to language models migration', () => {
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
      id serial PRIMARY KEY, type text NOT NULL, name text NOT NULL,
      provider text NOT NULL, "isArchived" boolean NOT NULL DEFAULT false,
      "createdAt" timestamp NOT NULL DEFAULT now()
    ) ON COMMIT DROP`);
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  afterAll(async () => {
    if (db.isInitialized) await db.destroy();
  });

  async function aliases(): Promise<Array<{ alias: string | null }>> {
    return (await runner.query(
      'SELECT alias FROM models ORDER BY id',
    )) as Array<{
      alias: string | null;
    }>;
  }

  it('keeps existing API integrations working by backfilling the provider name as alias', async () => {
    await runner.query(`INSERT INTO models (type, name, provider) VALUES
      ('language', 'gpt-4.1', 'azure'),
      ('language', 'mistral-large-latest', 'mistral'),
      ('embedding', 'text-embedding-3-large', 'azure'),
      ('image-generation', 'gpt-image-1', 'azure')`);

    await migration.up(runner);

    expect(await aliases()).toEqual([
      { alias: 'gpt-4.1' },
      { alias: 'mistral-large-latest' },
      { alias: null },
      { alias: null },
    ]);
  });

  it('gives a name used by several providers to the active, oldest model and suffixes the others', async () => {
    await runner.query(`INSERT INTO models (type, name, provider, "isArchived", "createdAt") VALUES
      ('language', 'llama-3.3-70b', 'ollama', true, '2024-01-01'),
      ('language', 'llama-3.3-70b', 'stackit', false, '2025-01-01'),
      ('language', 'llama-3.3-70b', 'synaforce', false, '2025-06-01')`);

    await migration.up(runner);

    expect(await aliases()).toEqual([
      { alias: 'llama-3.3-70b-ollama' },
      { alias: 'llama-3.3-70b' },
      { alias: 'llama-3.3-70b-synaforce' },
    ]);
  });

  it('falls back to the model id when the provider suffix is already a model name', async () => {
    await runner.query(`INSERT INTO models (type, name, provider, "createdAt") VALUES
      ('language', 'llama', 'ollama', '2024-01-01'),
      ('language', 'llama', 'stackit', '2025-01-01'),
      ('language', 'llama-stackit', 'openai', '2025-01-01')`);

    await migration.up(runner);

    expect(await aliases()).toEqual([
      { alias: 'llama' },
      { alias: 'llama-2' },
      { alias: 'llama-stackit' },
    ]);
  });

  it('rejects a language model without an alias', async () => {
    await migration.up(runner);

    await expect(
      runner.query(
        "INSERT INTO models (type, name, provider) VALUES ('language', 'gpt-5', 'azure')",
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it("keeps an archived model's alias reserved", async () => {
    await migration.up(runner);
    await runner.query(`INSERT INTO models (type, name, provider, "isArchived", alias)
      VALUES ('language', 'gpt-4.1', 'azure', true, 'ayunis-gpt')`);

    await expect(
      runner.query(`INSERT INTO models (type, name, provider, alias)
        VALUES ('language', 'gpt-5', 'openai', 'ayunis-gpt')`),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
