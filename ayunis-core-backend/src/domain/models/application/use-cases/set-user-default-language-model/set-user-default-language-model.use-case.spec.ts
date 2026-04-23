import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelNotFoundError } from '../../models.errors';
import { SetUserDefaultLanguageModelCommand } from './set-user-default-language-model.command';
import { SetUserDefaultLanguageModelUseCase } from './set-user-default-language-model.use-case';

describe('SetUserDefaultLanguageModelUseCase', () => {
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const orgId = randomUUID();
  const permittedModelId = randomUUID();

  let useCase: SetUserDefaultLanguageModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let userDefaultModelsRepository: jest.Mocked<UserDefaultModelsRepository>;
  let contextService: jest.Mocked<ContextService>;

  const buildPermittedLanguageModel = (): PermittedLanguageModel =>
    new PermittedLanguageModel({
      id: permittedModelId,
      model: new LanguageModel({
        name: 'gpt-4',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: false,
        isArchived: false,
      }),
      orgId,
    });

  beforeEach(async () => {
    permittedModelsRepository = {
      findOneLanguage: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;

    userDefaultModelsRepository = {
      findByUserId: jest.fn(),
      setAsDefault: jest.fn(),
    } as unknown as jest.Mocked<UserDefaultModelsRepository>;

    contextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return userId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module = await Test.createTestingModule({
      providers: [
        SetUserDefaultLanguageModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        {
          provide: UserDefaultModelsRepository,
          useValue: userDefaultModelsRepository,
        },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(SetUserDefaultLanguageModelUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets the catalog model as the user default when no previous default exists', async () => {
    const permittedModel = buildPermittedLanguageModel();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(permittedModel);
    userDefaultModelsRepository.findByUserId.mockResolvedValue(null);
    userDefaultModelsRepository.setAsDefault.mockResolvedValue(
      permittedModel.model,
    );

    const result = await useCase.execute(
      new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
    );

    expect(result).toBe(permittedModel);
    expect(permittedModelsRepository.findOneLanguage).toHaveBeenCalledWith({
      id: permittedModelId,
    });
    expect(userDefaultModelsRepository.setAsDefault).toHaveBeenCalledWith(
      permittedModel.model,
      userId,
    );
  });

  it('updates the existing default when one is already set', async () => {
    const permittedModel = buildPermittedLanguageModel();
    const existingDefault = buildPermittedLanguageModel().model;
    permittedModelsRepository.findOneLanguage.mockResolvedValue(permittedModel);
    userDefaultModelsRepository.findByUserId.mockResolvedValue(existingDefault);
    userDefaultModelsRepository.setAsDefault.mockResolvedValue(
      permittedModel.model,
    );

    const result = await useCase.execute(
      new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
    );

    expect(result).toBe(permittedModel);
    expect(userDefaultModelsRepository.setAsDefault).toHaveBeenCalledWith(
      permittedModel.model,
      userId,
    );
  });

  it('throws UnauthorizedAccessError when the caller tries to set a default for another user', async () => {
    await expect(
      useCase.execute(
        new SetUserDefaultLanguageModelCommand(
          otherUserId,
          permittedModelId,
          orgId,
        ),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(permittedModelsRepository.findOneLanguage).not.toHaveBeenCalled();
    expect(userDefaultModelsRepository.setAsDefault).not.toHaveBeenCalled();
  });

  it('throws PermittedModelNotFoundError when the permitted model does not exist', async () => {
    permittedModelsRepository.findOneLanguage.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
      ),
    ).rejects.toThrow(PermittedModelNotFoundError);
    expect(userDefaultModelsRepository.setAsDefault).not.toHaveBeenCalled();
  });

  it('re-throws unexpected repository failures', async () => {
    const permittedModel = buildPermittedLanguageModel();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(permittedModel);
    userDefaultModelsRepository.findByUserId.mockResolvedValue(null);
    const repositoryError = new Error('db exploded');
    userDefaultModelsRepository.setAsDefault.mockRejectedValue(repositoryError);

    await expect(
      useCase.execute(
        new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
      ),
    ).rejects.toBe(repositoryError);
  });
});
