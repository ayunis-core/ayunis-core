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
import { AddTeamAndOrgKnowledgeBaseOwnership1793979275771 } from 'src/db/migrations/1793979275771-AddTeamAndOrgKnowledgeBaseOwnership';
import type { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import {
  KnowledgeBaseShareRecord,
  SkillShareRecord,
} from 'src/domain/shares/infrastructure/postgres/schema/share.record';
import { ShareScopeRecord } from 'src/domain/shares/infrastructure/postgres/schema/share-scope.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { LocalKnowledgeBaseRepository } from './local-knowledge-base.repository';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import { KnowledgeBaseActivationRecord } from './schema/knowledge-base-activation.record';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';

// ts-jest drops the column types of some records, so the queried tables are
// declared explicitly against the migrated schema.
const knowledgeBaseSchema = new EntitySchema<KnowledgeBaseRecord>({
  name: 'KnowledgeBaseRecord',
  target: KnowledgeBaseRecord,
  tableName: 'knowledge_bases',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    name: { type: String },
    description: { type: String },
    orgId: { type: String },
    userId: { type: String, nullable: true },
    workspaceId: { type: String, nullable: true },
    teamId: { type: String, nullable: true },
    isOrgOwned: { type: Boolean },
    isActive: { type: Boolean },
  },
});
const activationSchema = new EntitySchema<KnowledgeBaseActivationRecord>({
  name: 'KnowledgeBaseActivationRecord',
  target: KnowledgeBaseActivationRecord,
  tableName: 'knowledge_base_activations',
  columns: {
    id: { type: 'uuid', primary: true },
    knowledgeBaseId: { type: String },
    userId: { type: String, nullable: true },
    workspaceId: { type: String, nullable: true },
  },
});
const shareScopeSchema = new EntitySchema({
  name: 'ShareScopeRecord',
  target: ShareScopeRecord,
  tableName: 'share_scopes',
  columns: {
    id: { type: String, primary: true },
    scope_type: { type: String },
    orgId: { type: String, nullable: true },
    teamId: { type: String, name: 'team_id', nullable: true },
  },
});
const shareColumns = {
  id: { type: String, primary: true },
  entity_type: { type: String },
} as const;
const shareScopeRelation = {
  scope: {
    type: 'many-to-one' as const,
    target: 'ShareScopeRecord',
    joinColumn: { name: 'scope_id' },
  },
};
interface ShareRow {
  id: string;
  entity_type: string;
  scope: unknown;
}
const knowledgeBaseShareSchema = new EntitySchema<
  ShareRow & { knowledgeBaseId: string }
>({
  name: 'KnowledgeBaseShareRecord',
  target: KnowledgeBaseShareRecord,
  tableName: 'shares',
  columns: {
    ...shareColumns,
    knowledgeBaseId: { type: String, name: 'knowledge_base_id' },
  },
  relations: shareScopeRelation,
});
const skillShareSchema = new EntitySchema<ShareRow & { skillId: string }>({
  name: 'SkillShareRecord',
  target: SkillShareRecord,
  tableName: 'shares',
  columns: { ...shareColumns, skillId: { type: String, name: 'skill_id' } },
  relations: shareScopeRelation,
});
const skillSchema = new EntitySchema<{
  id: string;
  userId: string | null;
  knowledgeBases: unknown[];
}>({
  name: 'SkillRecord',
  target: SkillRecord,
  tableName: 'skills',
  columns: {
    id: { type: String, primary: true },
    userId: { type: String, nullable: true },
  },
  relations: {
    knowledgeBases: {
      type: 'many-to-many',
      target: 'KnowledgeBaseRecord',
      joinTable: {
        name: 'skill_knowledge_bases',
        joinColumn: { name: 'skillsId' },
        inverseJoinColumn: { name: 'knowledgeBasesId' },
      },
    },
  },
});
const teamMemberSchema = new EntitySchema({
  name: 'TeamMemberRecord',
  target: TeamMemberRecord,
  tableName: 'team_members',
  columns: {
    id: { type: String, primary: true },
    teamId: { type: String, name: 'team_id' },
    userId: { type: String, name: 'user_id' },
  },
});

