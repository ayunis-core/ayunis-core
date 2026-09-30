import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import {
  createSourcePostgresHarness,
  type SourcePostgresHarness,
} from 'src/domain/sources/application/testing/source-postgres.harness';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { SourceRecord } from './schema/source.record';

const ORG_ID = randomUUID();
const OTHER_ORG_ID = randomUUID();
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe('Source re-index schedule claims (Postgres)', () => {
  let harness: SourcePostgresHarness;
  let knowledgeBaseId: UUID;
  let otherOrgKnowledgeBaseId: UUID;

  beforeAll(async () => {
    harness = await createSourcePostgresHarness(ORG_ID);
    knowledgeBaseId = await createKnowledgeBase(ORG_ID, 'Stadtverwaltung');
    otherOrgKnowledgeBaseId = await createKnowledgeBase(
      OTHER_ORG_ID,
      'Landkreis',
    );
  });

  afterAll(async () => {
    await harness.destroy();
  });

  beforeEach(async () => {
    await harness.dataSource
      .getRepository(SourceRecord)
      .createQueryBuilder()
      .delete()
      .execute();
  });

  async function createKnowledgeBase(orgId: UUID, name: string): Promise<UUID> {
    const userId = randomUUID();
    const id = randomUUID();
    await harness.dataSource.query(
      `INSERT INTO orgs (id, name) VALUES ($1, $2)`,
      [orgId, name],
    );
    await harness.dataSource.query(
      `INSERT INTO users (id, email, name, role, "orgId") VALUES ($1, $2, 'Sachbearbeitung', 'admin', $3)`,
      [userId, `${userId}@stadt.example`, orgId],
    );
    await harness.dataSource.query(
      `INSERT INTO knowledge_bases (id, name, "orgId", "userId") VALUES ($1, 'Wissen', $2, $3)`,
      [id, orgId, userId],
    );
    return id;
  }

  async function scheduledSource(params: {
    nextReindexAt: Date | null;
    interval?: ReindexInterval;
    knowledgeBaseId?: UUID | null;
    status?: SourceStatus;
  }): Promise<UUID> {
    const source = new UrlSource({
      name: 'Abfallkalender',
      type: TextType.WEB,
      url: 'https://www.stadt.example/abfall',
      status: params.status ?? SourceStatus.READY,
      knowledgeBaseId:
        params.knowledgeBaseId === undefined
          ? knowledgeBaseId
          : params.knowledgeBaseId,
      reindexInterval: params.nextReindexAt
        ? (params.interval ?? new ReindexInterval(2, ReindexIntervalUnit.WEEKS))
        : null,
      nextReindexAt: params.nextReindexAt,
    });
    await harness.sourceRepository.save(source);
    return source.id;
  }

  function hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * HOUR_MS);
  }

  async function storedNextReindexAt(sourceId: UUID): Promise<Date | null> {
    const row = await harness.dataSource
      .getRepository(SourceRecord)
      .findOneByOrFail({ id: sourceId });
    return row.nextReindexAt;
  }

  it('claims a due source with its org and type and moves it one interval past the claim', async () => {
    const dueAt = hoursAgo(1);
    const sourceId = await scheduledSource({ nextReindexAt: dueAt });
    const before = Date.now();

    const claimed = await harness.sourceRepository.claimDueReindexes(10);

    const next = (await storedNextReindexAt(sourceId))!.getTime();
    expect(claimed).toEqual([
      {
        sourceId,
        orgId: ORG_ID,
        subtype: TextType.WEB,
        dueAt,
        nextDueAt: new Date(next),
      },
    ]);
    expect(next).toBeGreaterThanOrEqual(before + 14 * DAY_MS - 5000);
    // Tolerates clock skew between the test process and the database.
    expect(next).toBeLessThanOrEqual(Date.now() + 14 * DAY_MS + 5000);
  });

  it('moves a monthly source by a calendar month', async () => {
    const sourceId = await scheduledSource({
      nextReindexAt: hoursAgo(1),
      interval: new ReindexInterval(1, ReindexIntervalUnit.MONTHS),
    });

    await harness.sourceRepository.claimDueReindexes(10);

    const expected = new ReindexInterval(1, ReindexIntervalUnit.MONTHS).addTo(
      new Date(),
    );
    const next = (await storedNextReindexAt(sourceId))!.getTime();
    expect(Math.abs(next - expected.getTime())).toBeLessThan(5000);
  });

  it('never claims an unscheduled, a not yet due, or a knowledge-base-less source', async () => {
    await scheduledSource({ nextReindexAt: null });
    await scheduledSource({ nextReindexAt: new Date(Date.now() + HOUR_MS) });
    await scheduledSource({
      nextReindexAt: hoursAgo(1),
      knowledgeBaseId: null,
    });

    await expect(
      harness.sourceRepository.claimDueReindexes(10),
    ).resolves.toEqual([]);
  });

  it('takes the org from each source’s own knowledge base', async () => {
    const sourceId = await scheduledSource({
      nextReindexAt: hoursAgo(1),
      knowledgeBaseId: otherOrgKnowledgeBaseId,
    });

    const [claimed] = await harness.sourceRepository.claimDueReindexes(10);

    expect(claimed).toMatchObject({ sourceId, orgId: OTHER_ORG_ID });
  });

  it('claims a claimed source only once', async () => {
    await scheduledSource({ nextReindexAt: hoursAgo(1) });

    const first = await harness.sourceRepository.claimDueReindexes(10);
    const second = await harness.sourceRepository.claimDueReindexes(10);

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
  });

  it('claims at most the limit, longest overdue first', async () => {
    const oldest = await scheduledSource({ nextReindexAt: hoursAgo(30) });
    const older = await scheduledSource({ nextReindexAt: hoursAgo(20) });
    await scheduledSource({ nextReindexAt: hoursAgo(10) });

    const claimed = await harness.sourceRepository.claimDueReindexes(2);

    expect(claimed.map((due) => due.sourceId)).toEqual([oldest, older]);
  });

  it('skips sources another claimer holds instead of waiting for them', async () => {
    const held = await scheduledSource({ nextReindexAt: hoursAgo(2) });
    const free = await scheduledSource({ nextReindexAt: hoursAgo(1) });
    const otherInstance = harness.dataSource.createQueryRunner();
    await otherInstance.connect();
    await otherInstance.startTransaction();
    try {
      await otherInstance.query(
        `SELECT id FROM sources WHERE id = $1 FOR UPDATE`,
        [held],
      );

      const claimed = await harness.sourceRepository.claimDueReindexes(10);

      expect(claimed.map((due) => due.sourceId)).toEqual([free]);
    } finally {
      await otherInstance.rollbackTransaction();
      await otherInstance.release();
    }
  });

  it('gives every due source to exactly one of several concurrent claimers', async () => {
    const due = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        scheduledSource({ nextReindexAt: hoursAgo(index + 1) }),
      ),
    );

    const claims = await Promise.all(
      Array.from({ length: 4 }, () =>
        harness.sourceRepository.claimDueReindexes(15),
      ),
    );

    const claimedIds = claims.flat().map((claim) => claim.sourceId);
    expect(claimedIds).toHaveLength(due.length);
    expect(new Set(claimedIds)).toEqual(new Set(due));
  });

  it('makes a released claim due again at its previous due date', async () => {
    const dueAt = hoursAgo(3);
    const sourceId = await scheduledSource({ nextReindexAt: dueAt });
    const [claim] = await harness.sourceRepository.claimDueReindexes(10);

    await harness.sourceRepository.releaseReindexClaim(claim);

    await expect(storedNextReindexAt(sourceId)).resolves.toEqual(dueAt);
    const reclaimed = await harness.sourceRepository.claimDueReindexes(10);
    expect(reclaimed.map((claim) => claim.sourceId)).toEqual([sourceId]);
  });

  it('does not bring back a schedule cleared before the claim is released', async () => {
    const sourceId = await scheduledSource({ nextReindexAt: hoursAgo(3) });
    const [claim] = await harness.sourceRepository.claimDueReindexes(10);
    await harness.sourceRepository.updateReindexSchedule(sourceId, {
      interval: null,
      nextReindexAt: null,
    });

    await harness.sourceRepository.releaseReindexClaim(claim);

    await expect(storedNextReindexAt(sourceId)).resolves.toBeNull();
  });

  it('does not overwrite a schedule changed after the claim when releasing it', async () => {
    const sourceId = await scheduledSource({ nextReindexAt: hoursAgo(3) });
    const [claim] = await harness.sourceRepository.claimDueReindexes(10);
    const changedNextReindexAt = new Date(Date.now() + 30 * DAY_MS);
    await harness.sourceRepository.updateReindexSchedule(sourceId, {
      interval: new ReindexInterval(1, ReindexIntervalUnit.MONTHS),
      nextReindexAt: changedNextReindexAt,
    });

    await harness.sourceRepository.releaseReindexClaim(claim);

    await expect(storedNextReindexAt(sourceId)).resolves.toEqual(
      changedNextReindexAt,
    );
  });

  it('counts the distinct pages of the committed content', async () => {
    // Still processing, so findById loads it without committed details.
    const sourceId = await scheduledSource({
      nextReindexAt: null,
      status: SourceStatus.PROCESSING,
    });
    const chunk = (url: string, content: string): TextSourceContentChunk =>
      new TextSourceContentChunk({ content, meta: { url } });
    const source = await harness.sourceRepository.findById(sourceId);
    const content = await harness.contentReplacement.prepare({
      sourceId,
      orgId: ORG_ID,
      text: 'Abfuhr',
      chunks: [
        chunk('https://www.stadt.example/abfall', 'Restmüll'),
        chunk('https://www.stadt.example/abfall', 'Biotonne'),
        chunk('https://www.stadt.example/abfall/sperrmuell', 'Sperrmüll'),
      ],
    });
    await harness.txHost.withTransaction(() =>
      harness.contentReplacement.commit(source as UrlSource, content),
    );

    await expect(
      harness.sourceRepository.countIndexedPages(sourceId),
    ).resolves.toBe(2);
  });
});
