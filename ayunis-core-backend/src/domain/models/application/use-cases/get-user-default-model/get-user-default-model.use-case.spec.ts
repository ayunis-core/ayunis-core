import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { GetEffectiveLanguageModelsUseCase } from '../get-effective-language-models/get-effective-language-models.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UnexpectedModelError } from '../../models.errors';
import { GetUserDefaultModelQuery } from './get-user-default-model.query';
import { GetUserDefaultModelUseCase } from './get-user-default-model.use-case';

describe('GetUserDefaultModelUseCase', () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const catalogModelId = randomUUID();
  const otherCatalogModelId = randomUUID();

  let useCase: GetUserDefaultModelUseCase;
  let userDefaultModelsRepository: jest.Mocked<UserDefaultModelsRepository>;
  let getEffectiveLanguageModelsUseCase: jest.Mocked<GetEffectiveLanguageModelsUseCase>;

  const buildLanguageModel = (id = catalogModelId): LanguageModel =>
    new LanguageModel({
      id,
      name: 'gpt-4',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      isArchived: false,
    });

  const buildPermittedLanguageModel = (
    model = buildLanguageModel(),
  ): PermittedLanguageModel =>
    new PermittedLanguageModel({
      id: randomUUID(),
      model,
      orgId,
    });

  beforeEach(async () => {
    userDefaultModelsRepository = {
      findByUserId: jest.fn(),
      setAsDefault: jest.fn(),
      deleteByUserId: jest.fn(),
    } as unknown as jest.Mocked<UserDefaultModelsRepository>;

    getEffectiveLanguageModelsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetEffectiveLanguageModelsUseCase>;

    const module = await Test.createTestingModule({
      providers: [
        GetUserDefaultModelUseCase,
        {
          provide: UserDefaultModelsRepository,
          useValue: userDefaultModelsRepository,
        },
        {
          provide: GetEffectiveLanguageModelsUseCase,
          useValue: getEffectiveLanguageModelsUseCase,
        },
      ],
    }).compile();

    useCase = module.get(GetUserDefaultModelUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the permitted model that matches the stored catalog default', async () => {
    const preferred = buildLanguageModel();
    const matching = buildPermittedLanguageModel(preferred);
    userDefaultModelsRepository.findByUserId.mockResolvedValue(preferred);
    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue({
      models: [
        buildPermittedLanguageModel(buildLanguageModel(otherCatalogModelId)),
        matching,
      ],
      overrideTeamIds: [],
    });

    const result = await useCase.execute(
      new GetUserDefaultModelQuery(userId, orgId),
    );

    expect(result).toBe(matching);
  });

  it('returns null when the user has no stored default', async () => {
    userDefaultModelsRepository.findByUserId.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetUserDefaultModelQuery(userId, orgId),
    );

    expect(result).toBeNull();
    expect(getEffectiveLanguageModelsUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns null when the stored preference is no longer in the effective set', async () => {
    const preferred = buildLanguageModel();
    userDefaultModelsRepository.findByUserId.mockResolvedValue(preferred);
    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue({
      models: [
        buildPermittedLanguageModel(buildLanguageModel(otherCatalogModelId)),
      ],
      overrideTeamIds: [],
    });

    const result = await useCase.execute(
      new GetUserDefaultModelQuery(userId, orgId),
    );

    expect(result).toBeNull();
  });

  it('wraps unexpected errors', async () => {
    userDefaultModelsRepository.findByUserId.mockRejectedValue(
      new Error('db exploded'),
    );

    await expect(
      useCase.execute(new GetUserDefaultModelQuery(userId, orgId)),
    ).rejects.toThrow();
  });

  it('propagates ModelError thrown by the effective models use case', async () => {
    const preferred = buildLanguageModel();
    userDefaultModelsRepository.findByUserId.mockResolvedValue(preferred);
    const modelError = new UnexpectedModelError(new Error('downstream'));
    getEffectiveLanguageModelsUseCase.execute.mockRejectedValue(modelError);

    await expect(
      useCase.execute(new GetUserDefaultModelQuery(userId, orgId)),
    ).rejects.toBe(modelError);
  });
});
