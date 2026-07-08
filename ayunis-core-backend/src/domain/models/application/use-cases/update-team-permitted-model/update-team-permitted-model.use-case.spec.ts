import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateTeamPermittedModelUseCase } from './update-team-permitted-model.use-case';
import { UpdateTeamPermittedModelCommand } from './update-team-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  PermittedModelNotFoundError,
  PermittedModelNotInTeamError,
  TeamNotFoundInOrgError,
} from '../../models.errors';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { randomUUID } from 'crypto';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

describe('UpdateTeamPermittedModelUseCase', () => {
  let useCase: UpdateTeamPermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let getTeamUseCase: jest.Mocked<GetTeamUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const teamId = randomUUID();
  const permittedModelId = randomUUID();

  const languageModel = new LanguageModel({
    id: randomUUID(),
    name: 'claude-3-5-sonnet',
    provider: ModelProvider.ANTHROPIC,
    displayName: 'Claude 3.5 Sonnet',
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: true,
    isArchived: false,
  });

  beforeEach(async () => {
    permittedModelsRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
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
        UpdateTeamPermittedModelUseCase,
        TeamPermittedModelValidator,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: GetTeamUseCase, useValue: getTeamUseCase },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(UpdateTeamPermittedModelUseCase);
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  }

  function makeTeamModel(anonymousOnly: boolean): PermittedLanguageModel {
    return new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
      anonymousOnly,
    });
  }

  it('should update anonymousOnly on a team permitted model', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(makeTeamModel(false));
    permittedModelsRepository.update.mockImplementation((model) =>
      Promise.resolve(model),
    );

    const command = new UpdateTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
      true,
    );
    const result = await useCase.execute(command);

    expect(result.anonymousOnly).toBe(true);
    expect(result.scope).toBe(PermittedModelScope.TEAM);
    expect(result.scopeId).toBe(teamId);
    const updateArg = permittedModelsRepository.update.mock.calls[0][0];
    expect(updateArg.id).toBe(permittedModelId);
    expect(updateArg.anonymousOnly).toBe(true);
  });

  it('should throw UnauthorizedAccessError for non-admin users', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    const command = new UpdateTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
      true,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw TeamNotFoundInOrgError when team does not exist in org', async () => {
    setAdminContext();
    getTeamUseCase.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    const command = new UpdateTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
      true,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      TeamNotFoundInOrgError,
    );
  });

  it('should throw PermittedModelNotFoundError when model not found', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(null);

    const command = new UpdateTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
      true,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      PermittedModelNotFoundError,
    );
  });

  it('should throw PermittedModelNotInTeamError when model belongs to different team', async () => {
    setAdminContext();
    const otherTeamModel = new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: randomUUID(),
    });
    permittedModelsRepository.findOne.mockResolvedValue(otherTeamModel);

    const command = new UpdateTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
      true,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      PermittedModelNotInTeamError,
    );
  });
});
