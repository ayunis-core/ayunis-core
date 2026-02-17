import { Test, TestingModule } from '@nestjs/testing';
import { FindAllUserIdsByTeamIdUseCase } from './find-all-user-ids-by-team-id.use-case';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { FindAllUserIdsByTeamIdQuery } from './find-all-user-ids-by-team-id.query';
import { randomUUID } from 'crypto';

describe('FindAllUserIdsByTeamIdUseCase', () => {
  let useCase: FindAllUserIdsByTeamIdUseCase;
  let teamMembersRepository: { findAllUserIdsByTeamId: jest.Mock };

  beforeEach(async () => {
    teamMembersRepository = {
      findAllUserIdsByTeamId: jest.fn(),
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

    teamMembersRepository.findAllUserIdsByTeamId.mockResolvedValue([
      userId1,
      userId2,
    ]);

    const result = await useCase.execute(
      new FindAllUserIdsByTeamIdQuery(teamId),
    );

    expect(result).toEqual([userId1, userId2]);
    expect(teamMembersRepository.findAllUserIdsByTeamId).toHaveBeenCalledWith(
      teamId,
    );
  });

  it('should return empty array when team has no members', async () => {
    const teamId = randomUUID();

    teamMembersRepository.findAllUserIdsByTeamId.mockResolvedValue([]);

    const result = await useCase.execute(
      new FindAllUserIdsByTeamIdQuery(teamId),
    );

    expect(result).toEqual([]);
  });
});
