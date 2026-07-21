import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PurgeStoragePrefixesUseCase } from './purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from './purge-storage-prefixes.command';
import { ListObjectsUseCase } from '../list-objects/list-objects.use-case';
import { DeleteObjectUseCase } from '../delete-object/delete-object.use-case';
import { ObjectNotFoundError } from '../../storage.errors';

describe('PurgeStoragePrefixesUseCase', () => {
  let useCase: PurgeStoragePrefixesUseCase;
  let listObjectsUseCase: { execute: jest.Mock };
  let deleteObjectUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    listObjectsUseCase = { execute: jest.fn().mockResolvedValue([]) };
    deleteObjectUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurgeStoragePrefixesUseCase,
        { provide: ListObjectsUseCase, useValue: listObjectsUseCase },
        { provide: DeleteObjectUseCase, useValue: deleteObjectUseCase },
      ],
    }).compile();

    useCase = module.get(PurgeStoragePrefixesUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('lists every given prefix', async () => {
    await useCase.execute(
      new PurgeStoragePrefixesCommand(['org-1/', 'letterheads/org-1/']),
    );

    const listedPrefixes = listObjectsUseCase.execute.mock.calls.map(
      ([command]: [{ prefix: string }]) => command.prefix,
    );
    expect(listedPrefixes).toEqual(['org-1/', 'letterheads/org-1/']);
  });

  it('deletes every object returned across all prefixes, deduplicated', async () => {
    listObjectsUseCase.execute
      .mockResolvedValueOnce(['org-1/thread-1/msg-1/0.png', 'org-1/dupe.png'])
      .mockResolvedValueOnce(['org-1/dupe.png']);

    const result = await useCase.execute(
      new PurgeStoragePrefixesCommand(['org-1/', 'org-1/']),
    );

    expect(result).toEqual({ deletedCount: 2, failedCount: 0 });
    const deletedNames = deleteObjectUseCase.execute.mock.calls.map(
      ([command]: [{ objectName: string }]) => command.objectName,
    );
    expect(deletedNames).toEqual([
      'org-1/thread-1/msg-1/0.png',
      'org-1/dupe.png',
    ]);
  });

  it('performs no deletions when the prefixes hold no objects', async () => {
    const result = await useCase.execute(
      new PurgeStoragePrefixesCommand(['org-1/']),
    );

    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
    expect(result).toEqual({ deletedCount: 0, failedCount: 0 });
  });

  it('treats an already-missing object as successfully purged', async () => {
    listObjectsUseCase.execute.mockResolvedValueOnce(['org-1/gone.png']);
    deleteObjectUseCase.execute.mockRejectedValueOnce(
      new ObjectNotFoundError({ objectName: 'org-1/gone.png' }),
    );

    const result = await useCase.execute(
      new PurgeStoragePrefixesCommand(['org-1/']),
    );

    expect(result).toEqual({ deletedCount: 1, failedCount: 0 });
  });

  it('skips a prefix that fails to list and still purges the other prefixes', async () => {
    listObjectsUseCase.execute
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(['letterheads/org-1/letterhead.pdf']);

    const result = await useCase.execute(
      new PurgeStoragePrefixesCommand(['org-1/', 'letterheads/org-1/']),
    );

    expect(result).toEqual({ deletedCount: 1, failedCount: 0 });
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: 'letterheads/org-1/letterhead.pdf',
      }),
    );
  });

  it('continues purging and counts failures when a delete errors', async () => {
    listObjectsUseCase.execute.mockResolvedValueOnce([
      'org-1/keep-going/0.png',
      'org-1/keep-going/1.png',
    ]);
    deleteObjectUseCase.execute
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined);

    const result = await useCase.execute(
      new PurgeStoragePrefixesCommand(['org-1/']),
    );

    expect(deleteObjectUseCase.execute).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ deletedCount: 1, failedCount: 1 });
  });
});
