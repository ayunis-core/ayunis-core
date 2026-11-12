import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema, type QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { AddRecordingSummaries1794455121468 } from 'src/db/migrations/1794455121468-AddRecordingSummaries';
import { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import { LocalRecordingSummaryRepository } from './local-recording-summary.repository';
import { RecordingSummaryMapper } from './mappers/recording-summary.mapper';
import { RecordingSummaryRecord } from './schema/recording-summary.record';

// ts-jest drops the column types of some records, so the table is declared
// explicitly against the migrated schema.
const summarySchema = new EntitySchema<RecordingSummaryRecord>({
  name: 'RecordingSummaryRecord',
  target: RecordingSummaryRecord,
  tableName: 'recording_summaries',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    recordingId: { type: String },
    runId: { type: 'uuid' },
    status: { type: String },
    triggeredByUserId: { type: String, nullable: true },
    content: { type: 'text', nullable: true },
    modelId: { type: String, nullable: true },
    modelName: { type: String, nullable: true },
    generatedAt: { type: 'timestamp', nullable: true },
    failure: { type: String, nullable: true },
  },
});

// The tables the summaries migration references, reduced to what it needs.
const PRE_MIGRATION_TABLES = [
  `CREATE TABLE "users" ("id" varchar PRIMARY KEY)`,
  `CREATE TABLE "models" ("id" varchar PRIMARY KEY)`,
  `CREATE TABLE "recordings" ("id" varchar PRIMARY KEY)`,
  `CREATE TABLE "sources" ("id" varchar PRIMARY KEY, "recordingId" varchar UNIQUE REFERENCES "recordings"("id") ON DELETE CASCADE)`,
];

/** Keeps the migration's public-qualified enum types inside the test schema. */
function inSchema(runner: QueryRunner, schema: string): QueryRunner {
  return new Proxy(runner, {
    get(target, property, receiver) {
      if (property !== 'query') return Reflect.get(target, property, receiver);
      return (sql: string, parameters?: unknown[]) =>
        target.query(sql.replaceAll('"public".', `"${schema}".`), parameters);
    },
  });
}

describe('Recording summary persistence', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let repository: LocalRecordingSummaryRepository;
  let schema: string;

  const uploaderId = randomUUID();
  const managerId = randomUUID();
  const modelId = randomUUID();
  let recordingId: UUID;
  let audioId: UUID;

  const generated = {
    content: '## Thema\n\nHaushalt',
    modelId,
    modelName: 'Mistral Large (Mistral)',
    generatedAt: new Date('2026-11-12T10:00:00Z'),
  };

  beforeAll(async () => {
    schema = `ayc1653_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [summarySchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    await setup.query(`SET search_path TO "${schema}"`);
    for (const statement of PRE_MIGRATION_TABLES) await setup.query(statement);
    await new AddRecordingSummaries1794455121468().up(inSchema(setup, schema));
    await setup.query('SET search_path TO public');
    await setup.release();
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  beforeEach(async () => {
    runner = db.createQueryRunner();
    await runner.startTransaction();
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    repository = new LocalRecordingSummaryRepository(
      db.getRepository(RecordingSummaryRecord),
      new RecordingSummaryMapper(),
      { tx: runner.manager } as never,
    );
    recordingId = randomUUID();
    audioId = randomUUID();
    await runner.query(`INSERT INTO "users" ("id") VALUES ($1), ($2)`, [
      uploaderId,
      managerId,
    ]);
    await runner.query(`INSERT INTO "models" ("id") VALUES ($1)`, [modelId]);
    await runner.query(`INSERT INTO "recordings" ("id") VALUES ($1)`, [
      recordingId,
    ]);
    await runner.query(
      `INSERT INTO "sources" ("id", "recordingId") VALUES ($1, $2)`,
      [audioId, recordingId],
    );
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  async function start(runId: UUID = randomUUID()) {
    await repository.createPending(recordingId, runId, uploaderId);
    const summary = await repository.findPendingForAudio(audioId);
    if (!summary) throw new Error('The summary did not start');
    return summary;
  }

  it('queues one run per recording, billed to the uploader, that waits for the transcript of its audio', async () => {
    const first = await start();
    await repository.createPending(recordingId, randomUUID(), managerId);

    expect(first).toMatchObject({
      recordingId,
      status: RecordingSummaryStatus.PENDING,
      triggeredByUserId: uploaderId,
    });
    await expect(repository.findByRecordingId(recordingId)).resolves.toEqual(
      first,
    );
    await expect(
      repository.findPendingForAudio(randomUUID()),
    ).resolves.toBeNull();
    await repository.claim(recordingId, first.runId);
    await expect(repository.findPendingForAudio(audioId)).resolves.toBeNull();
  });

  it('lets only the current run write its result, and only once', async () => {
    const { runId } = await start();

    await expect(repository.claim(recordingId, randomUUID())).resolves.toBe(
      null,
    );
    await expect(repository.claim(recordingId, runId)).resolves.toMatchObject({
      status: RecordingSummaryStatus.RUNNING,
    });
    await expect(repository.markReady(recordingId, runId)).resolves.toBe(false);
    await expect(
      repository.saveContent(recordingId, runId, generated),
    ).resolves.toBe(true);
    await expect(repository.markReady(recordingId, runId)).resolves.toBe(true);

    await expect(repository.claim(recordingId, runId)).resolves.toBeNull();
    await expect(
      repository.markFailed(
        recordingId,
        runId,
        RecordingSummaryFailure.PROVIDER_ERROR,
      ),
    ).resolves.toBe(false);
    await expect(
      repository.findByRecordingId(recordingId),
    ).resolves.toMatchObject({
      status: RecordingSummaryStatus.READY,
      ...generated,
      failure: null,
    });
  });

  it('restarts a failed summary once, as a new run billed to the caller that keeps an already generated text', async () => {
    const { runId } = await start();
    await repository.claim(recordingId, runId);
    await repository.saveContent(recordingId, runId, generated);
    await repository.markFailed(
      recordingId,
      runId,
      RecordingSummaryFailure.SUMMARY_FAILED,
    );
    const retryRunId = randomUUID();

    const restarted = await repository.restartFailed(
      recordingId,
      retryRunId,
      managerId,
    );
    await expect(
      repository.restartFailed(recordingId, randomUUID(), managerId),
    ).resolves.toBeNull();

    expect(restarted).toMatchObject({
      runId: retryRunId,
      status: RecordingSummaryStatus.PENDING,
      triggeredByUserId: managerId,
      failure: null,
      content: generated.content,
    });
    await expect(repository.claim(recordingId, runId)).resolves.toBeNull();
    await expect(
      repository.claim(recordingId, retryRunId),
    ).resolves.toMatchObject({ content: generated.content });
  });

  it('writes nothing for a run whose recording was deleted meanwhile', async () => {
    const { runId } = await start();
    await repository.claim(recordingId, runId);
    await runner.query(`DELETE FROM "recordings" WHERE "id" = $1`, [
      recordingId,
    ]);

    await expect(
      repository.saveContent(recordingId, runId, generated),
    ).resolves.toBe(false);
    await expect(repository.markReady(recordingId, runId)).resolves.toBe(false);
    await expect(
      repository.markFailed(
        recordingId,
        runId,
        RecordingSummaryFailure.PROVIDER_ERROR,
      ),
    ).resolves.toBe(false);
    const [{ count }]: { count: string }[] = await runner.query(
      `SELECT COUNT(*) AS count FROM "recording_summaries"`,
    );
    expect(Number(count)).toBe(0);
  });
});
