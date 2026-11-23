import { randomUUID, type UUID } from 'crypto';
import type { DataSource } from 'typeorm';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import type { ArtifactOwner } from 'src/domain/artifacts/domain/artifact-owner';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import type { ArtifactListOptions } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import type { LocalArtifactsRepository } from './local-artifacts.repository';
import {
  artifactSchema,
  createArtifactsRepository,
  createArtifactTestDb,
  dropArtifactTestDb,
} from './testing/artifact-db.fixtures';

/**
 * The Ablage lists a user's personal artifacts; the workspace tab a
 * workspace's. The user also created artifacts in the workspace, and a
 * colleague has personal artifacts of their own.
 */
describe('Listing artifacts by owner (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let artifacts: LocalArtifactsRepository;
  let user: UUID;
  let colleague: UUID;
  let workspaceId: UUID;
  let changedAt: number;

  beforeAll(async () => {
    ({ db, schema } = await createArtifactTestDb('ayc2000_artifacts'));
    artifacts = createArtifactsRepository(db);
  }, 30_000);

  beforeEach(() => {
    user = randomUUID();
    colleague = randomUUID();
    workspaceId = randomUUID();
    changedAt = Date.UTC(2026, 0, 1);
  });

  afterAll(async () => {
    await dropArtifactTestDb(db, schema);
  }, 30_000);

  /** Each artifact inserted is changed a minute after the previous one. */
  async function insert(
    owner: ArtifactOwner,
    title: string,
    options: { type?: string; isAnonymous?: boolean } = {},
  ): Promise<UUID> {
    const id = randomUUID();
    await db.getRepository(artifactSchema).insert({
      id,
      userId: owner.type === 'personal' ? owner.userId : null,
      workspaceId: owner.type === 'workspace' ? owner.workspaceId : null,
      creatorId: user,
      type: options.type ?? ArtifactType.DOCUMENT,
      title,
      isAnonymous: options.isAnonymous ?? false,
    });
    changedAt += 60_000;
    await db.query(`UPDATE artifacts SET "updatedAt" = $2 WHERE id = $1`, [
      id,
      new Date(changedAt),
    ]);
    return id;
  }

  const personal = (userId: UUID): ArtifactOwner => ({
    type: 'personal',
    userId,
  });

  async function listed(
    owner: ArtifactOwner,
    options: Partial<ArtifactListOptions> = {},
  ) {
    const page = await artifacts.findByOwner(owner, {
      limit: 20,
      offset: 0,
      ...options,
    });
    return { ids: page.data.map(({ id }) => id), total: page.total };
  }

  it('lists only the user’s personal artifacts, most recently changed first, never workspace artifacts they created', async () => {
    const older = await insert(personal(user), 'Antrag');
    await insert({ type: 'workspace', workspaceId }, 'Beschluss');
    await insert(personal(colleague), 'Notiz');
    const newer = await insert(personal(user), 'Bescheid');

    expect(await listed(personal(user))).toEqual({
      ids: [newer, older],
      total: 2,
    });
  });

  it('pages through the list and reports the total', async () => {
    const first = await insert(personal(user), 'Eins');
    const second = await insert(personal(user), 'Zwei');
    await insert(personal(user), 'Drei');

    expect(await listed(personal(user), { limit: 2, offset: 1 })).toEqual({
      ids: [second, first],
      total: 3,
    });
  });

  it('filters by type and leaves out unsupported legacy types', async () => {
    const diagram = await insert(personal(user), 'Ablauf', {
      type: ArtifactType.DIAGRAM,
    });
    await insert(personal(user), 'Antrag');
    await insert(personal(user), 'Altlast', { type: 'legacy' });

    expect(
      await listed(personal(user), { type: ArtifactType.DIAGRAM }),
    ).toEqual({ ids: [diagram], total: 1 });
    expect((await listed(personal(user))).total).toBe(2);
  });

  it('searches titles case-insensitively', async () => {
    const match = await insert(personal(user), 'Bauantrag Lindenstraße');
    await insert(personal(user), 'Haushaltsplan');

    expect(await listed(personal(user), { search: 'bauANTRAG' })).toEqual({
      ids: [match],
      total: 1,
    });
  });

  it('searches an anonymous artifact’s title as shown, with real values, not by its placeholders', async () => {
    const anonymous = await insert(
      personal(user),
      'Brief an {{pii:PERSON_NAME_1}} ({{pii:PERSON_NAME_2}})',
      { isAnonymous: true },
    );
    await artifacts.addPiiMasks([
      new ArtifactPiiMask({
        artifactId: anonymous,
        category: PiiCategory.PERSON_NAME,
        maskIndex: 1,
        value: 'Anna Schmidt',
      }),
    ]);

    const search = (term: string) =>
      listed(personal(user), { search: term }).then(({ ids }) => ids);
    expect(await search('an anna schm')).toEqual([anonymous]);
    expect(await search('({{pii:PERSON_NAME_2}})')).toEqual([anonymous]);
    expect(await search('PERSON_NAME_1')).toEqual([]);
  });
});
