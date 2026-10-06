jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DeleteTeamPermittedModelUseCase } from './delete-team-permitted-model.use-case';
import { DeleteTeamPermittedModelCommand } from './delete-team-permitted-model.command';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
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
} from 'src/domain/models/application/models.errors';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { randomUUID } from 'crypto';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';
import { DeleteUserDefaultModelsByModelIdUseCase } from 'src/domain/models/application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { DeleteUserDefaultModelsByModelIdCommand } from 'src/domain/models/application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.command';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultCommand } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.command';
import { DefaultModelNotFoundError } from 'src/domain/models/application/models.errors';

describe('DeleteTeamPermittedModelUseCase', () => {
  let useCase: DeleteTeamPermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let getTeamUseCase: jest.Mocked<GetTeamUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let deleteUserDefaultModelsByModelIdUseCase: jest.Mocked<DeleteUserDefaultModelsByModelIdUseCase>;
  let replaceModelWithUserDefaultUseCase: jest.Mocked<ReplaceModelWithUserDefaultUseCase>;

  const orgId = randomUUID();

  const userId = randomUUID();
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
      delete: jest.fn(),
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

    deleteUserDefaultModelsByModelIdUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteUserDefaultModelsByModelIdUseCase>;

    replaceModelWithUserDefaultUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ReplaceModelWithUserDefaultUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTeamPermittedModelUseCase,
        TeamPermittedModelValidator,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: GetTeamUseCase, useValue: getTeamUseCase },
        { provide: ContextService, useValue: contextService },
        {
          provide: DeleteUserDefaultModelsByModelIdUseCase,
          useValue: deleteUserDefaultModelsByModelIdUseCase,
        },
        {
          provide: ReplaceModelWithUserDefaultUseCase,
          useValue: replaceModelWithUserDefaultUseCase,
        },
      ],
    }).compile();

    useCase = module.get(DeleteTeamPermittedModelUseCase);
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  }

  it('should delete a team permitted model successfully', async () => {
    setAdminContext();
    const permittedModel = new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelsRepository.findOne.mockResolvedValue(permittedModel);
    permittedModelsRepository.delete.mockResolvedValue(undefined);

    const command = new DeleteTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
    );
    await useCase.execute(command);

    expect(permittedModelsRepository.findOne).toHaveBeenCalledWith({
      id: permittedModelId,
      orgId,
    });
    expect(permittedModelsRepository.delete).toHaveBeenCalledWith({
      id: permittedModelId,
      orgId,
    });
  });

  it('should move threads off the deleted team model before deleting it', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(
      new PermittedLanguageModel({
        id: permittedModelId,
        model: languageModel,
        orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
      }),
    );

    await useCase.execute(
      new DeleteTeamPermittedModelCommand(permittedModelId, orgId, teamId),
    );

    expect(
      deleteUserDefaultModelsByModelIdUseCase.execute,
    ).toHaveBeenCalledWith(
      new DeleteUserDefaultModelsByModelIdCommand(permittedModelId),
    );
    expect(replaceModelWithUserDefaultUseCase.execute).toHaveBeenCalledWith(
      new ReplaceModelWithUserDefaultCommand({
        orgId,
        oldPermittedModelId: permittedModelId,
      }),
    );
    const deleteOrder =
      permittedModelsRepository.delete.mock.invocationCallOrder[0];
    expect(
      deleteUserDefaultModelsByModelIdUseCase.execute.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      replaceModelWithUserDefaultUseCase.execute.mock.invocationCallOrder[0],
    );
    expect(
      replaceModelWithUserDefaultUseCase.execute.mock.invocationCallOrder[0],
    ).toBeLessThan(deleteOrder);
  });

  it('should not delete the team model when threads cannot fall back to another model', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(
      new PermittedLanguageModel({
        id: permittedModelId,
        model: languageModel,
        orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
      }),
    );
    replaceModelWithUserDefaultUseCase.execute.mockRejectedValue(
      new DefaultModelNotFoundError(orgId),
    );

    await expect(
      useCase.execute(
        new DeleteTeamPermittedModelCommand(permittedModelId, orgId, teamId),
      ),
    ).rejects.toThrow(DefaultModelNotFoundError);
    expect(permittedModelsRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessError for non-admin users', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    const command = new DeleteTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw TeamNotFoundInOrgError when team does not exist in org', async () => {
    setAdminContext();
    getTeamUseCase.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    const command = new DeleteTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      TeamNotFoundInOrgError,
    );
  });

  it('should throw PermittedModelNotFoundError when model not found', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(null);

    const command = new DeleteTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      PermittedModelNotFoundError,
    );
  });

  it('should throw PermittedModelNotInTeamError when model belongs to different team', async () => {
    setAdminContext();
    const otherTeamId = randomUUID();
    const otherTeamModel = new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: otherTeamId,
    });
    permittedModelsRepository.findOne.mockResolvedValue(otherTeamModel);

    const command = new DeleteTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      PermittedModelNotInTeamError,
    );
  });

  it('should throw PermittedModelNotInTeamError when model is org-scoped', async () => {
    setAdminContext();
    const orgScopedModel = new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      scope: PermittedModelScope.ORG,
    });
    permittedModelsRepository.findOne.mockResolvedValue(orgScopedModel);

    const command = new DeleteTeamPermittedModelCommand(
      permittedModelId,
      orgId,
      teamId,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      PermittedModelNotInTeamError,
    );
  });
});
