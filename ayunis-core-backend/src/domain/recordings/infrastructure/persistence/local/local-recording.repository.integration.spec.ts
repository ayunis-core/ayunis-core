import { randomUUID, type UUID } from 'crypto';
import {
  DataSource,
  EntitySchema,
  type EntityManager,
  type QueryRunner,
} from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { CreateRecordingsAndRecordingPermissions1794434967773 } from 'src/db/migrations/1794434967773-CreateRecordingsAndRecordingPermissions';
import { GrantRecordingPermissions1794434967774 } from 'src/db/migrations/1794434967774-GrantRecordingPermissions';
import { AddRecordingAudioAndTranscriptSegments1794440444209 } from 'src/db/migrations/1794440444209-AddRecordingAudioAndTranscriptSegments';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { LocalRecordingRepository } from './local-recording.repository';
import { RecordingMapper } from './mappers/recording.mapper';
import { RecordingRecord } from './schema/recording.record';

// ts-jest drops the column types of some records, so the queried tables are
// declared explicitly against the migrated schema.
const recordingSchema = new EntitySchema<RecordingRecord>({
  name: 'RecordingRecord',
  target: RecordingRecord,
  tableName: 'recordings',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    name: { type: String },
    orgId: { type: String },
    userId: { type: String, nullable: true },
    workspaceId: { type: String, nullable: true },
    teamId: { type: String, nullable: true },
    isOrgOwned: { type: Boolean },
    createdByUserId: { type: String, nullable: true },
  },
  relations: {
    workspace: {
      type: 'many-to-one',
      target: 'WorkspaceRecord',
      joinColumn: { name: 'workspaceId' },
    },
  },
});
const sourceSchema = new EntitySchema<SourceRecord>({
  name: 'SourceRecord',
  target: SourceRecord,
  tableName: 'sources',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    status: { type: String },
    storageKey: { type: String, nullable: true },
    processingErrorCode: { type: String, nullable: true },
    recordingId: { type: String, nullable: true },
  },
});
const workspaceSchema = new EntitySchema<{ id: string; userId: string }>({
  name: 'WorkspaceRecord',
  target: WorkspaceRecord,
  tableName: 'workspaces',
  columns: {
    id: { type: String, primary: true },
    userId: { type: String },
  },
});

// The referenced tables and the role matrix as they were before the
// recordings migration, so the real migrations create the table, its owner
// rules and foreign keys, and grant the permissions.
const PRE_MIGRATION_TABLES = [
  `CREATE TABLE "orgs" ("id" varchar PRIMARY KEY)`,
  `CREATE TABLE "users" ("id" varchar PRIMARY KEY)`,
  `CREATE TABLE "teams" ("id" varchar PRIMARY KEY)`,
  `CREATE TABLE "workspaces" ("id" varchar PRIMARY KEY, "userId" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE)`,
  `CREATE TABLE "sources" ("id" varchar PRIMARY KEY, "name" varchar NOT NULL, "status" varchar NOT NULL, "storageKey" varchar, "processingErrorCode" varchar)`,
  `CREATE TYPE "source_upload_sessions_targettype_enum" AS ENUM('thread', 'skill', 'knowledge_base')`,
  `CREATE TABLE "source_upload_sessions" ("id" varchar PRIMARY KEY, "targetType" "source_upload_sessions_targettype_enum" NOT NULL)`,
  `CREATE TYPE "role_permissions_role_enum" AS ENUM('admin', 'manager', 'user')`,
  `CREATE TYPE "role_permissions_permission_enum" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_skills', 'share_skills_with_teams', 'share_skills_with_org', 'manage_knowledge_bases', 'share_knowledge_bases_with_teams', 'share_knowledge_bases_with_org', 'manage_routines')`,
  `CREATE TABLE "role_permissions" (
    "id" varchar PRIMARY KEY, "orgId" varchar NOT NULL,
    "role" "role_permissions_role_enum" NOT NULL,
    "permission" "role_permissions_permission_enum" NOT NULL,
    CONSTRAINT "UQ_baac37a9ae5a954455acd47b825" UNIQUE ("orgId", "role", "permission")
  )`,
];

/**
 * The generated migrations qualify the enum types with the public schema;
 * this keeps them inside the test schema.
 */
function inSchema(runner: QueryRunner, schema: string): QueryRunner {
  return new Proxy(runner, {
    get(target, property, receiver) {
      if (property !== 'query') return Reflect.get(target, property, receiver);
      return (sql: string, parameters?: unknown[]) =>
        target.query(sql.replaceAll('"public".', `"${schema}".`), parameters);
    },
  });
}

const RECORDING_PERMISSIONS = [
  'manage_org_recordings',
  'manage_recordings',
  'manage_team_recordings',
];

