import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { getLoggerToken } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import {
  DuplicateTeamPermittedModelError,
  ModelArchivedError,
  ModelNotConfiguredError,
  ModelNotFoundError,
  ModelNotRestrictableForTeamError,
  MultipleTeamImageGenerationModelsNotAllowedError,
  TeamNotFoundInOrgError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { ModelProviderInfoRegistry } from 'src/domain/models/application/registry/model-provider-info.registry';
import { ModelConfigurationService } from 'src/domain/models/application/services/model-configuration.service';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';
import { CreateTeamPermittedModelCommand } from 'src/domain/models/application/use-cases/create-team-permitted-model/create-team-permitted-model.command';
import { CreateTeamPermittedModelUseCase } from 'src/domain/models/application/use-cases/create-team-permitted-model/create-team-permitted-model.use-case';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  PermittedImageGenerationModel,
  PermittedLanguageModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const orgId = randomUUID();
const teamId = randomUUID();
const modelId = randomUUID();

const createLanguageModel = (isArchived = false): LanguageModel =>
  new LanguageModel({
    id: modelId,
    name: 'municipal-assistant',
    provider: ModelProvider.OPENAI,
    displayName: 'Municipal Assistant',
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: true,
    isArchived,
  });

const createImageModel = (): ImageGenerationModel =>
  new ImageGenerationModel({
    id: modelId,
    name: 'municipal-image-generator',
    provider: ModelProvider.AZURE,
    displayName: 'Municipal Image Generator',
    isArchived: false,
  });

describe('CreateTeamPermittedModelUseCase', () => {
  let useCase: CreateTeamPermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let modelsRepository: jest.Mocked<ModelsRepository>;
  let getTeamUseCase: jest.Mocked<GetTeamUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    permittedModelsRepository = {
      createTeamScoped: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;
    modelsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ModelsRepository>;
    getTeamUseCase = {
      execute: jest.fn().mockResolvedValue(
        new Team({
          name: 'Public Services',
          orgId,
          modelOverrideEnabled: false,
        }),
      ),
    } as unknown as jest.Mocked<GetTeamUseCase>;
    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;
    configService = {
      get: jest.fn().mockReturnValue('configured-provider-key'),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getLoggerToken(CreateTeamPermittedModelUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        CreateTeamPermittedModelUseCase,
        TeamPermittedModelValidator,
        ModelConfigurationService,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: ModelsRepository, useValue: modelsRepository },
        { provide: GetTeamUseCase, useValue: getTeamUseCase },
        { provide: ContextService, useValue: contextService },
        { provide: ConfigService, useValue: configService },
        {
          provide: ModelProviderInfoRegistry,
          useValue: {
            getConfigKey: jest
              .fn()
              .mockImplementation(
                (provider: ModelProvider) => `models.${provider}.apiKey`,
              ),
          },
        },
      ],
    }).compile();

    useCase = module.get(CreateTeamPermittedModelUseCase);
    setAdminContext();
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  }

  it('creates a team-only language grant without an organization permit', async () => {
    const languageModel = createLanguageModel();
    const created = new PermittedLanguageModel({
      model: languageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    modelsRepository.findOne.mockResolvedValue(languageModel);
    permittedModelsRepository.createTeamScoped.mockResolvedValue(created);

    const result = await useCase.execute(
      new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
    );

    expect(result).toBe(created);
    expect(permittedModelsRepository.createTeamScoped).toHaveBeenCalledWith(
      expect.objectContaining({
        model: languageModel,
        orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
      }),
    );
  });

  it('creates a team-only image-generation grant without an organization permit', async () => {
    const imageModel = createImageModel();
    const created = new PermittedImageGenerationModel({
      model: imageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    modelsRepository.findOne.mockResolvedValue(imageModel);
    permittedModelsRepository.createTeamScoped.mockResolvedValue(created);

    const result = await useCase.execute(
      new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
    );

    expect(result).toBe(created);
  });

  it('rejects embedding model grants', async () => {
    const embeddingModel = new EmbeddingModel({
      id: modelId,
      name: 'municipal-document-embeddings',
      provider: ModelProvider.OPENAI,
      displayName: 'Municipal Document Embeddings',
      isArchived: false,
      dimensions: EmbeddingDimensions.DIMENSION_1536,
    });
    modelsRepository.findOne.mockResolvedValue(embeddingModel);

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(ModelNotRestrictableForTeamError);
    expect(permittedModelsRepository.createTeamScoped).not.toHaveBeenCalled();
  });

  it('rejects archived catalog models', async () => {
    modelsRepository.findOne.mockResolvedValue(createLanguageModel(true));

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(ModelArchivedError);
    expect(permittedModelsRepository.createTeamScoped).not.toHaveBeenCalled();
  });

  it('rejects catalog models whose provider is not configured', async () => {
    modelsRepository.findOne.mockResolvedValue(createLanguageModel());
    configService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(ModelNotConfiguredError);
    expect(permittedModelsRepository.createTeamScoped).not.toHaveBeenCalled();
  });

  it('preserves duplicate-grant persistence conflicts as typed errors', async () => {
    modelsRepository.findOne.mockResolvedValue(createLanguageModel());
    permittedModelsRepository.createTeamScoped.mockRejectedValue(
      new DuplicateTeamPermittedModelError(teamId, modelId),
    );

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(DuplicateTeamPermittedModelError);
  });

  it('preserves second-image persistence conflicts as typed errors', async () => {
    modelsRepository.findOne.mockResolvedValue(createImageModel());
    permittedModelsRepository.createTeamScoped.mockRejectedValue(
      new MultipleTeamImageGenerationModelsNotAllowedError(teamId),
    );

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(MultipleTeamImageGenerationModelsNotAllowedError);
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
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('rejects teams outside the target organization', async () => {
    getTeamUseCase.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(TeamNotFoundInOrgError);
  });

  it('rejects missing catalog models', async () => {
    modelsRepository.findOne.mockResolvedValue(undefined);

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(ModelNotFoundError);
  });

  it('wraps unexpected catalog persistence failures', async () => {
    modelsRepository.findOne.mockRejectedValue(
      new Error('catalog database unavailable'),
    );

    await expect(
      useCase.execute(
        new CreateTeamPermittedModelCommand(modelId, orgId, teamId),
      ),
    ).rejects.toThrow(UnexpectedModelError);
  });
});
