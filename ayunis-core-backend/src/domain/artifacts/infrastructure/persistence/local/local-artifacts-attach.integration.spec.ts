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
 * The owner has a personal chat with an artifact and is a member of two
 * workspaces. Attaching links an artifact to another chat only when the
 * chat's scope and mode match the artifact.
 */
describe('Attaching artifacts to chats (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let artifacts: LocalArtifactsRepository;
  let owner: UUID;
  let workspaceId: UUID;
  let otherWorkspaceId: UUID;
  let personalArtifact: UUID;

  beforeAll(async () => {
    ({ db, schema } = await createArtifactTestDb('ayc2001_artifacts'));
    artifacts = createArtifactsRepository(db);
  }, 30_000);

  beforeEach(async () => {
    owner = randomUUID();
    workspaceId = randomUUID();
    otherWorkspaceId = randomUUID();
    personalArtifact = await insertArtifact(
      db,
      await insertChat(db, owner, null),
    );
  }, 30_000);

  afterAll(async () => {
    await dropArtifactTestDb(db, schema);
  }, 30_000);

  async function isWaitingForLock(): Promise<boolean> {
    const rows = await db.query<unknown[]>(
      `SELECT 1 FROM pg_stat_activity
       WHERE wait_event_type = 'Lock' AND query LIKE '%INSERT INTO "thread_artifacts"%'`,
    );
    return rows.length > 0;
  }

  async function waitUntil(condition: () => Promise<boolean>): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Condition not met within 5 seconds');
  }

  const linkedTo = async (threadId: UUID) =>
    (await artifacts.findByThreadId(threadId, owner)).map(({ id }) => id);

  it('links an artifact to another chat of its scope once, however often it is attached', async () => {
    const chat = await insertChat(db, owner, null);

    expect(
      await artifacts.linkToMatchingThread(chat, personalArtifact, owner),
    ).toBe(true);
    expect(
      await artifacts.linkToMatchingThread(chat, personalArtifact, owner),
    ).toBe(true);

    const [{ count }] = await db.query<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM thread_artifacts WHERE "threadId" = $1`,
      [chat],
    );
    expect(count).toBe(1);
  });

  it('links a workspace artifact to another chat of the same workspace', async () => {
    const workspaceArtifact = await insertArtifact(
      db,
      await insertChat(db, owner, workspaceId),
    );
    const chat = await insertChat(db, owner, workspaceId);

    expect(
      await artifacts.linkToMatchingThread(chat, workspaceArtifact, owner),
    ).toBe(true);
  });

  it('links nothing across scopes, modes or users', async () => {
    const workspaceArtifact = await insertArtifact(
      db,
      await insertChat(db, owner, workspaceId),
    );
    const anonymousArtifact = await insertArtifact(
      db,
      await insertChat(db, owner, null, true),
      true,
    );
    const personalChat = await insertChat(db, owner, null);
    const workspaceChat = await insertChat(db, owner, workspaceId);
    const otherWorkspaceChat = await insertChat(db, owner, otherWorkspaceId);
    const anonymousChat = await insertChat(db, owner, null, true);
    const colleagueChat = await insertChat(db, randomUUID(), null);

    const refused: [UUID, UUID][] = [
      [workspaceChat, personalArtifact],
      [personalChat, workspaceArtifact],
      [otherWorkspaceChat, workspaceArtifact],
      [anonymousChat, personalArtifact],
      [personalChat, anonymousArtifact],
      [colleagueChat, personalArtifact],
    ];
    for (const [chat, artifact] of refused) {
      expect(await artifacts.linkToMatchingThread(chat, artifact, owner)).toBe(
        false,
      );
    }
    const [{ count }] = await db.query<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM thread_artifacts WHERE "threadId" = ANY($1)`,
      [refused.map(([chat]) => chat)],
    );
    expect(count).toBe(0);
  });

  it('waits for a chat that is moving to another scope and then links nothing', async () => {
    const chat = await insertChat(db, owner, null);
    const move = db.createQueryRunner();
    await move.connect();
    try {
      await move.startTransaction();
      await move.query(`UPDATE threads SET "workspaceId" = $2 WHERE id = $1`, [
        chat,
        workspaceId,
      ]);

      let settled = false;
      const attach = artifacts
        .linkToMatchingThread(chat, personalArtifact, owner)
        .finally(() => (settled = true));
      await waitUntil(async () => settled || (await isWaitingForLock()));
      await move.commitTransaction();

      expect(await attach).toBe(false);
      expect(await linkedTo(chat)).toEqual([]);
    } finally {
      await move.release();
    }
  });
});
