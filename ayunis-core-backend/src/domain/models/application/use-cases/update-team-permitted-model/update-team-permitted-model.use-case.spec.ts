import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { randomUUID } from 'crypto';
import {
  PermittedModelNotFoundError,
  PermittedModelNotInTeamError,
  TeamNotFoundInOrgError,
} from '../../models.errors';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';
import { UpdateTeamPermittedModelCommand } from './update-team-permitted-model.command';
import { UpdateTeamPermittedModelUseCase } from './update-team-permitted-model.use-case';

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
      execute: jest.fn().mockResolvedValue(
        new Team({
          name: 'Digital Services',
          orgId,
          modelOverrideEnabled: false,
        }),
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

  function makeTeamModel(params?: {
    anonymousOnly?: boolean;
    internetAccessEnabled?: boolean;
  }): PermittedLanguageModel {
    return new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
      anonymousOnly: params?.anonymousOnly,
      internetAccessEnabled: params?.internetAccessEnabled,
    });
  }

  it('updates anonymous mode without overwriting internet access', async () => {
    setAdminContext();
    const updated = makeTeamModel({
      anonymousOnly: true,
      internetAccessEnabled: false,
    });
    permittedModelsRepository.findOne.mockResolvedValue(
      makeTeamModel({ internetAccessEnabled: false }),
    );
    permittedModelsRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(
      new UpdateTeamPermittedModelCommand({
        permittedModelId,
        orgId,
        teamId,
        anonymousOnly: true,
      }),
    );

    expect(result).toBe(updated);
    expect(permittedModelsRepository.update).toHaveBeenCalledWith({
      id: permittedModelId,
      orgId,
      anonymousOnly: true,
    });
  });

  it('updates internet access without overwriting anonymous mode', async () => {
    setAdminContext();
    const updated = makeTeamModel({
      anonymousOnly: true,
      internetAccessEnabled: false,
    });
    permittedModelsRepository.findOne.mockResolvedValue(
      makeTeamModel({ anonymousOnly: true }),
    );
    permittedModelsRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(
      new UpdateTeamPermittedModelCommand({
        permittedModelId,
        orgId,
        teamId,
        internetAccessEnabled: false,
      }),
    );

    expect(result).toBe(updated);
    expect(permittedModelsRepository.update).toHaveBeenCalledWith({
      id: permittedModelId,
      orgId,
      internetAccessEnabled: false,
    });
  });

  it('rejects non-admin users', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    await expect(
      useCase.execute(
        new UpdateTeamPermittedModelCommand({
          permittedModelId,
          orgId,
          teamId,
          anonymousOnly: true,
        }),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('rejects a team outside the organization', async () => {
    setAdminContext();
    getTeamUseCase.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    await expect(
      useCase.execute(
        new UpdateTeamPermittedModelCommand({
          permittedModelId,
          orgId,
          teamId,
          anonymousOnly: true,
        }),
      ),
    ).rejects.toThrow(TeamNotFoundInOrgError);
  });

  it('rejects a missing permitted model', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateTeamPermittedModelCommand({
          permittedModelId,
          orgId,
          teamId,
          anonymousOnly: true,
        }),
      ),
    ).rejects.toThrow(PermittedModelNotFoundError);
  });

  it('rejects a permitted model assigned to another team', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(
      new PermittedLanguageModel({
        id: permittedModelId,
        model: languageModel,
        orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: randomUUID(),
      }),
    );

    await expect(
      useCase.execute(
        new UpdateTeamPermittedModelCommand({
          permittedModelId,
          orgId,
          teamId,
          anonymousOnly: true,
        }),
      ),
    ).rejects.toThrow(PermittedModelNotInTeamError);
  });
});
