import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { LocalTeamMembersRepository } from 'src/iam/teams/infrastructure/repositories/local/local-team-members.repository';
import type { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';

describe(LocalTeamMembersRepository.name, () => {
  it('inserts all memberships in one idempotent query', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const queryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute,
    };
    const records = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<TeamMemberRecord>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(records),
    } as unknown as EntityManager;
    const repository = new LocalTeamMembersRepository({
      tx: manager,
    } as TransactionHost<TransactionalAdapterTypeOrm>);
    const userId = '11111111-1111-1111-1111-111111111111' as UUID;
    const memberships = [
      new TeamMember({
        teamId: '22222222-2222-2222-2222-222222222222',
        userId,
      }),
      new TeamMember({
        teamId: '33333333-3333-3333-3333-333333333333',
        userId,
      }),
    ];

    await repository.createMany(memberships);

    expect(queryBuilder.values).toHaveBeenCalledWith(
      memberships.map((membership) =>
        expect.objectContaining({
          id: membership.id,
          teamId: membership.teamId,
          userId,
        }),
      ),
    );
    expect(queryBuilder.orIgnore).toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not query for an empty membership list', async () => {
    const getRepository = jest.fn();
    const repository = new LocalTeamMembersRepository({
      tx: { getRepository } as unknown as EntityManager,
    } as TransactionHost<TransactionalAdapterTypeOrm>);

    await repository.createMany([]);

    expect(getRepository).not.toHaveBeenCalled();
  });
});
