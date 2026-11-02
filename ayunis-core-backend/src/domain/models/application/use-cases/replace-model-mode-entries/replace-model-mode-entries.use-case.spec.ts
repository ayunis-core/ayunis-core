import { createLoggerMock } from 'src/common/testing/logger.mock';
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import {
  ModelNotFoundByIdError,
  NotALanguageModelError,
} from 'src/domain/models/application/models.errors';
import { ModelTierNotAllowedForModeError } from 'src/domain/models/application/model-modes.errors';
import type { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { ReplaceModelModeEntriesCommand } from './replace-model-mode-entries.command';
import { ReplaceModelModeEntriesUseCase } from './replace-model-mode-entries.use-case';

const languageModel = (name: string, tier?: ModelTier): LanguageModel =>
  new LanguageModel({
    id: randomUUID(),
    name,
    provider: ModelProvider.MISTRAL,
    displayName: name,
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: false,
    contextWindowSize: 128_000,
    isArchived: false,
    tier,
  });

describe('ReplaceModelModeEntriesUseCase', () => {
  const logger = createLoggerMock();
  const mistralLarge = languageModel('mistral-large', ModelTier.HIGH);
  const mistralSmall = languageModel('mistral-small', ModelTier.MEDIUM);
  const embedding = new EmbeddingModel({
    id: randomUUID(),
    name: 'mistral-embed',
    provider: ModelProvider.MISTRAL,
    displayName: 'Mistral Embed',
    dimensions: EmbeddingDimensions.DIMENSION_1024,
    isArchived: false,
  });

  let useCase: ReplaceModelModeEntriesUseCase;
  let modelModeEntriesRepository: jest.Mocked<ModelModeEntriesRepository>;

  beforeEach(async () => {
    const modelsRepository = {
      findAll: jest
        .fn()
        .mockResolvedValue([mistralLarge, mistralSmall, embedding]),
    } as unknown as jest.Mocked<ModelsRepository>;
    modelModeEntriesRepository = {
      replaceForMode: jest.fn(),
    } as unknown as jest.Mocked<ModelModeEntriesRepository>;

    const module = await Test.createTestingModule({
      providers: [
        ReplaceModelModeEntriesUseCase,
        { provide: ModelsRepository, useValue: modelsRepository },
        {
          provide: ModelModeEntriesRepository,
          useValue: modelModeEntriesRepository,
        },
      ],
    }).compile();

    useCase = module.get(ReplaceModelModeEntriesUseCase);
    logger.log.mockImplementation();
    logger.error.mockImplementation();
  });

  const persisted = (): ModelModeEntry[] =>
    modelModeEntriesRepository.replaceForMode.mock.calls[0][1];

  it('persists entries in the submitted order with their enabled flags', async () => {
    await useCase.execute(
      new ReplaceModelModeEntriesCommand(ModelMode.AUTO, [
        { modelId: mistralSmall.id, enabled: true },
        { modelId: mistralLarge.id, enabled: false },
      ]),
    );

    expect(persisted().map((e) => [e.model.id, e.position, e.enabled])).toEqual(
      [
        [mistralSmall.id, 0, true],
        [mistralLarge.id, 1, false],
      ],
    );
  });

  it('clears the mode when an empty list is submitted', async () => {
    await useCase.execute(
      new ReplaceModelModeEntriesCommand(ModelMode.MAX, []),
    );

    expect(modelModeEntriesRepository.replaceForMode).toHaveBeenCalledWith(
      ModelMode.MAX,
      [],
    );
  });

  it('rejects a model that is not tier high for max mode', async () => {
    await expect(
      useCase.execute(
        new ReplaceModelModeEntriesCommand(ModelMode.MAX, [
          { modelId: mistralSmall.id, enabled: true },
        ]),
      ),
    ).rejects.toThrow(ModelTierNotAllowedForModeError);
    expect(modelModeEntriesRepository.replaceForMode).not.toHaveBeenCalled();
  });

  it('accepts a medium-tier model for auto mode', async () => {
    await useCase.execute(
      new ReplaceModelModeEntriesCommand(ModelMode.AUTO, [
        { modelId: mistralSmall.id, enabled: true },
      ]),
    );

    expect(persisted()).toHaveLength(1);
  });

  it('rejects an unknown model id', async () => {
    await expect(
      useCase.execute(
        new ReplaceModelModeEntriesCommand(ModelMode.AUTO, [
          { modelId: randomUUID(), enabled: true },
        ]),
      ),
    ).rejects.toThrow(ModelNotFoundByIdError);
  });

  it('rejects a catalog model that is not a language model', async () => {
    await expect(
      useCase.execute(
        new ReplaceModelModeEntriesCommand(ModelMode.AUTO, [
          { modelId: embedding.id, enabled: true },
        ]),
      ),
    ).rejects.toThrow(NotALanguageModelError);
  });
});
