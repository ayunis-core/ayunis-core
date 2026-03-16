import { Test, TestingModule } from '@nestjs/testing';
import { DeleteTeamPermittedModelUseCase } from './delete-team-permitted-model.use-case';
import { DeleteTeamPermittedModelCommand } from './delete-team-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { TeamValidationPort } from '../../ports/team-validation.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  PermittedModelDeletionFailedError,
  TeamNotFoundInOrgError,
} from '../../models.errors';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { UUID, randomUUID } from 'crypto';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

describe('DeleteTeamPermittedModelUseCase', () => {
  let useCase: DeleteTeamPermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let teamValidationPort: jest.Mocked<TeamValidationPort>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID() as UUID;
  const teamId = randomUUID() as UUID;
  const permittedModelId = randomUUID() as UUID;

  const languageModel = new LanguageModel({
    id: randomUUID() as UUID,
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

    teamValidationPort = {
      existsInOrg: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<TeamValidationPort>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTeamPermittedModelUseCase,
        TeamPermittedModelValidator,
        { provide: PermittedModelsRepository, useValue: permittedModelsRepository },
        { provide: TeamValidationPort, useValue: teamValidationPort },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(DeleteTeamPermittedModelUseCase);
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
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
      teamId,
    });
    permittedModelsRepository.findOne.mockResolvedValue(permittedModel);
    permittedModelsRepository.delete.mockResolvedValue(undefined);

    const command = new DeleteTeamPermittedModelCommand(permittedModelId, orgId, teamId);
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

  it('should throw UnauthorizedAccessError for non-admin users', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    const command = new DeleteTeamPermittedModelCommand(permittedModelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(UnauthorizedAccessError);
  });

  it('should throw TeamNotFoundInOrgError when team does not exist in org', async () => {
    setAdminContext();
    teamValidationPort.existsInOrg.mockResolvedValue(false);

    const command = new DeleteTeamPermittedModelCommand(permittedModelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(TeamNotFoundInOrgError);
  });

  it('should throw PermittedModelDeletionFailedError when model not found', async () => {
    setAdminContext();
    permittedModelsRepository.findOne.mockResolvedValue(null);

    const command = new DeleteTeamPermittedModelCommand(permittedModelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(PermittedModelDeletionFailedError);
  });

  it('should throw PermittedModelDeletionFailedError when model belongs to different team', async () => {
    setAdminContext();
    const otherTeamId = randomUUID() as UUID;
    const otherTeamModel = new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      teamId: otherTeamId,
    });
    permittedModelsRepository.findOne.mockResolvedValue(otherTeamModel);

    const command = new DeleteTeamPermittedModelCommand(permittedModelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(PermittedModelDeletionFailedError);
  });
});
