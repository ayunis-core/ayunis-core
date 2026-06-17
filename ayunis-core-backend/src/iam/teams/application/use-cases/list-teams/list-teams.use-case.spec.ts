import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ListTeamsUseCase } from './list-teams.use-case';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { Team } from '../../../domain/team.entity';
import { UnexpectedTeamError } from '../../teams.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';

describe('ListTeamsUseCase', () => {
  let useCase: ListTeamsUseCase;
  let mockTeamsRepository: Partial<TeamsRepository>;
  let mockTeamMembersRepository: Partial<TeamMembersRepository>;
  let mockContextService: Partial<ContextService>;

  const mockOrgId = 'org-123' as UUID;

  beforeAll(async () => {
    mockTeamsRepository = {
      findByOrgId: jest.fn(),
    };

    mockTeamMembersRepository = {
      countByTeamIds: jest.fn(),
    };

    mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListTeamsUseCase,
        { provide: TeamsRepository, useValue: mockTeamsRepository },
        {
          provide: TeamMembersRepository,
          useValue: mockTeamMembersRepository,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ListTeamsUseCase>(ListTeamsUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      jest.spyOn(mockContextService, 'get').mockReturnValue(mockOrgId);
    });

    it('should return empty array when no teams exist', async () => {
      jest.spyOn(mockTeamsRepository, 'findByOrgId').mockResolvedValue([]);
      jest
        .spyOn(mockTeamMembersRepository, 'countByTeamIds')
        .mockResolvedValue(new Map());

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(mockTeamsRepository.findByOrgId).toHaveBeenCalledWith(mockOrgId);
      expect(mockTeamMembersRepository.countByTeamIds).toHaveBeenCalledWith([]);
    });

    it('should return teams with their member counts', async () => {
      const mockTeams = [
        new Team({ name: 'Engineering', orgId: mockOrgId }),
        new Team({ name: 'Product', orgId: mockOrgId }),
        new Team({ name: 'Design', orgId: mockOrgId }),
      ];
      const counts = new Map<UUID, number>([
        [mockTeams[0].id, 3],
        [mockTeams[1].id, 1],
      ]);

      jest
        .spyOn(mockTeamsRepository, 'findByOrgId')
        .mockResolvedValue(mockTeams);
      jest
        .spyOn(mockTeamMembersRepository, 'countByTeamIds')
        .mockResolvedValue(counts);

      const result = await useCase.execute();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ team: mockTeams[0], memberCount: 3 });
      expect(result[1]).toEqual({ team: mockTeams[1], memberCount: 1 });
      expect(result[2]).toEqual({ team: mockTeams[2], memberCount: 0 });
      expect(mockTeamMembersRepository.countByTeamIds).toHaveBeenCalledWith(
        mockTeams.map((team) => team.id),
      );
    });

    it('should throw UnexpectedTeamError when repository throws unexpected error', async () => {
      jest
        .spyOn(mockTeamsRepository, 'findByOrgId')
        .mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute()).rejects.toThrow(UnexpectedTeamError);
    });
  });

  describe('when user is not authenticated', () => {
    it('should throw UnauthorizedAccessError when orgId is not in context', async () => {
      jest.spyOn(mockContextService, 'get').mockReturnValue(undefined);

      await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
      expect(mockTeamsRepository.findByOrgId).not.toHaveBeenCalled();
    });
  });
});
