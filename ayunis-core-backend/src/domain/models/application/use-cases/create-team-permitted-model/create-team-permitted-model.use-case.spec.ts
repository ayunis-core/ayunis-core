import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateTeamPermittedModelUseCase } from './create-team-permitted-model.use-case';
import { CreateTeamPermittedModelCommand } from './create-team-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelsRepository } from '../../ports/models.repository';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateTeamPermittedModelError,
  ModelNotFoundError,
  NotALanguageModelError,
  TeamNotFoundInOrgError,
  UnexpectedModelError,
} from '../../models.errors';
import {
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { randomUUID } from 'crypto';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

describe('CreateTeamPermittedModelUseCase', () => {
  let useCase: CreateTeamPermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let modelsRepository: jest.Mocked<ModelsRepository>;
  let getTeamUseCase: jest.Mocked<GetTeamUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const teamId = randomUUID();
  const modelId = randomUUID();

  const languageModel = new LanguageModel({
    id: modelId,
    name: 'gpt-4o',
    provider: ModelProvider.OPENAI,
    displayName: 'GPT-4o',
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: true,
    isArchived: false,
  });

  beforeEach(async () => {
    permittedModelsRepository = {
      findAll: jest.fn(),
      findByTeamAndModelId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;

    modelsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ModelsRepository>;

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
        CreateTeamPermittedModelUseCase,
        TeamPermittedModelValidator,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: ModelsRepository, useValue: modelsRepository },
        { provide: GetTeamUseCase, useValue: getTeamUseCase },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(CreateTeamPermittedModelUseCase);
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  }

  function setupOrgPermitted(): void {
    const orgPermittedModel = new PermittedModel({
      model: languageModel,
      orgId,
      scope: PermittedModelScope.ORG,
    });
    permittedModelsRepository.findAll.mockResolvedValue([orgPermittedModel]);
  }

  it('should create a team permitted model successfully', async () => {
    setAdminContext();
    setupOrgPermitted();
    permittedModelsRepository.findByTeamAndModelId.mockResolvedValue(null);
    modelsRepository.findOne.mockResolvedValue(languageModel);
    const created = new PermittedLanguageModel({
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelsRepository.create.mockResolvedValue(created);

    const command = new CreateTeamPermittedModelCommand(modelId, orgId, teamId);
    const result = await useCase.execute(command);

    expect(result).toBe(created);
    expect(getTeamUseCase.execute).toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessError for non-admin users', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    const command = new CreateTeamPermittedModelCommand(modelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw TeamNotFoundInOrgError when team does not exist in org', async () => {
    setAdminContext();
    getTeamUseCase.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    const command = new CreateTeamPermittedModelCommand(modelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(
      TeamNotFoundInOrgError,
    );
  });

  it('should throw DuplicateTeamPermittedModelError when model already permitted for team', async () => {
    setAdminContext();
    setupOrgPermitted();
    const existing = new PermittedLanguageModel({
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelsRepository.findByTeamAndModelId.mockResolvedValue(existing);

    const command = new CreateTeamPermittedModelCommand(modelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(
      DuplicateTeamPermittedModelError,
    );
  });

  it('should throw ModelNotFoundError when model is not org-permitted', async () => {
    setAdminContext();
    permittedModelsRepository.findAll.mockResolvedValue([]);

    const command = new CreateTeamPermittedModelCommand(modelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(ModelNotFoundError);
  });

  it('should wrap unexpected errors in UnexpectedModelError', async () => {
    setAdminContext();
    setupOrgPermitted();
    permittedModelsRepository.findByTeamAndModelId.mockResolvedValue(null);
    modelsRepository.findOne.mockRejectedValue(new Error('DB connection lost'));

    const command = new CreateTeamPermittedModelCommand(modelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedModelError,
    );
  });

  it('should throw NotALanguageModelError when model is an embedding model', async () => {
    setAdminContext();
    setupOrgPermitted();
    permittedModelsRepository.findByTeamAndModelId.mockResolvedValue(null);
    const embeddingModel = new EmbeddingModel({
      id: modelId,
      name: 'text-embedding-3-large',
      provider: ModelProvider.OPENAI,
      displayName: 'Text Embedding 3 Large',
      isArchived: false,
      dimensions: EmbeddingDimensions.DIMENSION_1536,
    });
    modelsRepository.findOne.mockResolvedValue(embeddingModel);

    const command = new CreateTeamPermittedModelCommand(modelId, orgId, teamId);
    await expect(useCase.execute(command)).rejects.toThrow(
      NotALanguageModelError,
    );
  });
});
