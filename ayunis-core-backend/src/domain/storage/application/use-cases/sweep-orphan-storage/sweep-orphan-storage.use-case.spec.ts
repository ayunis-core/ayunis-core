import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import {
  ORPHAN_STORAGE_SAFETY_WINDOW_MS,
  SweepOrphanStorageUseCase,
} from './sweep-orphan-storage.use-case';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { FindAllOrgIdsUseCase } from 'src/iam/orgs/application/use-cases/find-all-org-ids/find-all-org-ids.use-case';
import { PurgeOrgStorageUseCase } from 'src/domain/storage/application/use-cases/purge-org-storage/purge-org-storage.use-case';

const ORG_LIVE = '11111111-1111-4111-8111-111111111111' as UUID;
const ORG_GONE = '22222222-2222-4222-8222-222222222222' as UUID;
const ORG_GONE_2 = '33333333-3333-4333-8333-333333333333' as UUID;

const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);
const wellOutsideWindow = () =>
  new Date(Date.now() - ORPHAN_STORAGE_SAFETY_WINDOW_MS - 60 * 60 * 1000);

describe('SweepOrphanStorageUseCase', () => {
  let useCase: SweepOrphanStorageUseCase;
  let objectStorage: { listObjectsWithMetadata: jest.Mock };
  let findAllOrgIdsUseCase: { execute: jest.Mock };
  let purgeOrgStorageUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    objectStorage = {
      listObjectsWithMetadata: jest.fn().mockResolvedValue([]),
    };
    findAllOrgIdsUseCase = { execute: jest.fn().mockResolvedValue([]) };
    purgeOrgStorageUseCase = {
      execute: jest.fn().mockResolvedValue({ deletedCount: 0, failedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SweepOrphanStorageUseCase,
        { provide: ObjectStoragePort, useValue: objectStorage },
        { provide: FindAllOrgIdsUseCase, useValue: findAllOrgIdsUseCase },
        { provide: PurgeOrgStorageUseCase, useValue: purgeOrgStorageUseCase },
      ],
    }).compile();

    useCase = module.get(SweepOrphanStorageUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('purges an org that exists in storage but not in the database', async () => {
    findAllOrgIdsUseCase.execute.mockResolvedValue([ORG_LIVE]);
    objectStorage.listObjectsWithMetadata.mockResolvedValue([
      {
        objectName: `${ORG_GONE}/thread/msg/0.png`,
        lastModified: wellOutsideWindow(),
      },
    ]);
    purgeOrgStorageUseCase.execute.mockResolvedValue({
      deletedCount: 3,
      failedCount: 1,
    });

    const result = await useCase.execute();

    expect(purgeOrgStorageUseCase.execute).toHaveBeenCalledTimes(1);
    expect(purgeOrgStorageUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_GONE }),
    );
    expect(result).toEqual({
      storageOrgCount: 1,
      orphanOrgCount: 1,
      purgedOrgCount: 1,
      skippedRecentOrgCount: 0,
      deletedObjectCount: 3,
      failedObjectCount: 1,
    });
  });

  it('never purges an org whose row still exists', async () => {
    findAllOrgIdsUseCase.execute.mockResolvedValue([ORG_LIVE]);
    objectStorage.listObjectsWithMetadata.mockResolvedValue([
      {
        objectName: `${ORG_LIVE}/thread/msg/0.png`,
        lastModified: wellOutsideWindow(),
      },
    ]);

    const result = await useCase.execute();

    expect(purgeOrgStorageUseCase.execute).not.toHaveBeenCalled();
    expect(result.orphanOrgCount).toBe(0);
    expect(result.purgedOrgCount).toBe(0);
  });

  it('skips an orphan org whose newest blob is inside the safety window', async () => {
    objectStorage.listObjectsWithMetadata.mockResolvedValue([
      { objectName: `${ORG_GONE}/old.png`, lastModified: wellOutsideWindow() },
      { objectName: `${ORG_GONE}/fresh.png`, lastModified: anHourAgo() },
    ]);

    const result = await useCase.execute();

    expect(purgeOrgStorageUseCase.execute).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        orphanOrgCount: 1,
        purgedOrgCount: 0,
        skippedRecentOrgCount: 1,
      }),
    );
  });

  it('resolves org ids from nested generated-images and letterheads prefixes', async () => {
    objectStorage.listObjectsWithMetadata.mockResolvedValue([
      {
        objectName: `generated-images/${ORG_GONE}/img.png`,
        lastModified: wellOutsideWindow(),
      },
      {
        objectName: `letterheads/${ORG_GONE_2}/head.pdf`,
        lastModified: wellOutsideWindow(),
      },
    ]);

    const result = await useCase.execute();

    const purgedOrgIds = purgeOrgStorageUseCase.execute.mock.calls.map(
      ([command]: [{ orgId: UUID }]) => command.orgId,
    );
    expect(purgedOrgIds).toEqual(
      expect.arrayContaining([ORG_GONE, ORG_GONE_2]),
    );
    expect(result.purgedOrgCount).toBe(2);
  });

  it('ignores keys that do not embed an org uuid', async () => {
    objectStorage.listObjectsWithMetadata.mockResolvedValue([
      { objectName: 'not-a-uuid/file.png', lastModified: wellOutsideWindow() },
      {
        objectName: 'generated-images/also-not-a-uuid/file.png',
        lastModified: wellOutsideWindow(),
      },
    ]);

    const result = await useCase.execute();

    expect(purgeOrgStorageUseCase.execute).not.toHaveBeenCalled();
    expect(result.storageOrgCount).toBe(0);
  });

  it('treats a blob with no last-modified time as recent and does not purge it', async () => {
    objectStorage.listObjectsWithMetadata.mockResolvedValue([
      { objectName: `${ORG_GONE}/unknown-age.png` },
    ]);

    const result = await useCase.execute();

    expect(purgeOrgStorageUseCase.execute).not.toHaveBeenCalled();
    expect(result.skippedRecentOrgCount).toBe(1);
  });

  it('aggregates deleted and failed counts across multiple orphan orgs', async () => {
    objectStorage.listObjectsWithMetadata.mockResolvedValue([
      { objectName: `${ORG_GONE}/a.png`, lastModified: wellOutsideWindow() },
      { objectName: `${ORG_GONE_2}/b.png`, lastModified: wellOutsideWindow() },
    ]);
    purgeOrgStorageUseCase.execute
      .mockResolvedValueOnce({ deletedCount: 2, failedCount: 0 })
      .mockResolvedValueOnce({ deletedCount: 1, failedCount: 3 });

    const result = await useCase.execute();

    expect(result).toEqual({
      storageOrgCount: 2,
      orphanOrgCount: 2,
      purgedOrgCount: 2,
      skippedRecentOrgCount: 0,
      deletedObjectCount: 3,
      failedObjectCount: 3,
    });
  });
});
