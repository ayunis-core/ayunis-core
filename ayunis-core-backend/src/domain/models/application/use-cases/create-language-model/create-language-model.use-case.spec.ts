import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateLanguageModelUseCase } from './create-language-model.use-case';
import { CreateLanguageModelCommand } from './create-language-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';

describe('CreateLanguageModelUseCase', () => {
  let useCase: CreateLanguageModelUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;

  beforeAll(async () => {
    const mockModelsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLanguageModelUseCase,
        { provide: ModelsRepository, useValue: mockModelsRepository },
      ],
    }).compile();

    useCase = module.get<CreateLanguageModelUseCase>(
      CreateLanguageModelUseCase,
    );
    modelsRepository = module.get(ModelsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCommand = (tier?: ModelTier): CreateLanguageModelCommand => {
    return new CreateLanguageModelCommand({
      name: 'gpt-4',
      displayName: 'GPT-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
      tier,
    });
  };

  describe('execute', () => {
    it('should forward tier into the saved language model when set', async () => {
      // Arrange
      const command = createCommand(ModelTier.HIGH);

      modelsRepository.findOne.mockResolvedValue(undefined);
      modelsRepository.save.mockResolvedValue();

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeInstanceOf(LanguageModel);
      expect(result.tier).toBe(ModelTier.HIGH);
      expect(modelsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ tier: ModelTier.HIGH }),
      );
    });

    it('should persist tier as undefined when omitted from the command', async () => {
      // Arrange
      const command = createCommand();

      modelsRepository.findOne.mockResolvedValue(undefined);
      modelsRepository.save.mockResolvedValue();

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeInstanceOf(LanguageModel);
      expect(result.tier).toBeUndefined();
      expect(modelsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ tier: undefined }),
      );
    });
  });
});
