import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema, type QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateOparlMirrorTables1795478677149 } from 'src/db/migrations/1795478677149-CreateOparlMirrorTables';
import { CreateOparlBodyLinksTable1795492937316 } from 'src/db/migrations/1795492937316-CreateOparlBodyLinksTable';
import { OparlBodyLink } from 'src/domain/oparl/domain/oparl-body-link.entity';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { PostgresOparlBodyLinksRepository } from './postgres-oparl-body-links.repository';
import { OparlBodyLinkRecord } from './schema/oparl-body-link.record';
import { OparlBodyRecord } from './schema/oparl-body.record';

// ts-jest drops the column types of the records, so the tables the
// repository maps are declared explicitly; the real migrations create them.
const orgSchema = new EntitySchema<OrgRecord>({
  name: 'OrgRecord',
  target: OrgRecord,
  tableName: 'orgs',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
  },
});
const bodySchema = new EntitySchema<OparlBodyRecord>({
  name: 'OparlBodyRecord',
  target: OparlBodyRecord,
  tableName: 'oparl_bodies',
  columns: { id: { type: String, primary: true } },
});
const linkSchema = new EntitySchema<OparlBodyLinkRecord>({
  name: 'OparlBodyLinkRecord',
  target: OparlBodyLinkRecord,
  tableName: 'oparl_body_links',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    orgId: { type: String },
    bodyId: { type: String },
    linkedByUserId: { type: String, nullable: true },
  },
  relations: {
    org: {
      type: 'many-to-one',
      target: 'OrgRecord',
      joinColumn: { name: 'orgId' },
      onDelete: 'CASCADE',
    },
    body: {
      type: 'many-to-one',
      target: 'OparlBodyRecord',
      joinColumn: { name: 'bodyId' },
      onDelete: 'CASCADE',
    },
  },
});

