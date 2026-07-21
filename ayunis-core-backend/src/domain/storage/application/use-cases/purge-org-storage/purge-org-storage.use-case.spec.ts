import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PurgeOrgStorageUseCase } from './purge-org-storage.use-case';
import { PurgeOrgStorageCommand } from './purge-org-storage.command';
import { PurgeStoragePrefixesUseCase } from '../purge-storage-prefixes/purge-storage-prefixes.use-case';
import type { UUID } from 'crypto';

describe('PurgeOrgStorageUseCase', () => {
  let useCase: PurgeOrgStorageUseCase;
  let purgeStoragePrefixesUseCase: { execute: jest.Mock };

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    purgeStoragePrefixesUseCase = {
      execute: jest.fn().mockResolvedValue({ deletedCount: 2, failedCount: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurgeOrgStorageUseCase,
        {
          provide: PurgeStoragePrefixesUseCase,
          useValue: purgeStoragePrefixesUseCase,
        },
      ],
    }).compile();

    useCase = module.get(PurgeOrgStorageUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('purges every org-scoped storage prefix and returns the result', async () => {
    const result = await useCase.execute(new PurgeOrgStorageCommand(orgId));

    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        prefixes: [
          `${orgId}/`,
          `generated-images/${orgId}/`,
          `letterheads/${orgId}/`,
        ],
      }),
    );
    expect(result).toEqual({ deletedCount: 2, failedCount: 1 });
  });
});
