import { createLoggerMock } from 'src/common/testing/logger.mock';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { createDefaultModelSelectionsFake } from 'src/domain/models/testing/default-model-selections.fake';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { PermittedModelNotFoundError } from 'src/domain/models/application/models.errors';
import { SetUserDefaultLanguageModelCommand } from './set-user-default-language-model.command';
import { SetUserDefaultLanguageModelUseCase } from './set-user-default-language-model.use-case';

describe('SetUserDefaultLanguageModelUseCase', () => {
  const logger = createLoggerMock();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const orgId = randomUUID();
  const permittedModelId = randomUUID();

  let useCase: SetUserDefaultLanguageModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let selections: ReturnType<typeof createDefaultModelSelectionsFake>;
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
        contextWindowSize: 128_000,
        isArchived: false,
      }),
      orgId,
    });

  beforeEach(async () => {
    permittedModelsRepository = {
      findOneLanguage: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;

    selections = createDefaultModelSelectionsFake();

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
          provide: DefaultModelSelectionsRepository,
          useValue: selections.repo,
        },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(SetUserDefaultLanguageModelUseCase);

    logger.log.mockImplementation();
    logger.debug.mockImplementation();
    logger.error.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets the permitted model as the user default when no previous default exists', async () => {
    const permittedModel = buildPermittedLanguageModel();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(permittedModel);

    const result = await useCase.execute(
      new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
    );

    expect(result).toBe(permittedModel);
    expect(permittedModelsRepository.findOneLanguage).toHaveBeenCalledWith({
      id: permittedModelId,
    });
    expect(selections.repo.setModel).toHaveBeenCalledWith(
      { userId },
      permittedModelId,
    );
  });

  it('replaces a personal mode default with the model', async () => {
    const permittedModel = buildPermittedLanguageModel();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(permittedModel);
    selections.store({ userId }, ModelMode.AUTO);

    await useCase.execute(
      new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
    );

    expect(selections.repo.setModel).toHaveBeenCalledWith(
      { userId },
      permittedModelId,
    );
    expect(selections.repo.clear).not.toHaveBeenCalled();
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
    expect(selections.repo.setModel).not.toHaveBeenCalled();
  });

  it('throws PermittedModelNotFoundError when the permitted model does not exist', async () => {
    permittedModelsRepository.findOneLanguage.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
      ),
    ).rejects.toThrow(PermittedModelNotFoundError);
    expect(selections.repo.setModel).not.toHaveBeenCalled();
  });

  it('re-throws unexpected repository failures', async () => {
    const permittedModel = buildPermittedLanguageModel();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(permittedModel);
    const repositoryError = new Error('db exploded');
    selections.repo.setModel.mockRejectedValue(repositoryError);

    await expect(
      useCase.execute(
        new SetUserDefaultLanguageModelCommand(userId, permittedModelId, orgId),
      ),
    ).rejects.toBe(repositoryError);
  });
});
