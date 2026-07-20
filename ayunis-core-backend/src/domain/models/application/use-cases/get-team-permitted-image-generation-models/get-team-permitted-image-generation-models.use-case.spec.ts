import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetTeamPermittedImageGenerationModelsUseCase } from './get-team-permitted-image-generation-models.use-case';
import { GetTeamPermittedImageGenerationModelsQuery } from './get-team-permitted-image-generation-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamNotFoundInOrgError } from '../../models.errors';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { randomUUID } from 'crypto';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

describe('GetTeamPermittedImageGenerationModelsUseCase', () => {
  let useCase: GetTeamPermittedImageGenerationModelsUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let getTeamUseCase: jest.Mocked<GetTeamUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const teamId = randomUUID();

  beforeEach(async () => {
    permittedModelsRepository = {
      findManyImageGenerationByTeam: jest.fn(),
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
        GetTeamPermittedImageGenerationModelsUseCase,
        TeamPermittedModelValidator,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: GetTeamUseCase, useValue: getTeamUseCase },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(GetTeamPermittedImageGenerationModelsUseCase);
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  }

  it('should return team permitted image-generation models for an admin', async () => {
    setAdminContext();
    const imageModel = new ImageGenerationModel({
      id: randomUUID(),
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
    });
    const permittedModel = new PermittedImageGenerationModel({
      model: imageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelsRepository.findManyImageGenerationByTeam.mockResolvedValue([
      permittedModel,
    ]);

    const query = new GetTeamPermittedImageGenerationModelsQuery(teamId, orgId);
    const result = await useCase.execute(query);

    expect(result).toEqual([permittedModel]);
    expect(getTeamUseCase.execute).toHaveBeenCalled();
    expect(
      permittedModelsRepository.findManyImageGenerationByTeam,
    ).toHaveBeenCalledWith(teamId, orgId);
  });

  it('should throw UnauthorizedAccessError for non-admin users', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    const query = new GetTeamPermittedImageGenerationModelsQuery(teamId, orgId);
    await expect(useCase.execute(query)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw TeamNotFoundInOrgError when team does not exist in org', async () => {
    setAdminContext();
    getTeamUseCase.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    const query = new GetTeamPermittedImageGenerationModelsQuery(teamId, orgId);
    await expect(useCase.execute(query)).rejects.toThrow(
      TeamNotFoundInOrgError,
    );
  });
});
