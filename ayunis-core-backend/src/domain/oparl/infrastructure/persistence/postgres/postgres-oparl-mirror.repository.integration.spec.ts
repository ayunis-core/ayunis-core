import { randomUUID, type UUID } from 'crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateOparlMirrorTables1795478677149 } from 'src/db/migrations/1795478677149-CreateOparlMirrorTables';
import { RemoveOparlOrganizationLocations1795513616341 } from 'src/db/migrations/1795513616341-RemoveOparlOrganizationLocations';
import type { MirrorObject } from 'src/domain/oparl/application/models/oparl-object';
import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import { PostgresOparlMirrorRepository } from './postgres-oparl-mirror.repository';

const BASE = 'https://ris.example.de/oparl/body/1';
const T = OparlEntityType;

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
    raw: { id: oparlId, name: 'Bauausschuss' },
    fields: {},
    refs: {},
    joins: {},
    ...overrides,
  };
}

const meeting = (oparlId: string, overrides: Partial<MirrorObject> = {}) =>
  object(T.MEETING, oparlId, {
    fields: { name: 'Bauausschuss', start: '2026-02-03T18:00:00+01:00' },
    refs: {
      location: null,
      invitation: null,
      resultsProtocol: null,
      verbatimProtocol: null,
    },
    joins: { organizations: [], participants: [], auxiliaryFiles: [] },
    ...overrides,
  });

const agendaItem = (oparlId: string, overrides: Partial<MirrorObject> = {}) =>
  object(T.AGENDA_ITEM, oparlId, {
    fields: { number: '1.', name: 'Kita-Ausbau' },
    refs: { meeting: null, consultation: null, resolutionFile: null },
    joins: { auxiliaryFiles: [] },
    ...overrides,
  });

