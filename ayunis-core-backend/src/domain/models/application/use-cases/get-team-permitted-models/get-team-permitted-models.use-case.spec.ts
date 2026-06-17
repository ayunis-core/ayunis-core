import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetTeamPermittedModelsUseCase } from './get-team-permitted-models.use-case';
import { GetTeamPermittedModelsQuery } from './get-team-permitted-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamNotFoundInOrgError } from '../../models.errors';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { randomUUID } from 'crypto';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

describe('GetTeamPermittedModelsUseCase', () => {
  let useCase: GetTeamPermittedModelsUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let getTeamUseCase: jest.Mocked<GetTeamUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const teamId = randomUUID();

  beforeEach(async () => {
    permittedModelsRepository = {
      findManyLanguageByTeam: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;

    getTeamUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue(
          new Team({ name: 'test-team', orgId, modelOverrideEnabled: false }),
        ),
    } as unknown as jest.Mocked<GetTeamUseCase>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTeamPermittedModelsUseCase,
        TeamPermittedModelValidator,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: GetTeamUseCase, useValue: getTeamUseCase },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(GetTeamPermittedModelsUseCase);
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  }

  it('should return team permitted models for an admin', async () => {
    setAdminContext();
    const languageModel = new LanguageModel({
      id: randomUUID(),
      name: 'gpt-4o',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4o',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: true,
      isArchived: false,
    });
    const permittedModel = new PermittedLanguageModel({
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelsRepository.findManyLanguageByTeam.mockResolvedValue([
      permittedModel,
    ]);

    const query = new GetTeamPermittedModelsQuery(teamId, orgId);
    const result = await useCase.execute(query);

    expect(result).toEqual([permittedModel]);
    expect(getTeamUseCase.execute).toHaveBeenCalled();
    expect(
      permittedModelsRepository.findManyLanguageByTeam,
    ).toHaveBeenCalledWith(teamId, orgId);
  });

  it('should throw UnauthorizedAccessError for non-admin users', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    const query = new GetTeamPermittedModelsQuery(teamId, orgId);
    await expect(useCase.execute(query)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw TeamNotFoundInOrgError when team does not exist in org', async () => {
    setAdminContext();
    getTeamUseCase.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    const query = new GetTeamPermittedModelsQuery(teamId, orgId);
    await expect(useCase.execute(query)).rejects.toThrow(
      TeamNotFoundInOrgError,
    );
  });
});
