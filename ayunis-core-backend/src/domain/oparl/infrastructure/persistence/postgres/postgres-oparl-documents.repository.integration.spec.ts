import { randomUUID, type UUID } from 'crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateOparlMirrorTables1795478677149 } from 'src/db/migrations/1795478677149-CreateOparlMirrorTables';
import { CreateOparlDocumentTables1795481678749 } from 'src/db/migrations/1795481678749-CreateOparlDocumentTables';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import type {
  OparlChunkText,
  OparlFileText,
  OparlPendingFile,
} from 'src/domain/oparl/application/models/oparl-document';
import type { MirrorObject } from 'src/domain/oparl/application/models/oparl-object';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import {
  OparlFileSkipReason,
  OparlFileTextStatus,
} from 'src/domain/oparl/domain/oparl-file-text';
import { PostgresOparlDocumentsRepository } from './postgres-oparl-documents.repository';
import { PostgresOparlMirrorRepository } from './postgres-oparl-mirror.repository';

const T = OparlEntityType;
const BASE = 'https://ris.example.de/oparl/body/1';
const KITA =
  'Die Gemeindevertretung beschließt den Ausbau der Kindertagesstätten in Michelbach.';

function object(
  type: OparlEntityType,
  oparlId: string,
  overrides: Partial<MirrorObject> = {},
): MirrorObject {
  return {
    type,
    oparlId,
    embedded: false,
    web: null,
    oparlCreated: '2026-01-05T10:00:00+01:00',
    oparlModified: '2026-01-05T10:00:00+01:00',
    raw: { id: oparlId },
    fields: {},
    refs: {},
    joins: {},
    ...overrides,
  };
}

const file = (oparlId: string, modified = '2026-01-05T10:00:00+01:00') =>
  object(T.FILE, oparlId, {
    oparlModified: modified,
    raw: { id: oparlId, modified },
    fields: { accessUrl: `${oparlId}/Vorlage.pdf`, date: '2026-01-05' },
    refs: { masterFile: null },
  });

const paper = (oparlId: string, mainFile: string | null) =>
  object(T.PAPER, oparlId, {
    fields: {
      name: 'Ausbau der Kindertagesstätten',
      reference: 'VL-4/2026',
      date: '2026-01-07',
      paperType: 'Beschlussvorlage',
    },
    refs: { mainFile },
    joins: {
      relatedPapers: [],
      superordinatedPapers: [],
      subordinatedPapers: [],
      auxiliaryFiles: [],
      locations: [],
      originatorPersons: [],
      originatorOrganizations: [],
      underDirectionOf: [],
    },
  });

const extracted = (text: string): OparlFileText => ({
  status: OparlFileTextStatus.EXTRACTED,
  contentHash: 'sha256-of-the-pdf',
  pages: [{ number: 1, text }],
});

const chunks = (...texts: string[]): OparlChunkText[] =>
  texts.map((text, ordinal) => ({ text, ordinal, pageNumber: 1 }));

