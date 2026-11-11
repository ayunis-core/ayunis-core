import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { RemoveSkillAndKnowledgeBaseShares1794375354198 } from 'src/db/migrations/1794375354198-RemoveSkillAndKnowledgeBaseShares';

const TABLES = [
  `CREATE TABLE orgs (id varchar PRIMARY KEY)`,
  `CREATE TABLE teams (id varchar PRIMARY KEY)`,
  `CREATE TABLE skills (id varchar PRIMARY KEY, "userId" varchar, "teamId" varchar)`,
  `CREATE TABLE knowledge_bases (id varchar PRIMARY KEY, "userId" varchar, "teamId" varchar)`,
  `CREATE TABLE skill_knowledge_bases ("skillsId" varchar NOT NULL, "knowledgeBasesId" varchar NOT NULL)`,
  `CREATE TABLE skill_activations (id varchar PRIMARY KEY, "skillId" varchar NOT NULL, "userId" varchar, "workspaceId" varchar)`,
  `CREATE TABLE knowledge_base_activations (id varchar PRIMARY KEY, "knowledgeBaseId" varchar NOT NULL, "userId" varchar, "workspaceId" varchar)`,
  `CREATE TABLE threads (id varchar PRIMARY KEY, "userId" varchar NOT NULL)`,
  `CREATE TABLE thread_source_assignments (id varchar PRIMARY KEY, "threadId" varchar NOT NULL, "sourceId" varchar NOT NULL, "originSkillId" uuid)`,
  `CREATE TABLE thread_knowledge_base_assignments (id varchar PRIMARY KEY, "threadId" varchar NOT NULL, "knowledgeBaseId" varchar NOT NULL, "originSkillId" uuid)`,
  `CREATE TYPE share_scopes_scope_type_enum AS ENUM ('org', 'team')`,
  `CREATE TABLE share_scopes (id varchar PRIMARY KEY, scope_type share_scopes_scope_type_enum NOT NULL, "orgId" varchar, team_id varchar)`,
  `CREATE TABLE shares (id varchar PRIMARY KEY, owner_id varchar NOT NULL, entity_type varchar NOT NULL, scope_id varchar REFERENCES share_scopes(id), skill_id varchar, knowledge_base_id varchar)`,
];

const owner = randomUUID();
const teamRecipient = randomUUID();
const orgRecipient = randomUUID();
const teamId = randomUUID();
const orgSkill = randomUUID();
const teamSharedSkill = randomUUID();
const recipientSkill = randomUUID();
const teamOwnedSkill = randomUUID();
const sharedKnowledgeBase = randomUUID();
const skillKnowledgeBase = randomUUID();
const teamOwnedKnowledgeBase = randomUUID();
const ownerThread = randomUUID();
const teamRecipientThread = randomUUID();
const orgRecipientThread = randomUUID();

/**
 * The owner shared one skill with the organization, another skill and a
 * knowledge base with a team. Each row id says whether the migration must
 * keep or delete it.
 */
async function seedShares(runner: QueryRunner): Promise<void> {
  await runner.query(
    `INSERT INTO skills VALUES ($1, $5, NULL), ($2, $5, NULL), ($3, $6, NULL), ($4, NULL, $7)`,
    [
      orgSkill,
      teamSharedSkill,
      recipientSkill,
      teamOwnedSkill,
      owner,
      teamRecipient,
      teamId,
    ],
  );
  await runner.query(
    `INSERT INTO knowledge_bases VALUES ($1, $4, NULL), ($2, $4, NULL), ($3, NULL, $5)`,
    [
      sharedKnowledgeBase,
      skillKnowledgeBase,
      teamOwnedKnowledgeBase,
      owner,
      teamId,
    ],
  );
  await runner.query(
    `INSERT INTO skill_knowledge_bases VALUES ($1, $2), ($3, $4), ($5, $6)`,
    [
      orgSkill,
      skillKnowledgeBase,
      recipientSkill,
      sharedKnowledgeBase,
      teamOwnedSkill,
      teamOwnedKnowledgeBase,
    ],
  );
  await runner.query(
    `INSERT INTO skill_activations (id, "skillId", "userId") VALUES
      ('keep-owner', $1, $4), ('delete-org-recipient', $1, $5),
      ('delete-team-recipient-pin', $2, $6), ('keep-recipient-own', $3, $6)`,
    [
      orgSkill,
      teamSharedSkill,
      recipientSkill,
      owner,
      orgRecipient,
      teamRecipient,
    ],
  );
  await runner.query(
    `INSERT INTO skill_activations (id, "skillId", "workspaceId") VALUES ('keep-workspace', $1, $2)`,
    [orgSkill, randomUUID()],
  );
  await runner.query(
    `INSERT INTO knowledge_base_activations (id, "knowledgeBaseId", "userId") VALUES
      ('keep-owner', $1, $3), ('delete-team-recipient', $1, $4),
      ('delete-org-recipient', $2, $5)`,
    [
      sharedKnowledgeBase,
      skillKnowledgeBase,
      owner,
      teamRecipient,
      orgRecipient,
    ],
  );
  await runner.query(
    `INSERT INTO threads VALUES ($1, $2), ($3, $4), ($5, $6)`,
    [
      ownerThread,
      owner,
      teamRecipientThread,
      teamRecipient,
      orgRecipientThread,
      orgRecipient,
    ],
  );
  await runner.query(
    `INSERT INTO thread_source_assignments VALUES
      ('keep-owner', $1, 'source-1', $4),
      ('delete-org-recipient', $3, 'source-1', $4),
      ('delete-team-recipient', $2, 'source-2', $5),
      ('keep-direct', $2, 'source-3', NULL),
      ('keep-recipient-own', $2, 'source-4', $6),
      ('keep-team-owned', $2, 'source-5', $7)`,
    [
      ownerThread,
      teamRecipientThread,
      orgRecipientThread,
      orgSkill,
      teamSharedSkill,
      recipientSkill,
      teamOwnedSkill,
    ],
  );
  await runner.query(
    `INSERT INTO thread_knowledge_base_assignments VALUES
      ('keep-owner-direct', $1, $4, NULL),
      ('keep-owner-via-skill', $1, $5, $7),
      ('delete-direct', $2, $4, NULL),
      ('delete-via-shared-skill', $3, $5, $7),
      ('delete-via-recipient-skill', $2, $4, $8),
      ('keep-team-owned', $2, $6, $9)`,
    [
      ownerThread,
      teamRecipientThread,
      orgRecipientThread,
      sharedKnowledgeBase,
      skillKnowledgeBase,
      teamOwnedKnowledgeBase,
      orgSkill,
      recipientSkill,
      teamOwnedSkill,
    ],
  );
  await runner.query(
    `INSERT INTO share_scopes VALUES ('org-scope', 'org', 'org-1', NULL), ('team-scope', 'team', NULL, $1)`,
    [teamId],
  );
  await runner.query(
    `INSERT INTO shares VALUES
      ('org-skill', $4, 'skill', 'org-scope', $1, NULL),
      ('team-skill', $4, 'skill', 'team-scope', $2, NULL),
      ('team-kb', $4, 'knowledge_base', 'team-scope', NULL, $3)`,
    [orgSkill, teamSharedSkill, sharedKnowledgeBase, owner],
  );
}

