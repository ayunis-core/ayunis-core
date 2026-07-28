import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
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

describe('GetPermittedLanguageModelUseCase', () => {
  let useCase: GetPermittedLanguageModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;

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
        GetPermittedLanguageModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: {
            findOneLanguage: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => {
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

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the model when it belongs to the caller org', async () => {
    const model = permittedModelForOrg(mockOrgId);
    permittedModelsRepository.findOneLanguage.mockResolvedValue(model);

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
