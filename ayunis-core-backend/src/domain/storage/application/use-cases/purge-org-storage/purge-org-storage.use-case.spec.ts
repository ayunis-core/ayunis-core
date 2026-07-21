import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PurgeOrgStorageUseCase } from './purge-org-storage.use-case';
import { PurgeOrgStorageCommand } from './purge-org-storage.command';
import { ListObjectsUseCase } from '../list-objects/list-objects.use-case';
import { DeleteObjectUseCase } from '../delete-object/delete-object.use-case';
import { ObjectNotFoundError } from '../../storage.errors';
import type { UUID } from 'crypto';

describe('PurgeOrgStorageUseCase', () => {
  let useCase: PurgeOrgStorageUseCase;
  let listObjectsUseCase: { execute: jest.Mock };
  let deleteObjectUseCase: { execute: jest.Mock };

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    listObjectsUseCase = { execute: jest.fn().mockResolvedValue([]) };
    deleteObjectUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurgeOrgStorageUseCase,
        { provide: ListObjectsUseCase, useValue: listObjectsUseCase },
        { provide: DeleteObjectUseCase, useValue: deleteObjectUseCase },
      ],
    }).compile();

    useCase = module.get(PurgeOrgStorageUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('lists every org-scoped storage prefix', async () => {
    await useCase.execute(new PurgeOrgStorageCommand(orgId));

    const listedPrefixes = listObjectsUseCase.execute.mock.calls.map(
      ([command]: [{ prefix: string }]) => command.prefix,
    );
    expect(listedPrefixes).toEqual(
      expect.arrayContaining([
        `${orgId}/`,
        `generated-images/${orgId}/`,
        `letterheads/${orgId}/`,
      ]),
    );
  });

  it('deletes every object returned across all org prefixes', async () => {
    listObjectsUseCase.execute
      .mockResolvedValueOnce([`${orgId}/thread-1/msg-1/0.png`])
      .mockResolvedValueOnce([`generated-images/${orgId}/thread-1/img.png`])
      .mockResolvedValueOnce([`letterheads/${orgId}/lh-1/first-page.pdf`]);

    const result = await useCase.execute(new PurgeOrgStorageCommand(orgId));

    expect(result).toEqual({ deletedCount: 3, failedCount: 0 });
    const deletedNames = deleteObjectUseCase.execute.mock.calls.map(
      ([command]: [{ objectName: string }]) => command.objectName,
    );
    expect(deletedNames).toEqual(
      expect.arrayContaining([
        `${orgId}/thread-1/msg-1/0.png`,
        `generated-images/${orgId}/thread-1/img.png`,
        `letterheads/${orgId}/lh-1/first-page.pdf`,
      ]),
    );
  });

  it('performs no deletions when the org has no stored objects', async () => {
    const result = await useCase.execute(new PurgeOrgStorageCommand(orgId));

    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
    expect(result).toEqual({ deletedCount: 0, failedCount: 0 });
  });

  it('treats an already-missing object as successfully purged', async () => {
    listObjectsUseCase.execute.mockResolvedValueOnce([`${orgId}/gone.png`]);
    deleteObjectUseCase.execute.mockRejectedValueOnce(
      new ObjectNotFoundError({ objectName: `${orgId}/gone.png` }),
    );

    const result = await useCase.execute(new PurgeOrgStorageCommand(orgId));

    expect(result).toEqual({ deletedCount: 1, failedCount: 0 });
  });

  it('continues purging and counts failures when a delete errors', async () => {
    listObjectsUseCase.execute.mockResolvedValueOnce([
      `${orgId}/keep-going/0.png`,
      `${orgId}/keep-going/1.png`,
    ]);
    deleteObjectUseCase.execute
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined);

    const result = await useCase.execute(new PurgeOrgStorageCommand(orgId));

    expect(deleteObjectUseCase.execute).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ deletedCount: 1, failedCount: 1 });
  });
});
