import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import { LocalTeamsRepository } from 'src/iam/teams/infrastructure/repositories/local/local-teams.repository';
import type { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';

describe(LocalTeamsRepository.name, () => {
  it('loads only requested teams from the target organization', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const records = { find } as unknown as Repository<TeamRecord>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(records),
    } as unknown as EntityManager;
    const repository = new LocalTeamsRepository({
      tx: manager,
    } as TransactionHost<TransactionalAdapterTypeOrm>);
    const ids = [
      '11111111-1111-4111-8111-111111111111' as UUID,
      '22222222-2222-4222-8222-222222222222' as UUID,
    ];
    const orgId = '33333333-3333-4333-8333-333333333333' as UUID;

    await repository.findByIdsAndOrgId(ids, orgId);

    expect(find).toHaveBeenCalledWith({
      where: { id: expect.anything(), orgId },
    });
  });
});
