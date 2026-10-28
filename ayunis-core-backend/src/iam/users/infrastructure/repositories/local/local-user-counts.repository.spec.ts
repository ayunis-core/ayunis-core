import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LocalUserCountsRepository } from 'src/iam/users/infrastructure/repositories/local/local-user-counts.repository';

const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;

describe(LocalUserCountsRepository.name, () => {
  it('counts organization users through the ambient transaction manager', async () => {
    const records: jest.Mocked<Pick<Repository<UserRecord>, 'count'>> = {
      count: jest.fn().mockResolvedValue(4),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(records),
    } as unknown as EntityManager;
    const repository = new LocalUserCountsRepository({
      tx: manager,
    } as TransactionHost<TransactionalAdapterTypeOrm>);

    await expect(repository.countByOrgId(ORG_ID)).resolves.toBe(4);
    expect(records.count).toHaveBeenCalledWith({ where: { orgId: ORG_ID } });
  });
});