describe('PostgresOparlDocumentsRepository', () => {
  const schema = `ayc2059_oparl_${randomUUID().replaceAll('-', '')}`;
  const startOfJob = () => new Date(Date.now() + 60_000);
  let db: DataSource;
  let mirror: PostgresOparlMirrorRepository;
  let documents: PostgresOparlDocumentsRepository;
  let systemId: UUID;
  let bodyId: UUID;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      entities: [],
      migrations: [],
      migrationsRun: false,
      logging: false,
      // pgvector is in public once the app's migrations ran.
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    await setup.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    // Stand-ins for the tables of other migrations the migration refers to.
    await setup.query(
      `CREATE TABLE "${schema}".models (id varchar PRIMARY KEY)`,
    );
    await setup.query(
      `CREATE TABLE "${schema}".typeorm_metadata ("type" varchar NOT NULL, "database" varchar, "schema" varchar, "table" varchar, "name" varchar, "value" text)`,
    );
    // The migrations name their enum types in "public"; keep them in the schema.
    const runner = {
      query: (sql: string, params?: unknown[]) =>
        setup.query(sql.replaceAll('"public".', `"${schema}".`), params),
    } as QueryRunner;
    await new CreateOparlMirrorTables1795478677149().up(runner);
    await new CreateOparlDocumentTables1795481678749().up(runner);
    await setup.release();
    mirror = new PostgresOparlMirrorRepository(db, {
      get tx() {
        return db.manager;
      },
    } as never);
    documents = new PostgresOparlDocumentsRepository(db);
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  beforeEach(async () => {
    systemId = randomUUID();
    await db.query(
      `INSERT INTO "oparl_systems" ("id", "url", "oparlId", "raw", "nextSyncAt") VALUES ($1, $2, $2, '{}', now())`,
      [systemId, `https://ris.example.de/${systemId}/system`],
    );
    await mirror.write({ systemId, bodyId: null }, T.BODY, [
      object(T.BODY, BASE, { refs: { location: null } }),
    ]);
    [{ id: bodyId }] = await mirror.findBodies([systemId]);
  });

  const write = (type: OparlEntityType, objects: MirrorObject[]) =>
    mirror.write({ systemId, bodyId }, type, objects);
  const pending = () =>
    documents.findPendingFiles(systemId, startOfJob(), [], 10);
  const chunksOf = (fileId: UUID) =>
    db.query(
      `SELECT * FROM oparl_chunks WHERE "fileId" = $1 ORDER BY ordinal`,
      [fileId],
    );

  async function readFile(oparlId: string): Promise<OparlPendingFile> {
    const found = (await pending()).find((f) =>
      f.accessUrl?.startsWith(oparlId),
    );
    if (!found) throw new Error(`${oparlId} is not pending`);
    return found;
  }

  it('reads a file once, and again only when its metadata changes', async () => {
    const id = `${BASE}/file/1`;
    await write(T.FILE, [file(id)]);
    const first = await readFile(id);
    await documents.saveFileText(first, extracted(KITA), chunks(KITA));

    expect(await pending()).toEqual([]);

    await write(T.FILE, [file(id, '2026-03-01T09:00:00+01:00')]);
    const changed = await readFile(id);
    expect(changed.previous).toEqual({
      status: OparlFileTextStatus.EXTRACTED,
      contentHash: 'sha256-of-the-pdf',
    });
  });

  it('tries a failed file again on later jobs only, at most three times', async () => {
    const id = `${BASE}/file/2`;
    await write(T.FILE, [file(id)]);
    const failure: OparlFileText = {
      status: OparlFileTextStatus.FAILED,
      error: 'The OParl endpoint answered with HTTP 503',
    };

    await documents.saveFileText(await readFile(id), failure, []);
    expect(
      await documents.findPendingFiles(systemId, new Date(0), [], 10),
    ).toEqual([]);
    for (let attempt = 2; attempt <= 3; attempt++)
      await documents.saveFileText(await readFile(id), failure, []);

    expect(await pending()).toEqual([]);
  });

  it('keeps the text and chunks read before when a later read fails', async () => {
    const id = `${BASE}/file/3`;
    await write(T.FILE, [file(id)]);
    const fileRow = await readFile(id);
    await documents.saveFileText(fileRow, extracted(KITA), chunks(KITA));

    await documents.saveFileText(
      { ...fileRow, fingerprint: 'changed' },
      { status: OparlFileTextStatus.FAILED, error: 'unreachable' },
      [],
    );

    expect(await chunksOf(fileRow.id)).toHaveLength(1);
  });

  it('replaces the chunks of a changed file and drops those of a skipped one', async () => {
    const id = `${BASE}/file/4`;
    await write(T.FILE, [file(id)]);
    const fileRow = await readFile(id);
    await documents.saveFileText(
      fileRow,
      extracted(KITA),
      chunks('alt', 'alt'),
    );

    await documents.saveFileText(fileRow, extracted(KITA), chunks(KITA));
    expect(
      (await chunksOf(fileRow.id)).map((c: { text: string }) => c.text),
    ).toEqual([KITA]);

    await documents.saveFileText(
      fileRow,
      {
        status: OparlFileTextStatus.SKIPPED,
        reason: OparlFileSkipReason.TOO_MANY_PAGES,
        contentHash: 'sha256-of-the-pdf',
        error: null,
      },
      [],
    );
    expect(await chunksOf(fileRow.id)).toEqual([]);
    const [stats] = (await documents.stats([systemId], null)).values();
    expect(stats.files).toMatchObject({
      total: 1,
      pending: 0,
      skipped: { too_many_pages: 1 },
    });
  });

  it('stores text with a split emoji or a NUL byte instead of failing the job on it', async () => {
    const id = `${BASE}/file/9`;
    await write(T.FILE, [file(id)]);
    const fileRow = await readFile(id);
    const broken = `Kita \uD83D und\u0000 Hort`;

    await expect(
      documents.saveFileText(fileRow, extracted(broken), chunks(broken)),
    ).resolves.toBe(true);

    const [chunk] = await chunksOf(fileRow.id);
    expect(chunk.text).toBe('Kita \uFFFD und Hort');
  });

  it('finds file chunks by stemmed German words, with their body, paper and date', async () => {
    const fileOparlId = `${BASE}/file/5`;
    await write(T.FILE, [file(fileOparlId)]);
    await write(T.PAPER, [paper(`${BASE}/paper/5`, fileOparlId)]);
    await mirror.linkReferences(systemId);
    const fileRow = await readFile(fileOparlId);
    await documents.saveFileText(fileRow, extracted(KITA), chunks(KITA));

    const [hit] = await db.query(
      `SELECT c."bodyId", c."paperId", c.date::text AS date, p."oparlId" AS paper
       FROM oparl_chunks c JOIN oparl_papers p ON p.id = c."paperId"
       WHERE c."searchVector" @@ to_tsquery('german', 'Kindertagesstätte & Gemeindevertretungen')`,
    );
    expect(hit).toEqual({
      bodyId,
      paperId: expect.any(String),
      date: '2026-01-05',
      paper: `${BASE}/paper/5`,
    });
  });

  it('removes the chunks of a deleted paper and lets the file be chunked again from its text', async () => {
    const fileOparlId = `${BASE}/file/6`;
    const paperOparlId = `${BASE}/paper/6`;
    await write(T.FILE, [file(fileOparlId)]);
    await write(T.PAPER, [paper(paperOparlId, fileOparlId)]);
    await mirror.linkReferences(systemId);
    const [paperRow] = await documents.findTextObjects(
      systemId,
      OparlChunkSource.PAPER,
      null,
      10,
    );
    await documents.replaceObjectChunks(OparlChunkSource.PAPER, [
      { object: paperRow, hash: 'paper-hash', chunks: chunks('VL-4/2026') },
    ]);
    const fileRow = await readFile(fileOparlId);
    await documents.saveFileText(fileRow, extracted(KITA), chunks(KITA));

    await mirror.delete(systemId, T.PAPER, [paperOparlId]);

    expect(
      await db.query(`SELECT 1 FROM oparl_chunks WHERE "bodyId" = $1`, [
        bodyId,
      ]),
    ).toEqual([]);
    const repair = await documents.findFilesWithoutChunks(systemId, 10);
    expect(repair.map(({ file: f, pages }) => [f.id, pages])).toEqual([
      [fileRow.id, [{ number: 1, text: KITA }]],
    ]);
  });

  it('records the hash a paper was chunked from, so an unchanged paper keeps its chunks', async () => {
    await write(T.PAPER, [paper(`${BASE}/paper/7`, null)]);
    const [before] = await documents.findTextObjects(
      systemId,
      OparlChunkSource.PAPER,
      null,
      10,
    );
    expect(before).toMatchObject({
      parts: ['VL-4/2026', 'Ausbau der Kindertagesstätten', 'Beschlussvorlage'],
      date: '2026-01-07',
      chunkedHash: null,
    });

    await documents.replaceObjectChunks(OparlChunkSource.PAPER, [
      { object: before, hash: 'paper-hash', chunks: chunks('VL-4/2026') },
    ]);

    const [after] = await documents.findTextObjects(
      systemId,
      OparlChunkSource.PAPER,
      null,
      10,
    );
    expect(after.chunkedHash).toBe('paper-hash');
  });

  it('names a system with unread files or chunks without a current vector as having document work', async () => {
    const model = randomUUID();
    await db.query(`INSERT INTO models (id) VALUES ($1)`, [model]);
    const withWork = async (modelId: UUID | null) =>
      (await documents.findSystemsWithDocumentWork(modelId)).includes(systemId);
    const id = `${BASE}/file/10`;
    await write(T.FILE, [file(id)]);

    expect(await withWork(null)).toBe(true);

    await documents.saveFileText(
      await readFile(id),
      extracted(KITA),
      chunks(KITA),
    );
    expect(await withWork(null)).toBe(false);
    expect(await withWork(model)).toBe(true);

    const [chunk] = await documents.findChunksToEmbed(bodyId, model, null, 10);
    await documents.saveEmbeddings(model, EmbeddingDimensions.DIMENSION_1024, [
      { id: chunk.id, vector: Array.from({ length: 1024 }, () => 0.5) },
    ]);
    expect(await withWork(model)).toBe(false);

    await write(T.FILE, [file(id, '2026-03-01T09:00:00+01:00')]);
    expect(await withWork(model)).toBe(true);
  });

  it('stores a vector in the column of its dimensions and embeds again for another model', async () => {
    const [modelA, modelB] = [randomUUID(), randomUUID()];
    await db.query(`INSERT INTO models (id) VALUES ($1), ($2)`, [
      modelA,
      modelB,
    ]);
    const id = `${BASE}/file/8`;
    await write(T.FILE, [file(id)]);
    await documents.saveFileText(
      await readFile(id),
      extracted(KITA),
      chunks(KITA),
    );
    const [chunk] = await documents.findChunksToEmbed(bodyId, modelA, null, 10);

    await documents.saveEmbeddings(modelA, EmbeddingDimensions.DIMENSION_1024, [
      { id: chunk.id, vector: Array.from({ length: 1024 }, () => 0.5) },
    ]);

    expect(await documents.findChunksToEmbed(bodyId, modelA, null, 10)).toEqual(
      [],
    );
    expect(await documents.findChunksToEmbed(bodyId, modelB, null, 10)).toEqual(
      [{ id: chunk.id, text: KITA }],
    );
    const [row] = await db.query(
      `SELECT "embeddingModelId", "embedding1024" IS NOT NULL AS has1024,
              "embedding1536" IS NULL AS no1536
       FROM oparl_chunks WHERE id = $1`,
      [chunk.id],
    );
    expect(row).toEqual({
      embeddingModelId: modelA,
      has1024: true,
      no1536: true,
    });
    const [stats] = (await documents.stats([systemId], modelA)).values();
    expect(stats.index).toEqual({ chunks: 1, embeddedChunks: 1 });
  });
});