// The queried tables as they were before the ownership migration, so the
// real migration adds the owner columns and the single-owner check.
const PRE_MIGRATION_TABLES = [
  `CREATE TABLE "teams" ("id" varchar PRIMARY KEY, "name" varchar NOT NULL, "org_id" varchar NOT NULL)`,
  `CREATE TABLE "team_members" ("id" varchar PRIMARY KEY, "team_id" varchar NOT NULL, "user_id" varchar NOT NULL)`,
  `CREATE TABLE "knowledge_bases" (
    "id" varchar PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(), "name" varchar NOT NULL,
    "description" varchar, "orgId" varchar NOT NULL, "userId" varchar,
    "workspaceId" varchar,
    CONSTRAINT "CHK_knowledge_bases_exactly_one_owner" CHECK ((("userId" IS NOT NULL) AND ("workspaceId" IS NULL)) OR (("userId" IS NULL) AND ("workspaceId" IS NOT NULL)))
  )`,
  `CREATE TABLE "knowledge_base_activations" ("id" uuid PRIMARY KEY, "knowledgeBaseId" varchar NOT NULL, "userId" varchar, "workspaceId" varchar)`,
  `CREATE TABLE "share_scopes" ("id" varchar PRIMARY KEY, "scope_type" varchar NOT NULL, "orgId" varchar, "team_id" varchar)`,
  `CREATE TABLE "shares" ("id" varchar PRIMARY KEY, "owner_id" varchar NOT NULL, "entity_type" varchar NOT NULL, "scope_id" varchar, "skill_id" varchar, "knowledge_base_id" varchar)`,
  `CREATE TABLE "skills" ("id" varchar PRIMARY KEY, "userId" varchar)`,
  `CREATE TABLE "skill_knowledge_bases" ("skillsId" varchar NOT NULL, "knowledgeBasesId" varchar NOT NULL)`,
];

/**
 * Runs the access queries in an isolated schema, built from the
 * pre-migration tables plus the real migration, inside a transaction that is
 * rolled back, so the check constraint and the SQL itself are proven, not the
 * query-builder calls.
 */
