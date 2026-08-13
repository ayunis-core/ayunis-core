import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { IsNull } from 'typeorm';
import type { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { LocalPendingInviteCountsRepository } from 'src/iam/invites/infrastructure/persistence/local/local-pending-invite-counts.repository';

const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;

describe(LocalPendingInviteCountsRepository.name, () => {
  it('counts only pending invitations through the ambient transaction manager', async () => {
    const records: jest.Mocked<Pick<Repository<InviteRecord>, 'count'>> = {
      count: jest.fn().mockResolvedValue(2),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(records),
    } as unknown as EntityManager;
    const repository = new LocalPendingInviteCountsRepository({
      tx: manager,
    } as TransactionHost<TransactionalAdapterTypeOrm>);

    await expect(repository.countByOrgId(ORG_ID)).resolves.toBe(2);
    expect(records.count).toHaveBeenCalledWith({
      where: { orgId: ORG_ID, acceptedAt: IsNull() },
    });
  });
});