describe('RemoveSkillAndKnowledgeBaseShares migration', () => {
  let db: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new RemoveSkillAndKnowledgeBaseShares1794375354198();

  beforeAll(async () => {
    db = new DataSource({
      ...typeormConfigRaw,
      entities: [],
      migrations: [],
      migrationsRun: false,
      synchronize: false,
      logging: false,
    });
    await db.initialize();
  }, 30_000);

  beforeEach(async () => {
    schema = `ayc1643_${randomUUID().replaceAll('-', '')}`;
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.createSchema(schema, true);
    await runner.query(`SET search_path TO "${schema}"`);
    for (const statement of TABLES) await runner.query(statement);
  }, 30_000);

  afterEach(async () => {
    await runner.query('SET search_path TO public');
    await runner.dropSchema(schema, true, true);
    await runner.release();
  }, 30_000);

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  async function ids(table: string): Promise<string[]> {
    const rows: { id: string }[] = await runner.query(
      `SELECT id FROM ${table} ORDER BY id`,
    );
    return rows.map(({ id }) => id);
  }

  async function shareTables(): Promise<string[]> {
    const rows: { table_name: string }[] = await runner.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_name IN ('shares', 'share_scopes')
       ORDER BY table_name`,
      [schema],
    );
    return rows.map(({ table_name }) => table_name);
  }

  it("removes what recipients gained through shares and keeps owners', workspace and team state", async () => {
    await seedShares(runner);

    await migration.up(runner);

    expect(await ids('skill_activations')).toEqual([
      'keep-owner',
      'keep-recipient-own',
      'keep-workspace',
    ]);
    expect(await ids('knowledge_base_activations')).toEqual(['keep-owner']);
    expect(await ids('thread_source_assignments')).toEqual([
      'keep-direct',
      'keep-owner',
      'keep-recipient-own',
      'keep-team-owned',
    ]);
    expect(await ids('thread_knowledge_base_assignments')).toEqual([
      'keep-owner-direct',
      'keep-owner-via-skill',
      'keep-team-owned',
    ]);
    expect(
      await runner.query(
        `SELECT "skillsId", "knowledgeBasesId" FROM skill_knowledge_bases ORDER BY "skillsId"`,
      ),
    ).toEqual(
      expect.arrayContaining([
        { skillsId: orgSkill, knowledgeBasesId: skillKnowledgeBase },
        { skillsId: teamOwnedSkill, knowledgeBasesId: teamOwnedKnowledgeBase },
      ]),
    );
    expect(
      await runner.query(`SELECT 1 FROM skill_knowledge_bases`),
    ).toHaveLength(2);
    expect(await shareTables()).toEqual([]);
  });

  it('applies to a database without shares', async () => {
    await migration.up(runner);

    expect(await shareTables()).toEqual([]);
  });

  it('recreates empty share tables on revert without restoring shares', async () => {
    await seedShares(runner);
    await migration.up(runner);

    await migration.down(runner);

    expect(await shareTables()).toEqual(['share_scopes', 'shares']);
    expect(await ids('shares')).toEqual([]);
    expect(await ids('skill_activations')).toHaveLength(3);
    await migration.up(runner);
    expect(await shareTables()).toEqual([]);
  });
});
