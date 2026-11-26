import { randomUUID, type UUID } from 'crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateOparlMirrorTables1795478677149 } from 'src/db/migrations/1795478677149-CreateOparlMirrorTables';
import { CreateOparlDocumentTables1795481678749 } from 'src/db/migrations/1795481678749-CreateOparlDocumentTables';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import {
  OparlListType,
  type OparlMeetingListItem,
  type OparlPaperDetail,
} from 'src/domain/oparl/application/models/oparl-read';
import type { OparlQueryVector } from 'src/domain/oparl/application/models/oparl-search';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import { PostgresOparlReadRepository } from './postgres-oparl-read.repository';

const DIMENSIONS = EmbeddingDimensions.DIMENSION_1024;

/** A unit vector along `axis`, so cosine distances are easy to reason about. */
function axis(index: number, lean?: { index: number; weight: number }) {
  const vector = new Array<number>(Number(DIMENSIONS)).fill(0);
  vector[index] = 1;
  if (lean) vector[lean.index] = lean.weight;
  return vector;
}

const byId = (a: string, b: string) => a.localeCompare(b);

describe('PostgresOparlReadRepository', () => {
  const schema = `ayc2061_oparl_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let reads: PostgresOparlReadRepository;
  const id = () => randomUUID();
  const modelId = id();
  const otherModelId = id();
  const ids = {
    system: id(),
    bodyA: id(),
    bodyB: id(),
    committee: id(),
    faction: id(),
    foreignCommittee: id(),
    foreignPerson: id(),
    foreignMeeting: id(),
    foreignFile: id(),
    protocolFile: id(),
    approvalAgendaItem: id(),
    bikePaper: id(),
    bikeAgendaItem: id(),
    person: id(),
    otherPerson: id(),
    kitaPaper: id(),
    budgetPaper: id(),
    foreignPaper: id(),
    meeting: id(),
    laterMeeting: id(),
    agendaItem: id(),
    consultation: id(),
    file: id(),
    chunks: {
      kitaPaper: id(),
      budgetPaper: id(),
      meeting: id(),
      agendaItem: id(),
      filePage2: id(),
      foreignPaper: id(),
      otherModel: id(),
      bikePaper: id(),
      bikeAgendaItem: id(),
      crossBodyFile: id(),
      protocolPage: id(),
    },
  };
  const scopeA = { bodyIds: [ids.bodyA] };
  const scopeB = { bodyIds: [ids.bodyB] };

  async function insert(table: string, row: Record<string, unknown>) {
    const columns = Object.keys(row).map((column) => '"' + column + '"');
    const values = columns.map((_, index) => '$' + String(index + 1));
    await db.query(
      `INSERT INTO "${table}" (${columns.join(', ')}) VALUES (${values.join(', ')})`,
      Object.values(row),
    );
  }

  const owned = (bodyId: UUID, rowId: UUID) => ({
    id: rowId,
    systemId: ids.system,
    bodyId,
    oparlId: `https://ris.example.de/oparl/${rowId}`,
    raw: {},
  });

  async function chunk(
    chunkId: UUID,
    bodyId: UUID,
    fields: Record<string, unknown>,
  ) {
    await insert('oparl_chunks', {
      id: chunkId,
      bodyId,
      ordinal: 0,
      ...fields,
    });
  }

  async function embed(chunkId: UUID, vector: number[], model = modelId) {
    await db.query(
      `UPDATE oparl_chunks SET "embeddingModelId" = $2, embedding1024 = $3::halfvec(1024) WHERE id = $1`,
      [chunkId, model, JSON.stringify(vector)],
    );
  }

  async function seedMirror() {
    await insert('oparl_systems', {
      id: ids.system,
      url: 'https://ris.example.de/oparl/system',
      oparlId: 'https://ris.example.de/oparl/system',
      raw: {},
      nextSyncAt: new Date(),
    });
    for (const [bodyId, name] of [
      [ids.bodyA, 'Gemeinde Musterstadt'],
      [ids.bodyB, 'Ortsgemeinde Beispielhausen'],
    ] as const) {
      await insert('oparl_bodies', {
        id: bodyId,
        systemId: ids.system,
        oparlId: `https://ris.example.de/oparl/${bodyId}`,
        raw: {},
        name,
      });
    }
    await insert('oparl_organizations', {
      ...owned(ids.bodyA, ids.committee),
      name: 'Bauausschuss',
    });
    await insert('oparl_organizations', {
      ...owned(ids.bodyA, ids.faction),
      name: 'Fraktion Grüne Liste',
    });
    await insert('oparl_organizations', {
      ...owned(ids.bodyB, ids.foreignCommittee),
      name: 'Kreisausschuss Beispielkreis',
    });
    await insert('oparl_persons', {
      ...owned(ids.bodyB, ids.foreignPerson),
      name: 'Fremde Person',
    });
    await insert('oparl_persons', {
      ...owned(ids.bodyA, ids.person),
      givenName: 'Erika',
      familyName: 'Muster',
    });
    await insert('oparl_persons', {
      ...owned(ids.bodyA, ids.otherPerson),
      name: 'Max Beispiel',
      familyName: 'Beispiel',
    });
    await insert('oparl_memberships', {
      ...owned(ids.bodyA, id()),
      personId: ids.person,
      organizationId: ids.committee,
      role: 'Vorsitzende',
      startDate: '2021-04-01',
    });
    await insert('oparl_memberships', {
      ...owned(ids.bodyA, id()),
      personId: ids.otherPerson,
      organizationId: ids.foreignCommittee,
      role: 'Gast',
    });
    await insert('oparl_files', {
      ...owned(ids.bodyA, ids.file),
      name: 'Antrag Kita Michelbach',
      accessUrl: 'https://ris.example.de/files/antrag-kita.pdf',
      date: '2026-01-07',
    });
    await insert('oparl_file_texts', {
      fileId: ids.file,
      status: 'extracted',
      sourceFingerprint: 'fingerprint',
      readAt: new Date(),
      pageCount: 3,
      pages: JSON.stringify(
        [1, 2, 3].map((number) => ({ number, text: `Seite ${number}` })),
      ),
    });
    await insert('oparl_papers', {
      ...owned(ids.bodyA, ids.kitaPaper),
      name: 'Ausbau der Kindertagesstätten in Michelbach',
      reference: 'AN-4/2026',
      paperType: 'Antrag der Fraktion',
      date: '2026-01-07',
      web: 'https://ris.example.de/vorgang/4',
      mainFileId: ids.file,
    });
    await insert('oparl_papers', {
      ...owned(ids.bodyA, ids.budgetPaper),
      name: 'Haushaltssatzung 2026',
      paperType: 'Beschlussvorlage',
      date: '2025-11-20',
    });
    await insert('oparl_papers', {
      ...owned(ids.bodyB, ids.foreignPaper),
      name: 'Kindertagesstätten in Beispielhausen',
      paperType: 'Antrag der Fraktion',
      date: '2026-01-08',
    });
    for (const [table, owner, target] of [
      ['oparl_paper_originator_persons', ids.kitaPaper, ids.person],
      ['oparl_paper_originator_organizations', ids.kitaPaper, ids.faction],
      ['oparl_paper_related_papers', ids.kitaPaper, ids.foreignPaper],
    ]) {
      await insert(table, {
        ownerId: owner,
        targetOparlId: `https://ris.example.de/oparl/${target}`,
        targetId: target,
      });
    }
    await insert('oparl_meetings', {
      ...owned(ids.bodyA, ids.meeting),
      name: 'Bauausschuss (3. Sitzung)',
      start: '2026-02-10T18:00:00+01:00',
    });
    await insert('oparl_meetings', {
      ...owned(ids.bodyA, ids.laterMeeting),
      name: 'Gemeindevertretung (5. Sitzung)',
      start: '2026-03-12T19:00:00+01:00',
    });
    await insert('oparl_meeting_organizations', {
      ownerId: ids.meeting,
      targetOparlId: 'committee',
      targetId: ids.committee,
    });
    await insert('oparl_meeting_participants', {
      ownerId: ids.meeting,
      targetOparlId: 'person',
      targetId: ids.otherPerson,
    });
    // Join rows to objects of body B, as a system with several bodies may hold.
    await insert('oparl_meeting_organizations', {
      ownerId: ids.meeting,
      targetOparlId: 'foreign-committee',
      targetId: ids.foreignCommittee,
    });
    await insert('oparl_meeting_participants', {
      ownerId: ids.meeting,
      targetOparlId: 'foreign-person',
      targetId: ids.foreignPerson,
    });
    await insert('oparl_agenda_items', {
      ...owned(ids.bodyA, ids.agendaItem),
      number: 'TOP 4',
      order: 4,
      name: 'Kita Michelbach',
      result: 'einstimmig beschlossen',
      meetingId: ids.meeting,
    });
    await insert('oparl_consultations', {
      ...owned(ids.bodyA, ids.consultation),
      paperId: ids.kitaPaper,
      meetingId: ids.meeting,
      agendaItemId: ids.agendaItem,
      role: 'Vorberatung',
    });
    await db.query(
      `UPDATE oparl_agenda_items SET "consultationId" = $1 WHERE id = $2`,
      [ids.consultation, ids.agendaItem],
    );
    // A consultation of the paper at a meeting of body B.
    await insert('oparl_meetings', {
      ...owned(ids.bodyB, ids.foreignMeeting),
      name: 'Kreistag (1. Sitzung)',
      start: '2026-01-20T18:00:00+01:00',
    });
    await insert('oparl_consultations', {
      ...owned(ids.bodyA, id()),
      paperId: ids.kitaPaper,
      meetingId: ids.foreignMeeting,
      role: 'Kenntnisnahme',
    });
    // A consultation that names only its agenda item, not the meeting.
    await insert('oparl_papers', {
      ...owned(ids.bodyA, ids.bikePaper),
      name: 'Radweg nach Kettenbach',
      paperType: 'Beschlussvorlage',
      date: '2025-06-01',
    });
    await insert('oparl_agenda_items', {
      ...owned(ids.bodyA, ids.bikeAgendaItem),
      number: 'TOP 5',
      order: 5,
      name: 'Radweg nach Kettenbach',
      meetingId: ids.meeting,
    });
    await insert('oparl_consultations', {
      ...owned(ids.bodyA, id()),
      paperId: ids.bikePaper,
      agendaItemId: ids.bikeAgendaItem,
    });

    // A file of body B, and a chunk of body A naming it, its meeting and its paper.
    await insert('oparl_files', {
      ...owned(ids.bodyB, ids.foreignFile),
      name: 'Niederschrift Kreistag',
    });

    // The first meeting's protocol, approved under an agenda item of the
    // later meeting, and an attachment of the bike paper; its chunk names
    // only the approval's meeting.
    await insert('oparl_files', {
      ...owned(ids.bodyA, ids.protocolFile),
      name: 'Niederschrift Bauausschuss (3. Sitzung)',
    });
    await db.query(
      `UPDATE oparl_meetings SET "resultsProtocolId" = $1 WHERE id = $2`,
      [ids.protocolFile, ids.meeting],
    );
    await insert('oparl_agenda_items', {
      ...owned(ids.bodyA, ids.approvalAgendaItem),
      number: 'TOP 1',
      order: 1,
      name: 'Genehmigung der Niederschrift',
      meetingId: ids.laterMeeting,
    });
    for (const [table, owner] of [
      ['oparl_agenda_item_auxiliary_files', ids.approvalAgendaItem],
      ['oparl_paper_auxiliary_files', ids.bikePaper],
    ]) {
      await insert(table, {
        ownerId: owner,
        targetOparlId: `https://ris.example.de/oparl/${ids.protocolFile}`,
        targetId: ids.protocolFile,
      });
    }

    const c = ids.chunks;
    await chunk(c.protocolPage, ids.bodyA, {
      source: 'file',
      fileId: ids.protocolFile,
      meetingId: ids.laterMeeting,
      agendaItemId: ids.approvalAgendaItem,
      pageNumber: 1,
      date: '2026-03-12',
      text: 'Ergebnisprotokoll zur Grünflächenpflege',
    });
    await chunk(c.crossBodyFile, ids.bodyA, {
      source: 'file',
      fileId: ids.foreignFile,
      meetingId: ids.foreignMeeting,
      paperId: ids.foreignPaper,
      pageNumber: 1,
      date: '2026-01-20',
      text: 'Niederschrift über die Sitzung des Kreistags',
    });
    await chunk(c.kitaPaper, ids.bodyA, {
      source: 'paper',
      paperId: ids.kitaPaper,
      date: '2026-01-07',
      text: 'Ausbau der Kindertagesstätten in Michelbach AN-4/2026',
    });
    await chunk(c.budgetPaper, ids.bodyA, {
      source: 'paper',
      paperId: ids.budgetPaper,
      date: '2025-11-20',
      text: 'Haushaltssatzung 2026 mit Mitteln für Kindertagesstätten',
    });
    await chunk(c.meeting, ids.bodyA, {
      source: 'meeting',
      meetingId: ids.meeting,
      date: '2026-02-10',
      text: 'Bauausschuss (3. Sitzung)',
    });
    await chunk(c.agendaItem, ids.bodyA, {
      source: 'agenda_item',
      agendaItemId: ids.agendaItem,
      meetingId: ids.meeting,
      date: '2026-02-10',
      text: 'TOP 4 Kita Michelbach einstimmig beschlossen',
    });
    await chunk(c.filePage2, ids.bodyA, {
      source: 'file',
      fileId: ids.file,
      paperId: ids.kitaPaper,
      pageNumber: 2,
      date: '2026-01-07',
      text: 'Die Kindertagesstätte in Michelbach erhält zwei weitere Gruppen.',
    });
    await chunk(c.foreignPaper, ids.bodyB, {
      source: 'paper',
      paperId: ids.foreignPaper,
      date: '2026-01-08',
      text: 'Kindertagesstätten in Beispielhausen',
    });
    await chunk(c.bikePaper, ids.bodyA, {
      source: 'paper',
      paperId: ids.bikePaper,
      date: '2025-06-01',
      text: 'Radweg nach Kettenbach',
    });
    await chunk(c.bikeAgendaItem, ids.bodyA, {
      source: 'agenda_item',
      agendaItemId: ids.bikeAgendaItem,
      meetingId: ids.meeting,
      date: '2026-02-10',
      text: 'TOP 5 Radweg nach Kettenbach',
    });
    await chunk(c.otherModel, ids.bodyA, {
      source: 'paper',
      paperId: ids.budgetPaper,
      date: '2025-11-20',
      text: 'Stellenplan',
    });
    // The query vector is axis 0: the foreign chunk is nearest, then the
    // file page, the Kita paper and the budget paper.
    await embed(c.foreignPaper, axis(0));
    await embed(c.filePage2, axis(0, { index: 1, weight: 0.2 }));
    await embed(c.kitaPaper, axis(0, { index: 1, weight: 0.8 }));
    await embed(c.budgetPaper, axis(1));
    await embed(c.otherModel, axis(0), otherModelId);
  }

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
    await setup.query(`INSERT INTO "${schema}".models (id) VALUES ($1), ($2)`, [
      modelId,
      otherModelId,
    ]);
    await setup.release();
    reads = new PostgresOparlReadRepository(db);
    await seedMirror();
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  const query: () => OparlQueryVector = () => ({
    modelId,
    dimensions: DIMENSIONS,
    vector: axis(0),
  });

  const fullTextIds = async (
    ...args: Parameters<typeof reads.fullTextMatches>
  ) => (await reads.fullTextMatches(...args)).map((match) => match.id);
  const vectorIds = async (...args: Parameters<typeof reads.vectorMatches>) =>
    (await reads.vectorMatches(...args)).map((match) => match.id);

  describe('search', () => {
    it('ranks by German full text within the scope and finds nothing of a body outside it', async () => {
      const inA = await fullTextIds(
        scopeA,
        'Kindertagesstätte Michelbach',
        {},
        10,
      );
      const inB = await fullTextIds(
        scopeB,
        'Kindertagesstätte Michelbach',
        {},
        10,
      );

      // Stemming matches "Kindertagesstätten"; more of the words rank higher.
      expect(inA.slice(0, 2).sort(byId)).toEqual(
        [ids.chunks.kitaPaper, ids.chunks.filePage2].sort(byId),
      );
      expect(inA).toContain(ids.chunks.budgetPaper);
      expect(inA).not.toContain(ids.chunks.foreignPaper);
      expect(inB).toEqual([ids.chunks.foreignPaper]);
      expect(await fullTextIds({ bodyIds: [] }, 'Kita', {}, 10)).toEqual([]);
    });

    it('ranks by vector distance within the scope, using only vectors of the query model', async () => {
      const nearest = await vectorIds(scopeA, query(), {}, 10);

      expect(nearest).toEqual([
        ids.chunks.filePage2,
        ids.chunks.kitaPaper,
        ids.chunks.budgetPaper,
      ]);
      expect(await vectorIds(scopeB, query(), {}, 10)).toEqual([
        ids.chunks.foreignPaper,
      ]);
    });

    it('applies the date range, paper type, organization and person filters to both rankings', async () => {
      const both = async (
        filters: Parameters<typeof reads.vectorMatches>[2],
      ) => ({
        fullText: (
          await fullTextIds(
            scopeA,
            'Kindertagesstätten Kita Bauausschuss',
            filters,
            10,
          )
        ).sort(byId),
        vector: (await vectorIds(scopeA, query(), filters, 10)).sort(byId),
      });
      const c = ids.chunks;

      expect(await both({ from: '2026-01-01', to: '2026-01-31' })).toEqual({
        fullText: [c.filePage2, c.kitaPaper].sort(byId),
        vector: [c.filePage2, c.kitaPaper].sort(byId),
      });
      expect(await both({ paperType: 'antrag' })).toEqual({
        fullText: [c.agendaItem, c.filePage2, c.kitaPaper].sort(byId),
        vector: [c.filePage2, c.kitaPaper].sort(byId),
      });
      // The committee's meeting and agenda item, and the paper it deliberated.
      expect((await both({ organizationId: ids.committee })).fullText).toEqual(
        [c.agendaItem, c.filePage2, c.kitaPaper, c.meeting].sort(byId),
      );
      // The paper the person submitted, not the meeting someone else attended.
      expect((await both({ personId: ids.person })).fullText).toEqual(
        [c.filePage2, c.kitaPaper].sort(byId),
      );
      expect((await both({ personId: ids.otherPerson })).fullText).toEqual(
        [c.agendaItem, c.meeting].sort(byId),
      );
    });

    it('follows a consultation that names only its agenda item, for the organization and paper type filters and the hit', async () => {
      const bike = [ids.chunks.bikeAgendaItem, ids.chunks.bikePaper].sort(byId);
      for (const filters of [
        { organizationId: ids.committee },
        { paperType: 'beschlussvorlage' },
      ]) {
        expect(
          (await fullTextIds(scopeA, 'Radweg', filters, 10)).sort(byId),
        ).toEqual(bike);
      }
      const [hit] = await reads.findHits(scopeA, [ids.chunks.bikeAgendaItem]);
      expect(hit.paper?.id).toBe(ids.bikePaper);
    });

    it('matches nothing for an organization or person of a body outside the scope, even when tied to an object in it', async () => {
      for (const filters of [
        { organizationId: ids.foreignCommittee },
        { personId: ids.foreignPerson },
      ]) {
        expect(await fullTextIds(scopeA, 'Bauausschuss', filters, 10)).toEqual(
          [],
        );
        expect(await vectorIds(scopeA, query(), filters, 10)).toEqual([]);
      }
      const page = { offset: 0, limit: 20 };
      for (const type of [OparlListType.MEETINGS, OparlListType.PERSONS]) {
        expect(
          await reads.list(
            scopeA,
            type,
            { organizationId: ids.foreignCommittee },
            page,
          ),
        ).toEqual({ items: [], total: 0 });
      }
    });

    it('describes hits with their paper, meeting, agenda item and file, but not those outside the scope', async () => {
      const hits = await reads.findHits(scopeA, [
        ids.chunks.agendaItem,
        ids.chunks.filePage2,
        ids.chunks.foreignPaper,
      ]);
      const byId = new Map(hits.map((hit) => [hit.chunkId, hit]));

      expect(hits).toHaveLength(2);
      // An agenda item's paper comes through its consultation.
      expect(byId.get(ids.chunks.agendaItem)).toMatchObject({
        source: 'agenda_item',
        paper: { id: ids.kitaPaper, reference: 'AN-4/2026' },
        meeting: { id: ids.meeting, name: 'Bauausschuss (3. Sitzung)' },
        agendaItem: { id: ids.agendaItem, number: 'TOP 4' },
      });
      expect(byId.get(ids.chunks.filePage2)).toMatchObject({
        body: { id: ids.bodyA, name: 'Gemeinde Musterstadt' },
        file: {
          id: ids.file,
          accessUrl: 'https://ris.example.de/files/antrag-kita.pdf',
          pageNumber: 2,
        },
      });
    });
    it('names the passage of every match: a page of its document, else its agenda item, paper or meeting', async () => {
      const matches = await reads.fullTextMatches(
        scopeA,
        'Kita Michelbach Bauausschuss',
        {},
        10,
      );
      const passages = new Map(
        matches.map((match) => [match.id, match.passage]),
      );

      expect(passages.get(ids.chunks.filePage2)).toBe(`file:${ids.file}:2`);
      expect(passages.get(ids.chunks.agendaItem)).toBe(
        `agenda_item:${ids.agendaItem}`,
      );
      expect(passages.get(ids.chunks.kitaPaper)).toBe(`paper:${ids.kitaPaper}`);
      expect(passages.get(ids.chunks.meeting)).toBe(`meeting:${ids.meeting}`);
      const [nearest] = await reads.vectorMatches(scopeA, query(), {}, 1);
      expect(nearest).toEqual({
        id: ids.chunks.filePage2,
        passage: `file:${ids.file}:2`,
      });
    });

    it('applies the source, meeting, paper and file filters to both rankings', async () => {
      const both = async (
        filters: Parameters<typeof reads.vectorMatches>[2],
      ) => ({
        fullText: (
          await fullTextIds(
            scopeA,
            'Kindertagesstätten Kita Bauausschuss Radweg',
            filters,
            10,
          )
        ).sort(byId),
        vector: (await vectorIds(scopeA, query(), filters, 10)).sort(byId),
      });
      const c = ids.chunks;

      expect(await both({ sources: [OparlChunkSource.AGENDA_ITEM] })).toEqual({
        fullText: [c.agendaItem, c.bikeAgendaItem].sort(byId),
        vector: [],
      });
      expect(
        await both({
          sources: [OparlChunkSource.PAPER, OparlChunkSource.FILE],
        }),
      ).toEqual({
        fullText: [c.bikePaper, c.budgetPaper, c.filePage2, c.kitaPaper].sort(
          byId,
        ),
        vector: [c.budgetPaper, c.filePage2, c.kitaPaper].sort(byId),
      });
      // The meeting, its agenda items and its documents.
      expect((await both({ meetingId: ids.meeting })).fullText).toEqual(
        [c.agendaItem, c.bikeAgendaItem, c.meeting].sort(byId),
      );
      // The paper, its documents and the agenda item deliberating it.
      expect(await both({ paperId: ids.kitaPaper })).toEqual({
        fullText: [c.agendaItem, c.filePage2, c.kitaPaper].sort(byId),
        vector: [c.filePage2, c.kitaPaper].sort(byId),
      });
      // Through a consultation that names only its agenda item.
      expect((await both({ paperId: ids.bikePaper })).fullText).toEqual(
        [c.bikeAgendaItem, c.bikePaper].sort(byId),
      );
      expect(await both({ fileId: ids.file })).toEqual({
        fullText: [c.filePage2],
        vector: [c.filePage2],
      });
    });

    it('finds a document under every meeting and paper it belongs to, not only the one its chunks name', async () => {
      const find = (filters: Parameters<typeof reads.fullTextMatches>[2]) =>
        fullTextIds(scopeA, 'Ergebnisprotokoll Grünflächenpflege', filters, 10);
      const protocol = [ids.chunks.protocolPage];

      expect(await find({ meetingId: ids.meeting })).toEqual(protocol);
      expect(await find({ meetingId: ids.laterMeeting })).toEqual(protocol);
      expect(await find({ paperId: ids.bikePaper })).toEqual(protocol);
      expect(await find({ paperId: ids.kitaPaper })).toEqual([]);
      expect(await find({ meetingId: ids.foreignMeeting })).toEqual([]);
    });

    it('matches nothing for a meeting, paper or file of a body outside the scope, even when a chunk in it names them', async () => {
      for (const filters of [
        { meetingId: ids.foreignMeeting },
        { paperId: ids.foreignPaper },
        { fileId: ids.foreignFile },
      ]) {
        expect(
          await fullTextIds(scopeA, 'Niederschrift Kreistag', filters, 10),
        ).toEqual([]);
      }
      // Without a filter, the chunk itself is in the scope.
      expect(
        await fullTextIds(scopeA, 'Niederschrift Kreistag', {}, 10),
      ).toEqual([ids.chunks.crossBodyFile]);
    });
  });

  describe('findObject', () => {
    it('gets a paper with its consultations, originators and files, and leaves out a related paper and a consultation of another body', async () => {
      const paper = (await reads.findObject(
        scopeA,
        ids.kitaPaper,
      )) as OparlPaperDetail;

      expect(paper).toMatchObject({
        type: 'paper',
        name: 'Ausbau der Kindertagesstätten in Michelbach',
        mainFile: { id: ids.file, name: 'Antrag Kita Michelbach' },
        originatorPersons: [{ id: ids.person, name: 'Erika Muster' }],
        originatorOrganizations: [
          { id: ids.faction, name: 'Fraktion Grüne Liste' },
        ],
        relatedPapers: [],
        consultations: [
          {
            role: 'Vorberatung',
            meeting: { id: ids.meeting, name: 'Bauausschuss (3. Sitzung)' },
            agendaItem: {
              id: ids.agendaItem,
              result: 'einstimmig beschlossen',
            },
          },
        ],
      });
    });

    it('gets meetings with their agenda, organizations with their members and persons with their memberships', async () => {
      expect(await reads.findObject(scopeA, ids.meeting)).toMatchObject({
        type: 'meeting',
        organizations: [{ id: ids.committee, name: 'Bauausschuss' }],
        participants: [{ id: ids.otherPerson, name: 'Max Beispiel' }],
        agendaItems: [
          {
            id: ids.agendaItem,
            name: 'Kita Michelbach',
            paper: { id: ids.kitaPaper },
          },
          { id: ids.bikeAgendaItem, paper: { id: ids.bikePaper } },
        ],
      });
      expect(await reads.findObject(scopeA, ids.committee)).toMatchObject({
        type: 'organization',
        memberships: [
          {
            person: { id: ids.person, name: 'Erika Muster' },
            role: 'Vorsitzende',
          },
        ],
      });
      expect(await reads.findObject(scopeA, ids.person)).toMatchObject({
        type: 'person',
        memberships: [{ organization: { id: ids.committee } }],
      });
      // Only membership: in the organization of body B.
      expect(await reads.findObject(scopeA, ids.otherPerson)).toMatchObject({
        type: 'person',
        memberships: [],
      });
    });

    it('does not find an object or a file of a body outside the scope', async () => {
      expect(await reads.findObject(scopeA, ids.foreignPaper)).toBeNull();
      expect(await reads.findObject(scopeB, ids.kitaPaper)).toBeNull();
      expect(await reads.readFile(scopeB, ids.file, 1, 10)).toBeNull();
    });
  });

  it('reads a file from a page on, at most the given number of pages', async () => {
    const content = await reads.readFile(scopeA, ids.file, 2, 1);

    expect(content).toMatchObject({
      status: 'extracted',
      pageCount: 3,
      pages: [{ number: 2, text: 'Seite 2' }],
      file: { accessUrl: 'https://ris.example.de/files/antrag-kita.pdf' },
    });
  });

  describe('list', () => {
    const page = { offset: 0, limit: 20 };

    it('lists meetings latest first, filtered by day in Europe/Berlin and organization', async () => {
      const all = await reads.list(scopeA, OparlListType.MEETINGS, {}, page);
      const february = await reads.list(
        scopeA,
        OparlListType.MEETINGS,
        { from: '2026-02-10', to: '2026-02-10' },
        page,
      );
      const committee = await reads.list(
        scopeA,
        OparlListType.MEETINGS,
        { organizationId: ids.committee },
        page,
      );

      expect(all.items.map((item) => item.id)).toEqual([
        ids.laterMeeting,
        ids.meeting,
      ]);
      expect(february.items.map((item) => item.id)).toEqual([ids.meeting]);
      expect(committee).toMatchObject({ total: 1 });
      expect(
        (committee.items[0] as OparlMeetingListItem).organizations,
      ).toEqual([{ id: ids.committee, name: 'Bauausschuss' }]);
    });

    it('lists persons by membership and name, a page at a time with the total', async () => {
      const members = await reads.list(
        scopeA,
        OparlListType.PERSONS,
        { organizationId: ids.committee },
        page,
      );
      const second = await reads.list(
        scopeA,
        OparlListType.PERSONS,
        {},
        {
          offset: 1,
          limit: 1,
        },
      );

      expect(members.items.map((item) => item.name)).toEqual(['Erika Muster']);
      expect(second).toMatchObject({
        total: 2,
        items: [{ name: 'Erika Muster' }],
      });
      expect(
        (await reads.list(scopeB, OparlListType.PERSONS, {}, page)).items.map(
          (item) => item.name,
        ),
      ).toEqual(['Fremde Person']);
    });

    it('matches organization names literally, so wildcards in the filter match nothing more', async () => {
      const result = await reads.list(
        scopeA,
        OparlListType.ORGANIZATIONS,
        { name: '%' },
        page,
      );

      expect(result.total).toBe(0);
    });
  });
});
