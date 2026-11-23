import { randomUUID, type UUID } from 'crypto';
import type { DataSource } from 'typeorm';
import type { LocalArtifactsRepository } from './local-artifacts.repository';
import {
  artifactSchema,
  createArtifactsRepository,
  createArtifactTestDb,
  dropArtifactTestDb,
  insertArtifact,
  insertChat,
} from './testing/artifact-db.fixtures';

/**
 * Distinct principals: the creator and a colleague are both members of the
 * workspace and each has an artifact in their own chat there; the creator
 * also has an artifact in a personal chat. Membership rows are changed
 * directly, as no member API exists here.
 */
describe('Workspace chat artifacts require current membership (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let artifacts: LocalArtifactsRepository;
  let creator: UUID;
  let colleague: UUID;
  let workspaceId: UUID;
  let workspaceChat: UUID;
  let workspaceArtifact: UUID;
  let personalChat: UUID;
  let personalArtifact: UUID;

  beforeAll(async () => {
    ({ db, schema } = await createArtifactTestDb('ayc1698_artifacts'));
    artifacts = createArtifactsRepository(db);
  }, 30_000);

  beforeEach(async () => {
    creator = randomUUID();
    colleague = randomUUID();
    workspaceId = randomUUID();
    await join(creator);
    await join(colleague);
    workspaceChat = await chat(creator, workspaceId);
    workspaceArtifact = await artifact(creator, workspaceChat);
    personalChat = await chat(creator, null);
    personalArtifact = await artifact(creator, personalChat);
    await artifact(colleague, await chat(colleague, workspaceId));
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

  async function chat(userId: UUID, workspace: UUID | null): Promise<UUID> {
    return insertChat(db, userId, workspace);
  }

  async function artifact(userId: UUID, threadId: UUID): Promise<UUID> {
    return insertArtifact(db, userId, threadId);
  }

  /** Every lookup that serves an artifact to a user, by path. */
  async function reads(userId: UUID, artifactId: UUID, threadId: UUID) {
    const withVersions = await artifacts.findByIdWithVersions(
      artifactId,
      userId,
    );
    return {
      update: (await artifacts.findById(artifactId, userId)) !== null,
      detail: withVersions?.versions?.length === 1,
      threadList: (await artifacts.findByThreadId(threadId, userId)).some(
        (item) => item.id === artifactId,
      ),
    };
  }

  const reachable = { update: true, detail: true, threadList: true };
  const unreachable = { update: false, detail: false, threadList: false };

  it('serves the creator their workspace chat artifact while a member', async () => {
    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      reachable,
    );
  });

  it('hides the artifact once the creator is no longer a member, and keeps it', async () => {
    await leave(creator);

    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      unreachable,
    );
    expect(
      await db.getRepository(artifactSchema).countBy({ id: workspaceArtifact }),
    ).toBe(1);
  });

  it('serves the artifact again when the creator is added back', async () => {
    await leave(creator);
    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      unreachable,
    );

    await join(creator);

    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      reachable,
    );
  });

  it('never serves another member the creator’s artifact', async () => {
    expect(await reads(colleague, workspaceArtifact, workspaceChat)).toEqual(
      unreachable,
    );
  });

  it('serves personal chat artifacts without any workspace membership', async () => {
    await leave(creator);

    expect(await reads(creator, personalArtifact, personalChat)).toEqual(
      reachable,
    );
  });
});