describe('Recording persistence', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let repository: LocalRecordingRepository;
  let schema: string;

  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const userId = randomUUID();
  const colleagueId = randomUUID();
  const ownTeamId = randomUUID();
  const otherTeamId = randomUUID();
  const ownWorkspaceId = randomUUID();
  const colleagueWorkspaceId = randomUUID();
  const ids: Record<string, UUID> = {};

  beforeAll(async () => {
    schema = `ayc1650_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [recordingSchema, workspaceSchema, sourceSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    await setup.query(`SET search_path TO "${schema}"`);
    for (const statement of PRE_MIGRATION_TABLES) await setup.query(statement);
    await setup.query(`INSERT INTO "orgs" ("id") VALUES ($1), ($2)`, [
      orgId,
      otherOrgId,
    ]);
    const migrating = inSchema(setup, schema);
    await new CreateRecordingsAndRecordingPermissions1794434967773().up(
      migrating,
    );
    await new GrantRecordingPermissions1794434967774().up(migrating);
    await new AddRecordingAudioAndTranscriptSegments1794440444209().up(
      migrating,
    );
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
    repository = new LocalRecordingRepository(
      db.getRepository(RecordingRecord),
      new RecordingMapper(),
      { tx: runner.manager } as never,
      db.getRepository(SourceRecord),
    );
    await seed(runner.manager);
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  async function seed(manager: EntityManager): Promise<void> {
    await manager.query(`INSERT INTO "users" ("id") VALUES ($1), ($2)`, [
      userId,
      colleagueId,
    ]);
    await manager.query(`INSERT INTO "teams" ("id") VALUES ($1), ($2)`, [
      ownTeamId,
      otherTeamId,
    ]);
    await manager.query(
      `INSERT INTO "workspaces" ("id", "userId") VALUES ($1, $2), ($3, $4)`,
      [ownWorkspaceId, userId, colleagueWorkspaceId, colleagueId],
    );

    await insert(manager, 'personal', { orgId, userId }, userId);
    await insert(manager, 'colleaguePersonal', { orgId, userId: colleagueId });
    await insert(manager, 'ownWorkspace', {
      orgId,
      workspaceId: ownWorkspaceId,
    });
    await insert(manager, 'colleagueWorkspace', {
      orgId,
      workspaceId: colleagueWorkspaceId,
    });
    await insert(manager, 'ownTeam', { orgId, teamId: ownTeamId }, userId);
    await insert(manager, 'otherTeam', { orgId, teamId: otherTeamId });
    await insert(manager, 'org', { orgId, isOrgOwned: true }, userId);
    await insert(manager, 'otherOrg', {
      orgId: otherOrgId,
      isOrgOwned: true,
    });
  }

  async function insert(
    manager: EntityManager,
    key: string,
    owner: {
      orgId: UUID;
      userId?: UUID;
      workspaceId?: UUID;
      teamId?: UUID;
      isOrgOwned?: boolean;
    },
    createdByUserId: UUID = colleagueId,
  ): Promise<void> {
    const id = randomUUID();
    ids[key] = id;
    await manager.query(
      `INSERT INTO "recordings" ("id", "name", "orgId", "userId", "workspaceId", "teamId", "isOrgOwned", "createdByUserId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        key,
        owner.orgId,
        owner.userId ?? null,
        owner.workspaceId ?? null,
        owner.teamId ?? null,
        owner.isOrgOwned ?? false,
        createdByUserId,
      ],
    );
  }

  async function remainingNames(): Promise<string[]> {
    const rows: { name: string }[] = await runner.query(
      `SELECT "name" FROM "recordings" ORDER BY "name"`,
    );
    return rows.map(({ name }) => name);
  }

  async function insertSource(manager: EntityManager): Promise<UUID> {
    const id = randomUUID();
    await manager.query(
      `INSERT INTO "sources" ("id", "name", "status", "storageKey") VALUES ($1, 'sitzung.mp3', 'processing', $2)`,
      [id, `${orgId}/uploads/${id}/sitzung.mp3`],
    );
    return id;
  }

  async function countRows(table: string, sourceId: UUID): Promise<number> {
    const column = table === 'sources' ? 'id' : 'sourceId';
    const rows: { count: string }[] = await runner.query(
      `SELECT COUNT(*) AS "count" FROM "${table}" WHERE "${column}" = $1`,
      [sourceId],
    );
    return Number(rows[0].count);
  }

  const names = (items: { name: string }[]) =>
    items.map(({ name }) => name).sort((a, b) => a.localeCompare(b));

  it('lists the own, own-team and own-organization recordings, never those of another organization', async () => {
    await expect(
      repository
        .findAllReadable(userId, { orgId, teamIds: [ownTeamId] })
        .then(names),
    ).resolves.toEqual(['org', 'ownTeam', 'personal']);
  });

  it('lists no personal recording of the user under another organization', async () => {
    await expect(
      repository
        .findAllReadable(userId, { orgId: otherOrgId, teamIds: [] })
        .then(names),
    ).resolves.toEqual(['otherOrg']);
  });

  it('rejects a recording without exactly one owner', async () => {
    await expect(insert(runner.manager, 'noOwner', { orgId })).rejects.toThrow(
      /CHK_recordings_single_owner/,
    );
  });

  it('deleting a user deletes their personal and workspace recordings and keeps the team and organization ones they created', async () => {
    await expect(
      repository.findAllDeletedWithUser(userId).then(names),
    ).resolves.toEqual(['ownWorkspace', 'personal']);

    await runner.query(`DELETE FROM "users" WHERE "id" = $1`, [userId]);

    expect(await remainingNames()).toEqual([
      'colleaguePersonal',
      'colleagueWorkspace',
      'org',
      'otherOrg',
      'otherTeam',
      'ownTeam',
    ]);
    const kept: { name: string; createdByUserId: string | null }[] =
      await runner.query(
        `SELECT "name", "createdByUserId" FROM "recordings" WHERE "name" IN ('org', 'ownTeam') ORDER BY "name"`,
      );
    expect(kept).toEqual([
      { name: 'org', createdByUserId: null },
      { name: 'ownTeam', createdByUserId: null },
    ]);
  });

  it('deleting a team or workspace deletes its recordings', async () => {
    await expect(
      repository.findAllByTeamId(ownTeamId).then(names),
    ).resolves.toEqual(['ownTeam']);
    await expect(
      repository.findAllByWorkspaceId(ownWorkspaceId).then(names),
    ).resolves.toEqual(['ownWorkspace']);

    await runner.query(`DELETE FROM "teams" WHERE "id" = $1`, [ownTeamId]);
    await runner.query(`DELETE FROM "workspaces" WHERE "id" = $1`, [
      ownWorkspaceId,
    ]);

    expect(await remainingNames()).toEqual([
      'colleaguePersonal',
      'colleagueWorkspace',
      'org',
      'otherOrg',
      'otherTeam',
      'personal',
    ]);
  });

  it('deleting an organization deletes its recordings', async () => {
    await expect(
      repository.findAllByOrgId(otherOrgId).then(names),
    ).resolves.toEqual(['otherOrg']);

    await runner.query(`DELETE FROM "orgs" WHERE "id" = $1`, [otherOrgId]);

    expect(await remainingNames()).not.toContain('otherOrg');
  });

  it('keeps one audio file per recording: another source cannot become its audio', async () => {
    const first = await insertSource(runner.manager);
    const second = await insertSource(runner.manager);

    await expect(repository.attachAudio(ids.personal, first)).resolves.toBe(
      true,
    );
    await expect(repository.attachAudio(ids.personal, second)).resolves.toBe(
      false,
    );

    const audio = await repository.findAudio([ids.personal, ids.ownTeam]);
    expect([...audio.keys()]).toEqual([ids.personal]);
    expect(audio.get(ids.personal)).toMatchObject({
      sourceId: first,
      fileName: 'sitzung.mp3',
      storageKey: `${orgId}/uploads/${first}/sitzung.mp3`,
    });
  });

  it('deleting a recording, or the team owning it, deletes its audio with the transcript segments', async () => {
    const personalAudio = await insertSource(runner.manager);
    const teamAudio = await insertSource(runner.manager);
    await repository.attachAudio(ids.personal, personalAudio);
    await repository.attachAudio(ids.ownTeam, teamAudio);
    for (const sourceId of [personalAudio, teamAudio]) {
      await runner.query(
        `INSERT INTO "source_transcript_segments" ("id", "sourceId", "position", "startSeconds", "endSeconds", "speaker", "text") VALUES ($1, $2, 0, 0.5, 2, 'speaker_0', 'Wir beginnen.')`,
        [randomUUID(), sourceId],
      );
    }

    const personal = await repository.findById(ids.personal);
    await repository.delete(personal!);
    await runner.query(`DELETE FROM "teams" WHERE "id" = $1`, [ownTeamId]);

    for (const sourceId of [personalAudio, teamAudio]) {
      expect(await countRows('sources', sourceId)).toBe(0);
      expect(await countRows('source_transcript_segments', sourceId)).toBe(0);
    }
  });

  it('grants the recording permissions to managers and users of existing organizations', async () => {
    const rows: { orgId: string; role: string; permission: string }[] =
      await runner.query(
        `SELECT "orgId", "role", "permission" FROM "role_permissions" WHERE "permission"::text LIKE '%recordings' ORDER BY "permission"::text`,
      );
    const granted = (org: string, role: string) =>
      rows
        .filter((row) => row.orgId === org && row.role === role)
        .map(({ permission }) => permission);

    for (const org of [orgId, otherOrgId]) {
      expect(granted(org, 'manager')).toEqual(RECORDING_PERMISSIONS);
      expect(granted(org, 'user')).toEqual(RECORDING_PERMISSIONS);
      expect(granted(org, 'admin')).toEqual([]);
    }
  });
});
