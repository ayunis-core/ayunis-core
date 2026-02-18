import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ListTeamsUseCase } from './list-teams.use-case';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import { UnexpectedTeamError } from '../../teams.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';

describe('ListTeamsUseCase', () => {
  let useCase: ListTeamsUseCase;
  let mockTeamsRepository: Partial<TeamsRepository>;
  let mockContextService: Partial<ContextService>;

  const mockOrgId = 'org-123' as UUID;

  beforeEach(async () => {
    mockTeamsRepository = {
      findByOrgId: jest.fn(),
    };

    mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListTeamsUseCase,
        { provide: TeamsRepository, useValue: mockTeamsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ListTeamsUseCase>(ListTeamsUseCase);
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

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(mockTeamsRepository.findByOrgId).toHaveBeenCalledWith(mockOrgId);
    });

    it('should return list of teams for the organization', async () => {
      const mockTeams = [
        new Team({ name: 'Engineering', orgId: mockOrgId }),
        new Team({ name: 'Product', orgId: mockOrgId }),
        new Team({ name: 'Design', orgId: mockOrgId }),
      ];

      jest
        .spyOn(mockTeamsRepository, 'findByOrgId')
        .mockResolvedValue(mockTeams);

      const result = await useCase.execute();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Engineering');
      expect(result[1].name).toBe('Product');
      expect(result[2].name).toBe('Design');
      expect(mockTeamsRepository.findByOrgId).toHaveBeenCalledWith(mockOrgId);
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
