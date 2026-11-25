import type { UUID } from 'crypto';
import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import {
  OparlSyncKind,
  OparlSyncRun,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { OparlPage } from 'src/domain/oparl/application/models/oparl-object';
import type { OparlSyncProgress } from 'src/domain/oparl/application/models/oparl-sync-progress';
import type { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import type { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import { OparlRequestFailedError } from 'src/domain/oparl/application/oparl.errors';
import type { OparlPageWriter } from './oparl-page-writer.service';
import { OparlSyncService } from './oparl-sync.service';

const SYSTEM_URL =
  'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/system';
const BODY = 'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/body/1';
const PAPERS = `${BODY}/paper`;
const CONSULTATIONS = `${BODY}/consultation`;
const MEETINGS = `${BODY}/meeting`;
const LOCATIONS = `${BODY}/location`;
const BODY_ID = '0b8a5a8e-0d8e-4c55-9b47-2b8c3b1f6e10' as UUID;

const page = (data: unknown[], nextUrl: string | null = null): OparlPage => ({
  data,
  nextUrl,
  totalElements: null,
});

function setup(
  pages: Record<string, OparlPage | number>,
  delta = true,
  invalidBodies = 0,
  lists: Record<string, string> = {
    paper: PAPERS,
    consultation: CONSULTATIONS,
  },
) {
  const system = new OparlSystem({
    url: SYSTEM_URL,
    oparlId: SYSTEM_URL,
    name: 'SD.NET RIM',
    vendor: null,
    product: null,
    oparlVersion: null,
    website: null,
    raw: {},
    lastFullSyncAt: new Date('2026-11-20T00:00:00Z'),
  });
  const run = new OparlSyncRun({
    systemId: system.id,
    kind: delta ? OparlSyncKind.DELTA : OparlSyncKind.FULL,
    modifiedSince: delta ? new Date('2026-11-19T23:00:00Z') : null,
  });
  const requested: string[] = [];
  const client = {
    fetchObject: jest.fn().mockResolvedValue({
      id: SYSTEM_URL,
      type: 'https://schema.oparl.org/1.1/System',
      body: `${BODY}s`,
    }),
    fetchPage: jest.fn((url: string) => {
      requested.push(url);
      if (url === `${BODY}s`) return Promise.resolve(page([]));
      const answer = pages[url];
      if (typeof answer === 'number')
        return Promise.reject(new OparlRequestFailedError(url, answer, false));
      return answer
        ? Promise.resolve(answer)
        : Promise.reject(new OparlRequestFailedError(url, 404, false));
    }),
  };
  const written: Array<{ type: OparlEntityType; items: unknown[] }> = [];
  const writer = {
    writeBodies: jest.fn().mockResolvedValue({
      bodies: [
        {
          id: BODY_ID,
          oparlId: BODY,
          raw: lists,
        },
      ],
      result: { written: {}, deleted: {}, invalid: invalidBodies },
    }),
    writePage: jest.fn(
      (_scope: unknown, type: OparlEntityType, items: unknown[]) => {
        written.push({ type, items });
        return Promise.resolve({ written: {}, deleted: {}, invalid: 0 });
      },
    ),
  };
  const mirror = { linkReferences: jest.fn().mockResolvedValue(undefined) };
  const systems = { updateMetadata: jest.fn().mockResolvedValue(undefined) };
  const service = new OparlSyncService(
    client,
    writer as unknown as OparlPageWriter,
    mirror as unknown as OparlMirrorRepository,
    systems as unknown as OparlSystemsRepository,
  );
  const progress: OparlSyncProgress = { runId: run.id, cursors: {} };
  const sync = () =>
    service.sync({
      system,
      run,
      progress,
      saveProgress: () => Promise.resolve(),
      signal: new AbortController().signal,
    });
  return { sync, system, progress, requested, written, client, systems };
}

const since = 'modified_since=2026-11-19T23%3A00%3A00Z';

describe('OparlSyncService', () => {
  it("takes a 404 for a delta's unchanged list as no changes, once the list itself exists", async () => {
    const { sync, written } = setup({
      [`${PAPERS}?${since}`]: page([{ id: `${PAPERS}/6499` }]),
      [CONSULTATIONS]: page([{ id: `${CONSULTATIONS}/1` }]),
    });

    const outcome = await sync();

    expect(outcome).toEqual({ listingError: null, invalidObjects: 0 });
    expect(written.map(({ type, items }) => [type, items.length])).toEqual([
      [OparlEntityType.PAPER, 1],
      [OparlEntityType.CONSULTATION, 0],
    ]);
  });

  it('lists a list completely when it rejects modified_since', async () => {
    const { sync, written } = setup({
      [`${PAPERS}?${since}`]: 400,
      [PAPERS]: page([{ id: `${PAPERS}/1` }, { id: `${PAPERS}/2` }]),
      [CONSULTATIONS]: page([]),
    });

    const outcome = await sync();

    expect(outcome).toEqual({ listingError: null, invalidObjects: 0 });
    expect(written[0]).toEqual({
      type: OparlEntityType.PAPER,
      items: [{ id: `${PAPERS}/1` }, { id: `${PAPERS}/2` }],
    });
  });

  it('lists only the lists that reject modified_since completely, in this delta and the next', async () => {
    const { sync, progress, requested } = setup(
      {
        [`${PAPERS}?${since}`]: 400,
        [PAPERS]: page([{ id: `${PAPERS}/1` }]),
        [`${CONSULTATIONS}?${since}`]: page([]),
        [`${MEETINGS}?${since}`]: page([]),
        [`${LOCATIONS}?${since}`]: 400,
        [LOCATIONS]: page([{ id: `${LOCATIONS}/1` }]),
      },
      true,
      0,
      {
        paper: PAPERS,
        consultation: CONSULTATIONS,
        meeting: MEETINGS,
        locationList: LOCATIONS,
      },
    );

    const delta = async () => {
      requested.length = 0;
      progress.cursors = {};
      await sync();
      return [...requested].sort((a, b) => a.localeCompare(b));
    };
    const expected = [
      `${BODY}s`,
      `${CONSULTATIONS}?${since}`,
      `${LOCATIONS}?${since}`,
      LOCATIONS,
      `${MEETINGS}?${since}`,
      `${PAPERS}?${since}`,
      PAPERS,
    ].sort((a, b) => a.localeCompare(b));

    expect(await delta()).toEqual(expected);
    expect(await delta()).toEqual(expected);
  });

  it('reports a list that fails as an incomplete listing instead of throwing', async () => {
    const { sync } = setup(
      {
        [PAPERS]: page([{ id: `${PAPERS}/1` }], `${PAPERS}?page=2`),
        [`${PAPERS}?page=2`]: 503,
        [CONSULTATIONS]: page([]),
      },
      false,
    );

    const outcome = await sync();

    expect(outcome.listingError).toContain('HTTP 503');
  });

  it('resumes each list from its saved page and skips the lists it finished', async () => {
    const { sync, progress, requested } = setup(
      {
        [`${PAPERS}?page=7`]: page([{ id: `${PAPERS}/170` }]),
      },
      false,
    );
    progress.cursors = {
      [`${BODY} paper`]: `${PAPERS}?page=7`,
      [`${BODY} consultation`]: null,
    };

    await sync();

    expect(requested).toEqual([`${BODY}s`, `${PAPERS}?page=7`]);
    expect(progress.cursors[`${BODY} paper`]).toBeNull();
  });

  it('goes on past a body without ID but counts it, so the listing is not taken as complete', async () => {
    const { sync, written } = setup(
      { [PAPERS]: page([{ id: `${PAPERS}/1` }]), [CONSULTATIONS]: page([]) },
      false,
      1,
    );

    const outcome = await sync();

    expect(outcome).toMatchObject({ listingError: null, invalidObjects: 1 });
    expect(written.map(({ type }) => type)).toContain(OparlEntityType.PAPER);
  });

  it('keeps the count of skipped objects across a resume, so a resumed listing is still incomplete', async () => {
    const { sync, progress } = setup(
      { [`${PAPERS}?page=7`]: page([{ id: `${PAPERS}/170` }]) },
      false,
    );
    progress.cursors = {
      [`${BODY} paper`]: `${PAPERS}?page=7`,
      [`${BODY} consultation`]: null,
    };
    progress.invalidObjects = 2;

    const outcome = await sync();

    expect(outcome.invalidObjects).toBe(2);
  });

  it('counts a body without ID once however often the run resumes, since the bodies are listed again', async () => {
    const { sync } = setup(
      { [PAPERS]: page([{ id: `${PAPERS}/1` }]), [CONSULTATIONS]: page([]) },
      false,
      1,
    );

    await sync();
    const resumed = await sync();

    expect(resumed.invalidObjects).toBe(1);
  });

  it("keeps the system's name and original when its URL no longer returns an OParl System", async () => {
    const { sync, client, systems } = setup({});
    client.fetchObject.mockResolvedValue({
      id: SYSTEM_URL,
      type: 'https://schema.oparl.org/1.1/Body',
      name: 'Wartungsseite',
      body: `${BODY}s`,
    });

    const outcome = await sync();

    expect(outcome.listingError).toContain('not an OParl System');
    expect(systems.updateMetadata).not.toHaveBeenCalled();
  });
});
