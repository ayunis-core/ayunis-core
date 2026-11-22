import { randomUUID, type UUID } from 'crypto';
import type { DataSource } from 'typeorm';
import type { LocalArtifactsRepository } from './local-artifacts.repository';
import {
  createArtifactsRepository,
  createArtifactTestDb,
  dropArtifactTestDb,
  insertArtifact,
  insertChat,
} from './testing/artifact-db.fixtures';

/**
 * Distinct principals: the creator and a colleague are members of the
 * workspace, an outsider is not. The creator has an artifact in a workspace
 * chat and one in a personal chat. Membership rows are changed directly, as
 * no member API exists here.
 */
describe('Artifacts are accessible by their owner (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let artifacts: LocalArtifactsRepository;
  let creator: UUID;
  let colleague: UUID;
  let outsider: UUID;
  let workspaceId: UUID;
  let workspaceArtifact: UUID;
  let personalArtifact: UUID;

  beforeAll(async () => {
    ({ db, schema } = await createArtifactTestDb('ayc1998_artifacts'));
    artifacts = createArtifactsRepository(db);
  }, 30_000);

  beforeEach(async () => {
    creator = randomUUID();
    colleague = randomUUID();
    outsider = randomUUID();
    workspaceId = randomUUID();
    await join(creator);
    await join(colleague);
    workspaceArtifact = await insertArtifact(
      db,
      await insertChat(db, creator, workspaceId),
    );
    personalArtifact = await insertArtifact(
      db,
      await insertChat(db, creator, null),
    );
  }, 30_000);

  afterAll(async () => {
    await dropArtifactTestDb(db, schema);
  }, 30_000);

  async function join(userId: UUID): Promise<void> {
    await db.query(
      `INSERT INTO workspace_members (id, "workspaceId", "userId")
       VALUES ($1, $2, $3)`,
      [randomUUID(), workspaceId, userId],
    );
  }

  async function leave(userId: UUID): Promise<void> {
    await db.query(
      `DELETE FROM workspace_members WHERE "workspaceId" = $1 AND "userId" = $2`,
      [workspaceId, userId],
    );
  }

  /** The lookups that serve an artifact by id: update, edits and the detail. */
  async function reads(userId: UUID, artifactId: UUID) {
    const withVersions = await artifacts.findByIdWithVersions(
      artifactId,
      userId,
    );
    return {
      update: (await artifacts.findById(artifactId, userId)) !== null,
      detail: withVersions?.versions?.length === 1,
    };
  }

  const reachable = { update: true, detail: true };
  const unreachable = { update: false, detail: false };

  it('serves a workspace artifact to every member, not only its creator', async () => {
    expect(await reads(creator, workspaceArtifact)).toEqual(reachable);
    expect(await reads(colleague, workspaceArtifact)).toEqual(reachable);
  });

  it('hides a workspace artifact from a non-member until they join', async () => {
    expect(await reads(outsider, workspaceArtifact)).toEqual(unreachable);

    await join(outsider);

    expect(await reads(outsider, workspaceArtifact)).toEqual(reachable);
  });

  it('hides a workspace artifact from its creator once they leave, and keeps it for the others', async () => {
    await leave(creator);

    expect(await reads(creator, workspaceArtifact)).toEqual(unreachable);
    expect(await reads(colleague, workspaceArtifact)).toEqual(reachable);
  });

  it('serves a personal artifact only to its owner, even within a shared workspace', async () => {
    expect(await reads(creator, personalArtifact)).toEqual(reachable);
    expect(await reads(colleague, personalArtifact)).toEqual(unreachable);
    expect(await reads(outsider, personalArtifact)).toEqual(unreachable);
  });

  it('lists every artifact of the workspace, whoever created it, and no personal ones', async () => {
    const colleagueArtifact = await insertArtifact(
      db,
      await insertChat(db, colleague, workspaceId),
    );
    await insertArtifact(db, await insertChat(db, colleague, randomUUID()));

    const listed = await artifacts.findByOwner(
      { type: 'workspace', workspaceId },
      { limit: 20, offset: 0 },
    );

    expect(listed.data.map((artifact) => artifact.id)).toEqual(
      expect.arrayContaining([workspaceArtifact, colleagueArtifact]),
    );
    expect(listed.total).toBe(2);
  });
});
