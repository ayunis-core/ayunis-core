import { randomUUID, type UUID } from 'crypto';
import dataSource from 'src/db/datasource';
import type {
  OparlBodyFixture,
  OparlCouncilFixture,
} from 'src/db/fixtures/minimal-fixture.types';
import type { SeedState } from 'src/db/scripts/seed-minimal/seed-state';
import { log } from 'src/db/scripts/utils/seed-log';
import { FILE_FINGERPRINT } from 'src/domain/oparl/infrastructure/persistence/postgres/oparl-documents-sql';
import { GlobalSeeder } from './base-seeder';

interface Owner {
  systemId: UUID;
  bodyId: UUID;
  base: string;
}

/**
 * A small council record per seeded body (a committee and a member, a paper
 * with its document, a meeting deliberating it), with full-text chunks, so
 * the chat's council tools have something to find without a reachable RIS.
 */
export class OparlCouncilSeeder extends GlobalSeeder {
  async seed(ctx: SeedState): Promise<void> {
    for (const system of ctx.fixture.oparlSystems) {
      for (const body of system.bodies) {
        await this.seedBody(system.url, body);
      }
    }
  }

  private async seedBody(
    systemUrl: string,
    body: OparlBodyFixture,
  ): Promise<void> {
    const rows = await dataSource.query<
      Array<{ systemId: UUID; bodyId: UUID }>
    >(
      `SELECT s.id AS "systemId", b.id AS "bodyId" FROM oparl_systems s
       JOIN oparl_bodies b ON b."systemId" = s.id
       WHERE s.url = $1 AND b."oparlId" = $2`,
      [systemUrl, body.oparlId],
    );
    if (rows.length === 0) return;
    const owner = { ...rows[0], base: body.oparlId };
    const { council } = body;
    const [paperId, created] = await this.upsert(
      owner,
      'oparl_papers',
      'paper/1',
      {
        name: council.paper.name,
        reference: council.paper.reference,
        paperType: council.paper.paperType,
        date: council.paper.date,
      },
    );
    if (!created) {
      log('OParl council record', body.name, false);
      return;
    }
    await this.seedMembers(owner, council);
    const fileId = await this.seedPaperFile(owner, council, paperId);
    const meeting = await this.seedMeeting(owner, council, paperId);
    await this.seedChunks(owner, council, { ...meeting, paperId, fileId });
    log('OParl council record', body.name, true);
  }

  private async seedMembers(
    owner: Owner,
    council: OparlCouncilFixture,
  ): Promise<void> {
    const [committeeId] = await this.upsert(
      owner,
      'oparl_organizations',
      'organization/1',
      { name: council.committee, organizationType: 'Gremium' },
    );
    const { givenName, familyName, role } = council.member;
    const [personId] = await this.upsert(owner, 'oparl_persons', 'person/1', {
      name: `${givenName} ${familyName}`,
      givenName,
      familyName,
    });
    await this.upsert(owner, 'oparl_memberships', 'membership/1', {
      personId,
      organizationId: committeeId,
      role,
      startDate: '2021-11-01',
    });
  }

  /** The paper's main file with its text, submitted by the member; the file's ID. */
  private async seedPaperFile(
    owner: Owner,
    council: OparlCouncilFixture,
    paperId: UUID,
  ): Promise<UUID> {
    const { paper } = council;
    const [fileId] = await this.upsert(owner, 'oparl_files', 'file/1', {
      name: `${paper.paperType} (${paper.name})`,
      mimeType: 'application/pdf',
      date: paper.date,
      accessUrl: `${owner.base}/file/1/${paper.reference.replace('/', '-')}.pdf`,
    });
    await this.saveFileText(fileId, paper.filePages);
    await dataSource.query(
      `UPDATE oparl_papers SET "mainFileId" = $1, "mainFileOparlId" = $2 WHERE id = $3`,
      [fileId, `${owner.base}/file/1`, paperId],
    );
    await this.join(
      'oparl_paper_originator_persons',
      paperId,
      `${owner.base}/person/1`,
      'oparl_persons',
    );
    return fileId;
  }

  /** The committee's meeting deliberating the paper in an agenda item. */
  private async seedMeeting(
    owner: Owner,
    council: OparlCouncilFixture,
    paperId: UUID,
  ): Promise<{ meetingId: UUID; agendaItemId: UUID }> {
    const { meeting } = council;
    const [meetingId] = await this.upsert(
      owner,
      'oparl_meetings',
      'meeting/1',
      {
        name: meeting.name,
        start: meeting.start,
      },
    );
    await this.join(
      'oparl_meeting_organizations',
      meetingId,
      `${owner.base}/organization/1`,
      'oparl_organizations',
    );
    const [agendaItemId] = await this.upsert(
      owner,
      'oparl_agenda_items',
      'agendaitem/1',
      {
        number: meeting.agendaItem.number,
        order: 1,
        name: council.paper.name,
        result: meeting.agendaItem.result,
        meetingId,
      },
    );
    await this.seedConsultation(owner, { paperId, meetingId, agendaItemId });
    return { meetingId, agendaItemId };
  }

