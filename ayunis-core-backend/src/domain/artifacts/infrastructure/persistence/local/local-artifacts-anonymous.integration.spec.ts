import { randomUUID, type UUID } from 'crypto';
import type { DataSource } from 'typeorm';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import type { LocalArtifactsRepository } from './local-artifacts.repository';
import {
  createArtifactsRepository,
  createArtifactTestDb,
  dropArtifactTestDb,
  insertArtifact,
  insertChat,
} from './testing/artifact-db.fixtures';

/**
 * One chat links an anonymous and a normal artifact of its user. Runs look
 * artifacts up with the run's mode.
 */
describe('Anonymous artifacts (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let artifacts: LocalArtifactsRepository;
  let owner: UUID;
  let chat: UUID;
  let anonymousArtifact: UUID;
  let normalArtifact: UUID;

  beforeAll(async () => {
    ({ db, schema } = await createArtifactTestDb('ayc1997_artifacts'));
    artifacts = createArtifactsRepository(db);
  }, 30_000);

  beforeEach(async () => {
    owner = randomUUID();
    chat = await insertChat(db, owner, null);
    anonymousArtifact = await insertArtifact(db, chat, true);
    normalArtifact = await insertArtifact(db, chat);
  }, 30_000);

  afterAll(async () => {
    await dropArtifactTestDb(db, schema);
  }, 30_000);

  const mask = (artifactId: UUID, maskIndex: number, value: string) =>
    new ArtifactPiiMask({
      artifactId,
      category: PiiCategory.PERSON_NAME,
      maskIndex,
      value,
    });

  async function foundInRun(artifactId: UUID, isAnonymous: boolean) {
    const options = { linkedThreadId: chat, isAnonymous };
    return {
      update: (await artifacts.findById(artifactId, owner, options)) !== null,
      read:
        (await artifacts.findByIdWithVersions(artifactId, owner, options)) !==
        null,
    };
  }

  const found = { update: true, read: true };
  const notFound = { update: false, read: false };

  it('finds an anonymous artifact only for anonymous runs and a normal one only for normal runs', async () => {
    expect(await foundInRun(anonymousArtifact, true)).toEqual(found);
    expect(await foundInRun(anonymousArtifact, false)).toEqual(notFound);
    expect(await foundInRun(normalArtifact, false)).toEqual(found);
    expect(await foundInRun(normalArtifact, true)).toEqual(notFound);
  });

  it('lists for a run only the chat’s artifacts of its mode, anonymous ones with their own dictionaries', async () => {
    await artifacts.addPiiMasks([mask(anonymousArtifact, 1, 'Anna Schmidt')]);

    const anonymousListing = await artifacts.findByThreadId(chat, owner, {
      isAnonymous: true,
    });
    const normalListing = await artifacts.findByThreadId(chat, owner, {
      isAnonymous: false,
    });

    expect(anonymousListing.map((artifact) => artifact.id)).toEqual([
      anonymousArtifact,
    ]);
    expect(anonymousListing[0].piiMasks?.map((entry) => entry.value)).toEqual([
      'Anna Schmidt',
    ]);
    expect(normalListing.map((artifact) => artifact.id)).toEqual([
      normalArtifact,
    ]);
    expect(
      (await artifacts.findByThreadId(chat, owner)).map((a) => a.id),
    ).toEqual([anonymousArtifact, normalArtifact]);
  });

  it('loads an anonymous artifact with its own dictionary and no other artifact’s', async () => {
    const otherAnonymousArtifact = await insertArtifact(db, chat, true);
    await artifacts.addPiiMasks([
      mask(anonymousArtifact, 1, 'Anna Schmidt'),
      mask(anonymousArtifact, 2, 'Bernd Bauer'),
    ]);
    await artifacts.addPiiMasks([
      mask(otherAnonymousArtifact, 1, 'Carla Weber'),
    ]);

    const loaded = await artifacts.findByIdWithVersions(
      anonymousArtifact,
      owner,
    );

    expect(
      loaded?.piiMasks?.map((entry) => [entry.maskIndex, entry.value]),
    ).toEqual([
      [1, 'Anna Schmidt'],
      [2, 'Bernd Bauer'],
    ]);
  });

  it('rejects a second entry for a placeholder the artifact already has', async () => {
    await artifacts.addPiiMasks([mask(anonymousArtifact, 1, 'Anna Schmidt')]);

    await expect(
      artifacts.addPiiMasks([mask(anonymousArtifact, 1, 'Bernd Bauer')]),
    ).rejects.toThrow();
    expect(
      (await artifacts.findPiiMasks(anonymousArtifact)).map(
        (entry) => entry.value,
      ),
    ).toEqual(['Anna Schmidt']);
  });
});