describe('PostgresOparlBodyLinksRepository', () => {
  const schema = `ayc2060_links_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let links: PostgresOparlBodyLinksRepository;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      entities: [orgSchema, bodySchema, linkSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    // The link table references orgs and users; only their keys matter here.
    await setup.query(
      `CREATE TABLE "orgs" ("id" character varying PRIMARY KEY, "name" character varying NOT NULL)`,
    );
    await setup.query(
      `CREATE TABLE "users" ("id" character varying PRIMARY KEY)`,
    );
    // The migrations name their enum types in "public"; keep them in the schema.
    const runner = {
      query: (sql: string) =>
        setup.query(sql.replaceAll('"public".', `"${schema}".`)),
    } as QueryRunner;
    await new CreateOparlMirrorTables1795478677149().up(runner);
    await new CreateOparlBodyLinksTable1795492937316().up(runner);
    await setup.release();
    links = new PostgresOparlBodyLinksRepository(
      db.getRepository(OparlBodyLinkRecord),
      { tx: undefined } as never,
    );
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  async function anOrg(name: string): Promise<{ orgId: UUID; userId: UUID }> {
    const orgId = randomUUID();
    const userId = randomUUID();
    await db.query(`INSERT INTO "orgs" ("id", "name") VALUES ($1, $2)`, [
      orgId,
      name,
    ]);
    await db.query(`INSERT INTO "users" ("id") VALUES ($1)`, [userId]);
    return { orgId, userId };
  }

  async function aBody(name: string): Promise<UUID> {
    const systemId = randomUUID();
    const bodyId = randomUUID();
    const url = `https://ris.example.de/${systemId}/oparl/system`;
    await db.query(
      `INSERT INTO "oparl_systems" ("id", "url", "oparlId", "name", "raw", "nextSyncAt")
       VALUES ($1, $2, $2, 'SD.NET RIM', '{}', now())`,
      [systemId, url],
    );
    await db.query(
      `INSERT INTO "oparl_bodies" ("id", "systemId", "oparlId", "name", "raw")
       VALUES ($1, $2, $3, $4, '{}')`,
      [bodyId, systemId, `${url}/body/1`, name],
    );
    return bodyId;
  }

  const link = (
    { orgId, userId }: { orgId: UUID; userId: UUID },
    ...bodyIds: UUID[]
  ) =>
    links.link(
      bodyIds.map(
        (bodyId) =>
          new OparlBodyLink({ orgId, bodyId, linkedByUserId: userId }),
      ),
    );

  const bodyExists = async (bodyId: UUID) =>
    (
      await db.query<unknown[]>(
        `SELECT 1 FROM "oparl_bodies" WHERE "id" = $1`,
        [bodyId],
      )
    ).length === 1;

  it('shows each org only its own links in the catalog', async () => {
    const aarbergen = await anOrg('Gemeinde Aarbergen');
    const krefeld = await anOrg('Stadt Krefeld');
    const body = await aBody('Gemeinde Aarbergen');

    expect(await link(aarbergen, body)).toBe(true);

    const own = await links.findCatalog(aarbergen.orgId);
    const other = await links.findCatalog(krefeld.orgId);
    expect(own.find(({ id }) => id === body)?.linkedAt).toBeInstanceOf(Date);
    expect(other.find(({ id }) => id === body)).toMatchObject({
      name: 'Gemeinde Aarbergen',
      systemName: 'SD.NET RIM',
      linkedAt: null,
    });
    expect(
      (await links.findLinked(aarbergen.orgId)).map(({ id }) => id),
    ).toEqual([body]);
    expect(await links.findLinked(krefeld.orgId)).toEqual([]);
  });

  it('keeps one link, with its first date, when a linked body is linked again', async () => {
    const org = await anOrg('Gemeinde Aarbergen');
    const body = await aBody('Gemeinde Aarbergen');
    await link(org, body);
    const [first] = await links.findLinked(org.orgId);

    expect(await link(org, body)).toBe(true);

    expect(await links.findLinked(org.orgId)).toEqual([first]);
  });

  it('links nothing when one of the bodies is not in the catalog', async () => {
    const org = await anOrg('Gemeinde Aarbergen');
    const body = await aBody('Gemeinde Aarbergen');

    expect(await link(org, body, randomUUID())).toBe(false);

    expect(await links.findLinked(org.orgId)).toEqual([]);
  });

  it('does not let another org remove a link', async () => {
    const aarbergen = await anOrg('Gemeinde Aarbergen');
    const krefeld = await anOrg('Stadt Krefeld');
    const body = await aBody('Gemeinde Aarbergen');
    await link(aarbergen, body);

    expect(await links.unlink(krefeld.orgId, body)).toBe(false);

    expect(
      (await links.findLinked(aarbergen.orgId)).map(({ id }) => id),
    ).toEqual([body]);
  });

  it('removes only the link on unlinking, never the mirrored body', async () => {
    const org = await anOrg('Gemeinde Aarbergen');
    const body = await aBody('Gemeinde Aarbergen');
    await link(org, body);

    expect(await links.unlink(org.orgId, body)).toBe(true);

    expect(await links.findLinked(org.orgId)).toEqual([]);
    expect(await bodyExists(body)).toBe(true);
    expect(await links.unlink(org.orgId, body)).toBe(false);
  });

  it('removes the links of a deleted org and nothing else', async () => {
    const aarbergen = await anOrg('Gemeinde Aarbergen');
    const krefeld = await anOrg('Stadt Krefeld');
    const body = await aBody('Gemeinde Aarbergen');
    await link(aarbergen, body);
    await link(krefeld, body);

    await db.query(`DELETE FROM "orgs" WHERE "id" = $1`, [aarbergen.orgId]);

    expect(await links.findLinked(aarbergen.orgId)).toEqual([]);
    expect((await links.findLinked(krefeld.orgId)).map(({ id }) => id)).toEqual(
      [body],
    );
    expect(await bodyExists(body)).toBe(true);
  });

  it('lists per body the orgs that linked it', async () => {
    const aarbergen = await anOrg('Gemeinde Aarbergen');
    const krefeld = await anOrg('Stadt Krefeld');
    const shared = await aBody('Verbandsgemeinde Montabaur');
    const unlinked = await aBody('Ortsgemeinde Heiligenroth');
    await link(krefeld, shared);
    await link(aarbergen, shared);

    const orgs = await links.findLinkingOrgs([shared, unlinked]);

    expect(orgs.get(shared)?.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: aarbergen.orgId, name: 'Gemeinde Aarbergen' },
      { id: krefeld.orgId, name: 'Stadt Krefeld' },
    ]);
    expect(orgs.get(unlinked)).toBeUndefined();
  });
});
