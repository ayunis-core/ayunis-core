import { Test, TestingModule } from '@nestjs/testing';
import { FindAllUserIdsByTeamIdUseCase } from './find-all-user-ids-by-team-id.use-case';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { FindAllUserIdsByTeamIdQuery } from './find-all-user-ids-by-team-id.query';
import { randomUUID } from 'crypto';
import { Paginated } from 'src/common/pagination';
import { TeamMember } from '../../../domain/team-member.entity';

describe('FindAllUserIdsByTeamIdUseCase', () => {
  let useCase: FindAllUserIdsByTeamIdUseCase;
  let teamMembersRepository: { findByTeamId: jest.Mock };

  beforeEach(async () => {
    teamMembersRepository = {
      findByTeamId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllUserIdsByTeamIdUseCase,
        {
          provide: TeamMembersRepository,
          useValue: teamMembersRepository,
        },
      ],
    }).compile();

    useCase = module.get<FindAllUserIdsByTeamIdUseCase>(
      FindAllUserIdsByTeamIdUseCase,
    );
  });

  it('should return all user IDs for a team', async () => {
    const teamId = randomUUID();
    const userId1 = randomUUID();
    const userId2 = randomUUID();

    const members = [
      new TeamMember({ teamId, userId: userId1 }),
      new TeamMember({ teamId, userId: userId2 }),
    ];

    teamMembersRepository.findByTeamId.mockResolvedValue(
      new Paginated({ data: members, total: 2, limit: 1000, offset: 0 }),
    );

    const result = await useCase.execute(
      new FindAllUserIdsByTeamIdQuery(teamId),
    );

    expect(result).toEqual([userId1, userId2]);
    expect(teamMembersRepository.findByTeamId).toHaveBeenCalledWith(teamId, {
      limit: 1000,
      offset: 0,
    });
  });

  it('should return empty array when team has no members', async () => {
    const teamId = randomUUID();

    teamMembersRepository.findByTeamId.mockResolvedValue(
      new Paginated({ data: [], total: 0, limit: 1000, offset: 0 }),
    );

    const result = await useCase.execute(
      new FindAllUserIdsByTeamIdQuery(teamId),
    );

    expect(result).toEqual([]);
  });
});