  private async seedConsultation(
    owner: Owner,
    ids: { paperId: UUID; meetingId: UUID; agendaItemId: UUID },
  ): Promise<void> {
    const [consultationId] = await this.upsert(
      owner,
      'oparl_consultations',
      'consultation/1',
      {
        ...ids,
        role: 'Entscheidung',
        authoritative: true,
      },
    );
    await dataSource.query(
      `UPDATE oparl_agenda_items SET "consultationId" = $1 WHERE id = $2`,
      [consultationId, ids.agendaItemId],
    );
  }

  private async seedChunks(
    owner: Owner,
    council: OparlCouncilFixture,
    ids: { paperId: UUID; meetingId: UUID; agendaItemId: UUID; fileId: UUID },
  ): Promise<void> {
    const { paper, meeting } = council;
    const meetingDay = meeting.start.slice(0, 10);
    const chunks = [
      {
        source: 'paper',
        ordinal: 0,
        paperId: ids.paperId,
        date: paper.date,
        text: `${paper.reference}\n${paper.name}\n${paper.paperType}`,
      },
      {
        source: 'meeting',
        ordinal: 0,
        meetingId: ids.meetingId,
        date: meetingDay,
        text: meeting.name,
      },
      {
        source: 'agenda_item',
        ordinal: 0,
        agendaItemId: ids.agendaItemId,
        meetingId: ids.meetingId,
        date: meetingDay,
        text: `${meeting.agendaItem.number}\n${paper.name}\n${meeting.agendaItem.result}`,
      },
      ...paper.filePages.map((text, index) => ({
        source: 'file',
        ordinal: index,
        fileId: ids.fileId,
        paperId: ids.paperId,
        date: paper.date,
        pageNumber: index + 1,
        text,
      })),
    ];
    for (const chunk of chunks) {
      await this.insert('oparl_chunks', {
        id: randomUUID(),
        bodyId: owner.bodyId,
        ...chunk,
      });
    }
  }

  // The fingerprint of the file's current metadata, so the document job does
  // not try to download it from the unreachable RIS.
  private async saveFileText(fileId: UUID, pages: readonly string[]) {
    await dataSource.query(
      `INSERT INTO oparl_file_texts ("fileId", status, "contentHash", "pageCount", pages,
         "chunkCount", "sourceFingerprint", attempts, "readAt")
       SELECT f.id, 'extracted', 'seed', $2, $3::jsonb, $2, ${FILE_FINGERPRINT}, 0, now()
       FROM oparl_files f WHERE f.id = $1`,
      [
        fileId,
        pages.length,
        JSON.stringify(
          pages.map((text, index) => ({ number: index + 1, text })),
        ),
      ],
    );
  }

  /** The row's ID, and whether it was created now. */
  private async upsert(
    owner: Owner,
    table: string,
    path: string,
    fields: Record<string, unknown>,
  ): Promise<[UUID, boolean]> {
    const oparlId = `${owner.base}/${path}`;
    const id = randomUUID();
    await this.insert(
      table,
      {
        id,
        systemId: owner.systemId,
        bodyId: owner.bodyId,
        oparlId,
        web: `${owner.base.replace('/oparl/v1.1/body', '/ris')}/${path}`,
        raw: { id: oparlId },
        fromListing: true,
        ...fields,
      },
      'ON CONFLICT ("systemId", "oparlId") DO NOTHING',
    );
    const [row] = await dataSource.query<Array<{ id: UUID }>>(
      `SELECT id FROM "${table}" WHERE "systemId" = $1 AND "oparlId" = $2`,
      [owner.systemId, oparlId],
    );
    return [row.id, row.id === id];
  }

  private async join(
    table: string,
    ownerId: UUID,
    targetOparlId: string,
    targetTable: string,
  ) {
    await dataSource.query(
      `INSERT INTO "${table}" ("ownerId", "targetOparlId", "targetId")
       SELECT $1, t."oparlId", t.id FROM "${targetTable}" t WHERE t."oparlId" = $2
       ON CONFLICT DO NOTHING`,
      [ownerId, targetOparlId],
    );
  }

  private async insert(
    table: string,
    row: Record<string, unknown>,
    suffix = '',
  ): Promise<void> {
    const columns = Object.keys(row)
      .map((column) => '"' + column + '"')
      .join(', ');
    const values = Object.keys(row)
      .map((_, index) => '$' + String(index + 1))
      .join(', ');
    await dataSource.query(
      `INSERT INTO "${table}" (${columns}) VALUES (${values}) ${suffix}`,
      Object.values(row),
    );
  }
}
