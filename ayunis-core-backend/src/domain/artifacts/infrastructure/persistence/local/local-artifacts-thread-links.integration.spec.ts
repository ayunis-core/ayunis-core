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
 * The owner has two personal chats with one artifact each; a second user has
 * a chat of their own. Links to other chats are added the way attaching an
 * artifact to a chat will add them.
 */
describe('Chats reach artifacts through their links (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let artifacts: LocalArtifactsRepository;
  let owner: UUID;
  let firstChat: UUID;
  let firstArtifact: UUID;
  let secondChat: UUID;
  let secondArtifact: UUID;

  beforeAll(async () => {
    ({ db, schema } = await createArtifactTestDb('ayc1996_artifacts'));
    artifacts = createArtifactsRepository(db);
  }, 30_000);

  beforeEach(async () => {
    owner = randomUUID();
    firstChat = await insertChat(db, owner, null);
    firstArtifact = await insertArtifact(db, owner, firstChat);
    secondChat = await insertChat(db, owner, null);
    secondArtifact = await insertArtifact(db, owner, secondChat);
  }, 30_000);

  afterAll(async () => {
    await dropArtifactTestDb(db, schema);
  }, 30_000);

  async function findFromRun(userId: UUID, threadId: UUID) {
    const options = { linkedThreadId: threadId };
    return {
      update:
        (await artifacts.findById(firstArtifact, userId, options)) !== null,
      read:
        (await artifacts.findByIdWithVersions(firstArtifact, userId, options))
          ?.versions?.length === 1,
    };
  }

  const found = { update: true, read: true };
  const notFound = { update: false, read: false };

  it('lists the artifacts linked to a chat in link order, not those of the user’s other chats', async () => {
    const listed = async (threadId: UUID) =>
      (await artifacts.findByThreadId(threadId, owner)).map((a) => a.id);
    expect(await listed(firstChat)).toEqual([firstArtifact]);
    expect(await listed(secondChat)).toEqual([secondArtifact]);

    await artifacts.addThreadLink(secondChat, firstArtifact);

    expect(await listed(secondChat)).toEqual([secondArtifact, firstArtifact]);
    expect(await listed(firstChat)).toEqual([firstArtifact]);
  });

  it('does not find an artifact for a run of another chat of the same user until it is linked there', async () => {
    expect(await findFromRun(owner, firstChat)).toEqual(found);
    expect(await findFromRun(owner, secondChat)).toEqual(notFound);

    await artifacts.addThreadLink(secondChat, firstArtifact);

    expect(await findFromRun(owner, secondChat)).toEqual(found);
  });

  it('never finds another user’s artifact for a run, even when linked to their chat', async () => {
    const colleague = randomUUID();
    const colleagueChat = await insertChat(db, colleague, null);
    expect(await findFromRun(colleague, colleagueChat)).toEqual(notFound);

    await artifacts.addThreadLink(colleagueChat, firstArtifact);

    expect(await findFromRun(colleague, colleagueChat)).toEqual(notFound);
  });
});