describe('Knowledge-base access for team- and org-owned knowledge bases', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let repository: LocalKnowledgeBaseRepository;

  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const userId = randomUUID();
  const colleagueId = randomUUID();
  const ownTeamId = randomUUID();
  const otherTeamId = randomUUID();
  const scope = { userId, orgId, teamIds: [ownTeamId] };
  const ids: Record<string, UUID> = {};

  let schema: string;

  beforeAll(async () => {
    schema = `ayc1642_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [
        knowledgeBaseSchema,
        activationSchema,
        shareScopeSchema,
        knowledgeBaseShareSchema,
        skillShareSchema,
        skillSchema,
        teamMemberSchema,
      ],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const setup = db.createQueryRunner();
    await setup.createSchema(schema, true);
    await setup.query(`SET search_path TO "${schema}"`);
    for (const statement of PRE_MIGRATION_TABLES) await setup.query(statement);
    await new AddTeamAndOrgKnowledgeBaseOwnership1793979275771().up(setup);
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
    const manager = runner.manager;
    repository = new LocalKnowledgeBaseRepository(
      db.getRepository(KnowledgeBaseRecord),
      {} as never,
      db.getRepository(KnowledgeBaseActivationRecord),
      new KnowledgeBaseMapper(),
      {} as SourceMapper,
      { tx: manager } as never,
    );
    await seed(manager);
  });

  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });

  async function seed(manager: EntityManager): Promise<void> {
    for (const [id, teamOrgId] of [
      [ownTeamId, orgId],
      [otherTeamId, orgId],
    ]) {
      await manager.query(
        `INSERT INTO "teams" ("id", "name", "org_id") VALUES ($1, $2, $3)`,
        [id, `Team ${id.slice(0, 8)}`, teamOrgId],
      );
    }
    await manager.query(
      `INSERT INTO "team_members" ("id", "team_id", "user_id") VALUES ($1, $2, $3)`,
      [randomUUID(), ownTeamId, userId],
    );

    await insert(manager, 'personalActive', { userId, orgId }, true);
    await insert(manager, 'personalInactive', { userId, orgId });
    await insert(manager, 'colleagueActive', { userId: colleagueId, orgId });
    await activate(manager, ids.colleagueActive, colleagueId);
    await insert(manager, 'teamActive', {
      teamId: ownTeamId,
      orgId,
      isActive: true,
    });
    await insert(manager, 'teamInactive', { teamId: ownTeamId, orgId });
    await insert(manager, 'otherTeamActive', {
      teamId: otherTeamId,
      orgId,
      isActive: true,
    });
    await insert(manager, 'orgActive', {
      isOrgOwned: true,
      orgId,
      isActive: true,
    });
    await insert(manager, 'orgInactive', { isOrgOwned: true, orgId });
    await insert(manager, 'otherOrgActive', {
      isOrgOwned: true,
      orgId: otherOrgId,
      isActive: true,
    });
  }

  async function insert(
    manager: EntityManager,
    key: string,
    owner: {
      orgId: UUID;
      userId?: UUID;
      teamId?: UUID;
      isOrgOwned?: boolean;
      isActive?: boolean;
    },
    activeForOwner = false,
  ): Promise<void> {
    const id = randomUUID();
    ids[key] = id;
    await manager.query(
      `INSERT INTO "knowledge_bases" ("id", "name", "orgId", "userId", "teamId", "isOrgOwned", "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        key,
        owner.orgId,
        owner.userId ?? null,
        owner.teamId ?? null,
        owner.isOrgOwned ?? false,
        owner.isActive ?? false,
      ],
    );
    if (activeForOwner && owner.userId) {
      await activate(manager, id, owner.userId);
    }
  }

  async function activate(
    manager: EntityManager,
    knowledgeBaseId: UUID,
    activeUserId: UUID,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO "knowledge_base_activations" ("id", "knowledgeBaseId", "userId") VALUES ($1, $2, $3)`,
      [randomUUID(), knowledgeBaseId, activeUserId],
    );
  }

  const names = (items: { name: string }[]) =>
    items
      .map(({ name }) => name)
      .sort((left, right) => left.localeCompare(right));

  it('resolves active personal, own-team and own-org knowledge bases only', async () => {
    await expect(
      repository.findActiveAccessible(scope).then(names),
    ).resolves.toEqual(['orgActive', 'personalActive', 'teamActive']);
  });

  it('narrows the active set to a requested knowledge base', async () => {
    await expect(
      repository
        .findActiveAccessible(scope, { knowledgeBaseId: ids.teamActive })
        .then(names),
    ).resolves.toEqual(['teamActive']);
    await expect(
      repository.findActiveAccessible(scope, {
        knowledgeBaseId: ids.otherTeamActive,
      }),
    ).resolves.toEqual([]);
  });

  it('finds readable knowledge bases by id regardless of activation', async () => {
    await expect(
      repository.findAccessibleByIds(Object.values(ids), scope).then(names),
    ).resolves.toEqual([
      'orgActive',
      'orgInactive',
      'personalActive',
      'personalInactive',
      'teamActive',
      'teamInactive',
    ]);
  });

  it('keeps other organizations out of the paginated list', async () => {
    const page = await repository.findPaginatedAccessible(
      userId,
      undefined,
      [],
      { limit: 50, offset: 0 },
      { orgId, teamIds: [ownTeamId] },
    );

    expect(names(page.data)).toEqual([
      'orgActive',
      'orgInactive',
      'personalActive',
      'personalInactive',
      'teamActive',
      'teamInactive',
    ]);
    expect(page.total).toBe(6);
  });

  it('lists collective knowledge bases of the readable owners and of one team', async () => {
    await expect(
      repository.findAllCollective({ orgId, teamIds: [ownTeamId] }).then(names),
    ).resolves.toEqual([
      'orgActive',
      'orgInactive',
      'teamActive',
      'teamInactive',
    ]);
    await expect(
      repository.findAllByTeamId(ownTeamId).then(names),
    ).resolves.toEqual(['teamActive', 'teamInactive']);
  });

  it('ignores org shares left on a knowledge base another team owns', async () => {
    await shareWithOrg(runner.manager, ids.otherTeamActive, colleagueId);
    await shareWithOrg(runner.manager, ids.colleagueActive, colleagueId);
    const sharedIds = [ids.otherTeamActive, ids.colleagueActive];

    await expect(
      repository.findAccessibleByIds(sharedIds, scope).then(names),
    ).resolves.toEqual(['colleagueActive']);
    await expect(
      repository.findActiveAccessible(scope).then(names),
    ).resolves.not.toContain('otherTeamActive');
    const page = await repository.findPaginatedAccessible(
      userId,
      undefined,
      sharedIds,
      { limit: 50, offset: 0 },
      { orgId, teamIds: [ownTeamId] },
    );
    expect(names(page.data)).toContain('colleagueActive');
    expect(names(page.data)).not.toContain('otherTeamActive');
    await expect(
      repository.findByIds(sharedIds, { orgId, workspaceId: null }).then(names),
    ).resolves.toEqual(['colleagueActive']);
  });

  async function shareWithOrg(
    manager: EntityManager,
    knowledgeBaseId: UUID,
    ownerId: UUID,
  ): Promise<void> {
    const scopeId = randomUUID();
    await manager.query(
      `INSERT INTO "share_scopes" ("id", "scope_type", "orgId") VALUES ($1, 'org', $2)`,
      [scopeId, orgId],
    );
    await manager.query(
      `INSERT INTO "shares" ("id", "owner_id", "entity_type", "scope_id", "knowledge_base_id") VALUES ($1, $2, 'knowledge_base', $3, $4)`,
      [randomUUID(), ownerId, scopeId, knowledgeBaseId],
    );
  }

  it.each([
    ['no owner', { isOrgOwned: false }],
    ['team and organization', { teamId: 'own-team', isOrgOwned: true }],
  ])('rejects a knowledge base with %s in the database', async (_, owner) => {
    await expect(
      runner.manager.query(
        `INSERT INTO "knowledge_bases" ("id", "name", "orgId", "teamId", "isOrgOwned") VALUES ($1, 'Invalid', $2, $3, $4)`,
        [
          randomUUID(),
          orgId,
          'teamId' in owner ? ownTeamId : null,
          owner.isOrgOwned,
        ],
      ),
    ).rejects.toThrow('CHK_knowledge_bases_single_owner');
  });
});
