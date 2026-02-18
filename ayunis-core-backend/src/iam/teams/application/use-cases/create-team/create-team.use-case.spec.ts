import { Test, TestingModule } from '@nestjs/testing';
import { CreateTeamUseCase } from './create-team.use-case';
import { CreateTeamCommand } from './create-team.command';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import {
  TeamInvalidInputError,
  TeamNameAlreadyExistsError,
  UnexpectedTeamError,
} from '../../teams.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';

describe('CreateTeamUseCase', () => {
  let useCase: CreateTeamUseCase;
  let mockTeamsRepository: Partial<TeamsRepository>;
  let mockContextService: Partial<ContextService>;

  const mockOrgId = 'org-123' as UUID;

  beforeEach(async () => {
    mockTeamsRepository = {
      findByNameAndOrgId: jest.fn(),
      create: jest.fn(),
    };

    mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTeamUseCase,
        { provide: TeamsRepository, useValue: mockTeamsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CreateTeamUseCase>(CreateTeamUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      jest.spyOn(mockContextService, 'get').mockReturnValue(mockOrgId);
    });

    it('should create a team successfully', async () => {
      const command = new CreateTeamCommand('Engineering');
      const mockTeam = new Team({
        name: 'Engineering',
        orgId: mockOrgId,
      });

      jest
        .spyOn(mockTeamsRepository, 'findByNameAndOrgId')
        .mockResolvedValue(null);
      jest.spyOn(mockTeamsRepository, 'create').mockResolvedValue(mockTeam);

      const result = await useCase.execute(command);

      expect(result.name).toBe('Engineering');
      expect(result.orgId).toBe(mockOrgId);
      expect(mockTeamsRepository.findByNameAndOrgId).toHaveBeenCalledWith(
        'Engineering',
        mockOrgId,
      );
      expect(mockTeamsRepository.create).toHaveBeenCalled();
    });

    it('should throw TeamNameAlreadyExistsError when team name already exists in org', async () => {
      const command = new CreateTeamCommand('Engineering');
      const existingTeam = new Team({
        name: 'Engineering',
        orgId: mockOrgId,
      });

      jest
        .spyOn(mockTeamsRepository, 'findByNameAndOrgId')
        .mockResolvedValue(existingTeam);

      await expect(useCase.execute(command)).rejects.toThrow(
        TeamNameAlreadyExistsError,
      );
      expect(mockTeamsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw TeamInvalidInputError when name is empty', async () => {
      const command = new CreateTeamCommand('');

      await expect(useCase.execute(command)).rejects.toThrow(
        TeamInvalidInputError,
      );
      expect(mockTeamsRepository.findByNameAndOrgId).not.toHaveBeenCalled();
      expect(mockTeamsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw TeamInvalidInputError when name is only whitespace', async () => {
      const command = new CreateTeamCommand('   ');

      await expect(useCase.execute(command)).rejects.toThrow(
        TeamInvalidInputError,
      );
      expect(mockTeamsRepository.findByNameAndOrgId).not.toHaveBeenCalled();
      expect(mockTeamsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw UnexpectedTeamError when repository throws unexpected error', async () => {
      const command = new CreateTeamCommand('Engineering');

      jest
        .spyOn(mockTeamsRepository, 'findByNameAndOrgId')
        .mockResolvedValue(null);
      jest
        .spyOn(mockTeamsRepository, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedTeamError,
      );
    });
  });

  describe('when user is not authenticated', () => {
    it('should throw UnauthorizedAccessError when orgId is not in context', async () => {
      jest.spyOn(mockContextService, 'get').mockReturnValue(undefined);
      const command = new CreateTeamCommand('Engineering');

      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedAccessError,
      );
      expect(mockTeamsRepository.findByNameAndOrgId).not.toHaveBeenCalled();
      expect(mockTeamsRepository.create).not.toHaveBeenCalled();
    });
  });
});
