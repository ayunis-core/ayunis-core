import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { GetPermittedLanguageModelUseCase } from './get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from './get-permitted-language-model.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelNotFoundByIdError } from '../../models.errors';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetEffectiveLanguageModelsUseCase } from '../get-effective-language-models/get-effective-language-models.use-case';

describe('GetPermittedLanguageModelUseCase', () => {
  const logger = createPinoLoggerMock();
  let useCase: GetPermittedLanguageModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let getEffectiveLanguageModelsUseCase: jest.Mocked<GetEffectiveLanguageModelsUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174010' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const otherOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
  const mockPermittedModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockCatalogModelId = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  const mockLanguageModel = new LanguageModel({
    id: mockCatalogModelId,
    name: 'gpt-4',
    displayName: 'GPT-4',
    provider: ModelProvider.OPENAI,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: false,
  });

  const permittedModelForOrg = (orgId: UUID) =>
    new PermittedLanguageModel({
      id: mockPermittedModelId,
      model: mockLanguageModel,
      orgId,
      isDefault: false,
      scope: PermittedModelScope.ORG,
    });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getLoggerToken(GetPermittedLanguageModelUseCase.name),
          useValue: logger,
        },
        GetPermittedLanguageModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: {
            findOneLanguage: jest.fn(),
          },
        },
        {
          provide: GetEffectiveLanguageModelsUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'userId') return mockUserId;
              if (key === 'orgId') return mockOrgId;
              if (key === 'systemRole') return null;
              return null;
            }),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetPermittedLanguageModelUseCase);
    permittedModelsRepository = module.get(PermittedModelsRepository);
    getEffectiveLanguageModelsUseCase = module.get(
      GetEffectiveLanguageModelsUseCase,
    );

    logger.info.mockImplementation();
    logger.error.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the model when it belongs to the caller org', async () => {
    const model = permittedModelForOrg(mockOrgId);
    permittedModelsRepository.findOneLanguage.mockResolvedValue(model);
    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue({
      models: [model],
      overrideTeamIds: [],
    });

    await expect(
      useCase.execute(
        new GetPermittedLanguageModelQuery({ id: mockPermittedModelId }),
      ),
    ).resolves.toBe(model);
  });

  it('should throw ModelNotFoundByIdError for an unknown id', async () => {
    permittedModelsRepository.findOneLanguage.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new GetPermittedLanguageModelQuery({ id: mockPermittedModelId }),
      ),
    ).rejects.toBeInstanceOf(ModelNotFoundByIdError);
  });

  it('should reject an org model excluded by team overrides', async () => {
    const orgModel = permittedModelForOrg(mockOrgId);
    const teamId = '123e4567-e89b-12d3-a456-426614174021';
    const effectiveTeamModel = new PermittedLanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174020',
      model: mockLanguageModel,
      orgId: mockOrgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelsRepository.findOneLanguage.mockResolvedValue(orgModel);
    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue({
      models: [effectiveTeamModel],
      overrideTeamIds: [teamId],
    });

    await expect(
      useCase.execute(
        new GetPermittedLanguageModelQuery({ id: mockPermittedModelId }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });

  it('should throw UnauthorizedAccessError when the model belongs to another org', async () => {
    permittedModelsRepository.findOneLanguage.mockResolvedValue(
      permittedModelForOrg(otherOrgId),
    );

    await expect(
      useCase.execute(
        new GetPermittedLanguageModelQuery({ id: mockPermittedModelId }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
  });
});