describe('PostgresOparlMirrorRepository', () => {
  const schema = `ayc2058_oparl_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let mirror: PostgresOparlMirrorRepository;
  let systemId: UUID;
  let bodyId: UUID;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      entities: [],
      migrations: [],
      migrationsRun: false,
      logging: false,
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    // The migrations name their enum types in "public"; keep them in the schema.
    const runner = {
      query: (sql: string) =>
        setup.query(sql.replaceAll('"public".', `"${schema}".`)),
    } as QueryRunner;
    await new CreateOparlMirrorTables1795478677149().up(runner);
    await new RemoveOparlOrganizationLocations1795513616341().up(runner);
    await setup.release();
    mirror = new PostgresOparlMirrorRepository(db, {
      get tx() {
        return db.manager;
      },
    } as never);
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

  const scope = () => ({ systemId, bodyId });
  const rowOf = async (table: string, oparlId: string) =>
    (
      await db.query(
        `SELECT * FROM "${table}" WHERE "systemId" = $1 AND "oparlId" = $2`,
        [systemId, oparlId],
      )
    )[0];

  it('writes an unchanged object no more and keeps its row ID when it changes', async () => {
    const id = `${BASE}/meeting/1`;
    expect(await mirror.write(scope(), T.MEETING, [meeting(id)])).toBe(1);
    const first = await rowOf('oparl_meetings', id);

    expect(await mirror.write(scope(), T.MEETING, [meeting(id)])).toBe(0);
    expect((await rowOf('oparl_meetings', id)).updatedAt).toEqual(
      first.updatedAt,
    );

    const changed = meeting(id, {
      raw: { id, name: 'Bauausschuss (verlegt)' },
      fields: {
        name: 'Bauausschuss (verlegt)',
        start: '2026-02-10T18:00:00+01:00',
      },
    });
    expect(await mirror.write(scope(), T.MEETING, [changed])).toBe(1);
    const updated = await rowOf('oparl_meetings', id);
    expect(updated.id).toBe(first.id);
    expect(updated.name).toBe('Bauausschuss (verlegt)');
  });

  it('keeps the listed form when an embedded form is not newer', async () => {
    const id = `${BASE}/agendaitem/7`;
    const listed = agendaItem(id, {
      raw: { id, name: 'Kita-Ausbau', meeting: `${BASE}/meeting/1` },
    });
    await mirror.write(scope(), T.AGENDA_ITEM, [listed]);

    const embedded = agendaItem(id, {
      embedded: true,
      raw: { id, name: 'Kita-Ausbau' },
    });
    expect(await mirror.write(scope(), T.AGENDA_ITEM, [embedded])).toBe(0);
    expect((await rowOf('oparl_agenda_items', id)).raw).toEqual(listed.raw);

    const newer = agendaItem(id, {
      embedded: true,
      oparlModified: '2026-03-01T09:00:00+01:00',
      raw: { id, name: 'Kita-Ausbau (geändert)' },
    });
    expect(await mirror.write(scope(), T.AGENDA_ITEM, [newer])).toBe(1);
  });

  it('keeps the listed form of an object without modified against its shorter embedded form', async () => {
    const id = `${BASE}/person/68`;
    const listed = object(T.PERSON, id, {
      oparlModified: null,
      raw: { id, name: 'Frau Anna Weber', status: ['Ortsvorsteherin'] },
    });
    const embedded = object(T.PERSON, id, {
      embedded: true,
      oparlModified: null,
      raw: { id, name: 'Frau Anna Weber' },
    });
    await mirror.write(scope(), T.PERSON, [listed]);

    expect(await mirror.write(scope(), T.PERSON, [embedded])).toBe(0);
    expect(await mirror.write(scope(), T.PERSON, [listed])).toBe(0);
    expect((await rowOf('oparl_persons', id)).raw).toEqual(listed.raw);
  });

  it('links references once the referenced object is mirrored, rows and join rows', async () => {
    const meetingId = `${BASE}/meeting/2`;
    const itemId = `${BASE}/agendaitem/8`;
    const fileId = `${BASE}/file/9`;
    await mirror.write(scope(), T.AGENDA_ITEM, [
      agendaItem(itemId, {
        refs: { meeting: meetingId, consultation: null, resolutionFile: null },
        joins: { auxiliaryFiles: [fileId] },
      }),
    ]);
    expect((await rowOf('oparl_agenda_items', itemId)).meetingId).toBeNull();

    await mirror.write(scope(), T.MEETING, [meeting(meetingId)]);
    await mirror.write(scope(), T.FILE, [
      object(T.FILE, fileId, { refs: { masterFile: null } }),
    ]);
    await mirror.linkReferences(systemId);

    const item = await rowOf('oparl_agenda_items', itemId);
    expect(item.meetingId).toBe((await rowOf('oparl_meetings', meetingId)).id);
    const [join] = await db.query(
      `SELECT "targetId" FROM "oparl_agenda_item_auxiliary_files" WHERE "ownerId" = $1`,
      [item.id],
    );
    expect(join.targetId).toBe((await rowOf('oparl_files', fileId)).id);
  });

  it('removes a deleted meeting with its agenda items, but not the files it referenced', async () => {
    const meetingId = `${BASE}/meeting/3`;
    const itemId = `${BASE}/agendaitem/10`;
    const fileId = `${BASE}/file/11`;
    await mirror.write(scope(), T.FILE, [
      object(T.FILE, fileId, { refs: { masterFile: null } }),
    ]);
    await mirror.write(scope(), T.MEETING, [
      meeting(meetingId, {
        refs: {
          location: null,
          invitation: fileId,
          resultsProtocol: null,
          verbatimProtocol: null,
        },
        joins: {
          organizations: [],
          participants: [],
          auxiliaryFiles: [fileId],
        },
      }),
    ]);
    await mirror.write(scope(), T.AGENDA_ITEM, [
      agendaItem(itemId, {
        refs: { meeting: meetingId, consultation: null, resolutionFile: null },
      }),
    ]);
    await mirror.linkReferences(systemId);

    expect(await mirror.delete(systemId, T.MEETING, [meetingId])).toBe(1);

    expect(await rowOf('oparl_agenda_items', itemId)).toBeUndefined();
    expect(await rowOf('oparl_files', fileId)).toBeDefined();
    expect(
      await db.query(
        `SELECT 1 FROM "oparl_meeting_auxiliary_files" WHERE "targetOparlId" = $1`,
        [fileId],
      ),
    ).toEqual([]);
  });

  it('mirrors a listed location only as the place of something, never a bare address', async () => {
    const hall = `${BASE}/location/2-12`;
    const address = `${BASE}/location/1-41`;
    const listed = (id: string) =>
      object(T.LOCATION, id, { raw: { id, streetAddress: 'Hauser Weg 10' } });

    expect(await mirror.write(scope(), T.LOCATION, [listed(address)])).toBe(0);

    await mirror.write(scope(), T.MEETING, [
      meeting(`${BASE}/meeting/4`, {
        refs: {
          location: hall,
          invitation: null,
          resultsProtocol: null,
          verbatimProtocol: null,
        },
      }),
    ]);
    expect(await mirror.write(scope(), T.LOCATION, [listed(hall)])).toBe(1);
    expect(await rowOf('oparl_locations', address)).toBeUndefined();
  });

  it("does not mirror an organization's address, which may be the chair's home", async () => {
    const home = `${BASE}/location/1-77`;
    await mirror.write(scope(), T.ORGANIZATION, [
      object(T.ORGANIZATION, `${BASE}/organization/2-7`, {
        refs: { subOrganizationOf: null, location: home },
      }),
    ]);

    expect(
      await mirror.write(scope(), T.LOCATION, [
        object(T.LOCATION, home, {
          raw: { id: home, streetAddress: 'Am Hang 3' },
        }),
      ]),
    ).toBe(0);
    expect(await rowOf('oparl_locations', home)).toBeUndefined();
  });

  it('counts and removes only what a full listing did not contain', async () => {
    const runId = randomUUID();
    await db.query(
      `INSERT INTO "oparl_sync_runs" ("id", "systemId", "kind", "status", "startedAt", "stats") VALUES ($1, $2, 'full', 'running', now(), '{}')`,
      [runId, systemId],
    );
    const ids = [1, 2, 3].map((n) => `${BASE}/meeting/${n}0`);
    await mirror.write(
      scope(),
      T.MEETING,
      ids.map((id) => meeting(id)),
    );
    await mirror.markListed(runId, T.BODY, [BASE]);
    await mirror.markListed(runId, T.MEETING, ids.slice(0, 2));

    const counts = await mirror.countUnlisted(systemId, runId);
    expect(counts.find((c) => c.type === T.MEETING)).toEqual({
      type: T.MEETING,
      total: 3,
      removed: 1,
    });
    expect(counts.find((c) => c.type === T.BODY)).toMatchObject({
      removed: 0,
    });

    expect(await mirror.deleteUnlisted(systemId, runId)).toEqual({
      [T.MEETING]: 1,
    });
    expect(await rowOf('oparl_meetings', ids[2])).toBeUndefined();
    expect(await rowOf('oparl_meetings', ids[0])).toBeDefined();
  });

  it('removes a listed location that is no longer the place of anything in a full reconciliation', async () => {
    const runId = randomUUID();
    await db.query(
      `INSERT INTO "oparl_sync_runs" ("id", "systemId", "kind", "status", "startedAt", "stats") VALUES ($1, $2, 'full', 'running', now(), '{}')`,
      [runId, systemId],
    );
    const home = `${BASE}/location/3-1`;
    const hall = `${BASE}/location/3-2`;
    const meetingAt = (id: string, location: string | null) =>
      meeting(id, {
        refs: {
          location,
          invitation: null,
          resultsProtocol: null,
          verbatimProtocol: null,
        },
      });
    const meetings = [`${BASE}/meeting/31`, `${BASE}/meeting/32`];
    await mirror.write(scope(), T.MEETING, [
      meetingAt(meetings[0], home),
      meetingAt(meetings[1], hall),
    ]);
    await mirror.write(
      scope(),
      T.LOCATION,
      [home, hall].map((id) => object(T.LOCATION, id, { raw: { id } })),
    );
    await mirror.write(scope(), T.MEETING, [meetingAt(meetings[0], null)]);
    await mirror.markListed(runId, T.BODY, [BASE]);
    await mirror.markListed(runId, T.MEETING, meetings);
    await mirror.markListed(runId, T.LOCATION, [home, hall]);

    const counts = await mirror.countUnlisted(systemId, runId);
    expect(counts.find((c) => c.type === T.LOCATION)).toEqual({
      type: T.LOCATION,
      total: 2,
      removed: 1,
    });
    expect(await mirror.deleteUnlisted(systemId, runId)).toEqual({
      [T.LOCATION]: 1,
    });
    expect(await rowOf('oparl_locations', home)).toBeUndefined();
    expect(await rowOf('oparl_locations', hall)).toBeDefined();
  });

  it('counts what a removal takes along as removed, so the 10 % cap holds after cascades', async () => {
    const runId = randomUUID();
    await db.query(
      `INSERT INTO "oparl_sync_runs" ("id", "systemId", "kind", "status", "startedAt", "stats") VALUES ($1, $2, 'full', 'running', now(), '{}')`,
      [runId, systemId],
    );
    const person = `${BASE}/person/67`;
    const membership = `${BASE}/membership/14-1-1-67`;
    await mirror.write(scope(), T.PERSON, [object(T.PERSON, person)]);
    await mirror.write(scope(), T.MEMBERSHIP, [
      object(T.MEMBERSHIP, membership, {
        refs: { person, organization: null, onBehalfOf: null },
      }),
    ]);
    await mirror.linkReferences(systemId);
    await mirror.markListed(runId, T.BODY, [BASE]);
    await mirror.markListed(runId, T.MEMBERSHIP, [membership]);

    const counts = await mirror.countUnlisted(systemId, runId);

    expect(counts.find((c) => c.type === T.PERSON)).toMatchObject({
      removed: 1,
    });
    expect(counts.find((c) => c.type === T.MEMBERSHIP)).toEqual({
      type: T.MEMBERSHIP,
      total: 1,
      removed: 1,
    });
  });
});
