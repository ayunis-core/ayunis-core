import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { LocalTeamMembersRepository } from 'src/iam/teams/infrastructure/repositories/local/local-team-members.repository';
import type { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';

interface QueryBuilderFixture {
  queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<TeamMemberRecord>,
      | 'select'
      | 'addSelect'
      | 'innerJoin'
      | 'where'
      | 'andWhere'
      | 'groupBy'
      | 'getRawMany'
    >
  >;
  records: Repository<TeamMemberRecord>;
  repository: LocalTeamMembersRepository;
}

function createQueryBuilderFixture(): QueryBuilderFixture {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
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

  return { queryBuilder, records, repository };
}

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

  it('returns user IDs grouped by team in one organization-scoped query', async () => {
    const { queryBuilder, records, repository } = createQueryBuilderFixture();
    const organizationId = randomUUID();
    const firstTeamId = randomUUID();
    const secondTeamId = randomUUID();
    const firstUserId = randomUUID();
    const sharedUserId = randomUUID();
    queryBuilder.getRawMany.mockResolvedValue([
      { teamId: firstTeamId, userIds: [firstUserId, sharedUserId] },
      { teamId: secondTeamId, userIds: [sharedUserId] },
    ]);

    const result = await repository.findAllUserIdsByTeamIds(organizationId, [
      firstTeamId,
      secondTeamId,
    ]);

    expect(result).toEqual(
      new Map<UUID, UUID[]>([
        [firstTeamId, [firstUserId, sharedUserId]],
        [secondTeamId, [sharedUserId]],
      ]),
    );
    expect(records.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'ARRAY_AGG(tm.user_id)',
      'userIds',
    );
    expect(queryBuilder.innerJoin).toHaveBeenCalledWith('tm.team', 'team');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'team.org_id = :organizationId',
      { organizationId },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'tm.team_id IN (:...teamIds)',
      { teamIds: [firstTeamId, secondTeamId] },
    );
    expect(queryBuilder.groupBy).toHaveBeenCalledWith('tm.team_id');
    expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1);
  });

  it('does not query the database when no team IDs are requested', async () => {
    const { records, repository } = createQueryBuilderFixture();

    await expect(
      repository.findAllUserIdsByTeamIds(randomUUID(), []),
    ).resolves.toEqual(new Map());
    expect(records.createQueryBuilder).not.toHaveBeenCalled();
  });
});
