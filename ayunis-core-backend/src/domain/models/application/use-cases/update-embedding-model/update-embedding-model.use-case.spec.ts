import type { UUID } from 'crypto';
import type { ModuleRef } from '@nestjs/core';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import type { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import type { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import type { ClearDefaultsByCatalogModelIdUseCase } from 'src/domain/models/application/use-cases/clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import type { HasIndexedSourceInOrgsUseCase } from 'src/domain/sources/application/use-cases/has-indexed-source-in-orgs/has-indexed-source-in-orgs.use-case';
import type { HasIndexedSourceInOrgsQuery } from 'src/domain/sources/application/use-cases/has-indexed-source-in-orgs/has-indexed-source-in-orgs.query';
import { HasOparlVectorsOfModelUseCase } from 'src/domain/oparl/application/use-cases/has-oparl-vectors-of-model/has-oparl-vectors-of-model.use-case';
import type { HasOparlVectorsOfModelQuery } from 'src/domain/oparl/application/use-cases/has-oparl-vectors-of-model/has-oparl-vectors-of-model.query';
import { EmbeddingModelInUseError } from 'src/domain/models/application/embedding-model-catalog.errors';
import { ModelAlreadyExistsError } from 'src/domain/models/application/models.errors';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { UpdateEmbeddingModelCommand } from './update-embedding-model.command';
import { UpdateEmbeddingModelUseCase } from './update-embedding-model.use-case';

const modelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
const permittingOrgId = '123e4567-e89b-12d3-a456-426614174010' as UUID;
const otherOrgId = '123e4567-e89b-12d3-a456-426614174011' as UUID;

const existingModel = new EmbeddingModel({
  id: modelId,
  createdAt: new Date('2026-01-05T09:00:00Z'),
  name: 'mistral-embed',
  provider: ModelProvider.OLLAMA,
  displayName: 'Mistral Embed',
  isArchived: false,
  dimensions: EmbeddingDimensions.DIMENSION_1024,
  inputTokenCost: 0.1,
});

function commandWith(
  changes: Partial<
    ConstructorParameters<typeof UpdateEmbeddingModelCommand>[0]
  >,
): UpdateEmbeddingModelCommand {
  return new UpdateEmbeddingModelCommand({
    id: modelId,
    name: existingModel.name,
    provider: existingModel.provider,
    displayName: existingModel.displayName,
    isArchived: existingModel.isArchived,
    dimensions: existingModel.dimensions,
    inputTokenCost: existingModel.inputTokenCost,
    ...changes,
  });
}

describe('UpdateEmbeddingModelUseCase', () => {
  createLoggerMock();
  let modelsRepository: jest.Mocked<ModelsRepository>;
  let useCase: UpdateEmbeddingModelUseCase;
  let indexedOrgIds: UUID[];
  let indexedModelIds: UUID[];
  let oparlModelIds: UUID[];
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;

  beforeEach(() => {
    indexedOrgIds = [];
    indexedModelIds = [];
    oparlModelIds = [];
    modelsRepository = {
      findOneEmbedding: jest.fn().mockResolvedValue(existingModel),
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ModelsRepository>;
    permittedModelsRepository = {
      findAllByCatalogModelId: jest.fn().mockResolvedValue([
        new PermittedEmbeddingModel({
          model: existingModel,
          orgId: permittingOrgId,
          scope: PermittedModelScope.ORG,
        }),
      ]),
    } as unknown as jest.Mocked<PermittedModelsRepository>;
    const hasIndexedSourceInOrgs = {
      execute: jest.fn((query: HasIndexedSourceInOrgsQuery) =>
        Promise.resolve(
          indexedModelIds.includes(query.embeddingModelId) ||
            query.orgIds.some((orgId) => indexedOrgIds.includes(orgId)),
        ),
      ),
    } as unknown as jest.Mocked<HasIndexedSourceInOrgsUseCase>;
    const hasOparlVectors = {
      execute: jest.fn((query: HasOparlVectorsOfModelQuery) =>
        Promise.resolve(oparlModelIds.includes(query.embeddingModelId)),
      ),
    };
    const moduleRef = {
      get: jest.fn((token: unknown) =>
        token === HasOparlVectorsOfModelUseCase ? hasOparlVectors : undefined,
      ),
    } as unknown as ModuleRef;
    useCase = new UpdateEmbeddingModelUseCase(
      modelsRepository,
      permittedModelsRepository,
      { execute: jest.fn() } as unknown as ClearDefaultsByCatalogModelIdUseCase,
      hasIndexedSourceInOrgs,
      moduleRef,
    );
  });

  function savedModel(): EmbeddingModel {
    return modelsRepository.save.mock.calls[0][0] as EmbeddingModel;
  }

  it.each([
    ['name', { name: 'mistral-embed-2' }, ['name']],
    [
      'dimensions',
      { dimensions: EmbeddingDimensions.DIMENSION_1536 },
      ['dimensions'],
    ],
    [
      'name and dimensions',
      { name: 'bge-m3', dimensions: EmbeddingDimensions.DIMENSION_2560 },
      ['name', 'dimensions'],
    ],
  ])(
    'rejects a %s change that would make the vectors of a permitting org stale',
    async (_change, changes, fields) => {
      indexedOrgIds = [permittingOrgId];

      const error = await useCase
        .execute(commandWith(changes))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(EmbeddingModelInUseError);
      expect((error as EmbeddingModelInUseError).metadata).toEqual({
        modelId,
        fields,
      });
      expect(modelsRepository.save).not.toHaveBeenCalled();
    },
  );

  it('allows a provider change while documents are indexed with the model', async () => {
    indexedOrgIds = [permittingOrgId];

    await useCase.execute(commandWith({ provider: ModelProvider.AYUNIS }));

    expect(savedModel().provider).toBe(ModelProvider.AYUNIS);
  });

  it('keeps the creation date of the catalog model', async () => {
    await useCase.execute(commandWith({ displayName: 'Mistral Embed v1' }));

    expect(savedModel().createdAt).toEqual(new Date('2026-01-05T09:00:00Z'));
  });

  it('allows display name, cost and archive edits while documents are indexed with the model', async () => {
    indexedOrgIds = [permittingOrgId];

    await useCase.execute(
      commandWith({
        displayName: 'Mistral Embed (legacy)',
        inputTokenCost: 0.2,
        isArchived: true,
      }),
    );

    expect(savedModel()).toMatchObject({
      displayName: 'Mistral Embed (legacy)',
      inputTokenCost: 0.2,
      isArchived: true,
    });
  });

  it('allows a name change when only orgs not permitting the model have indexed documents', async () => {
    indexedOrgIds = [otherOrgId];

    await useCase.execute(commandWith({ name: 'mistral-embed-2' }));

    expect(savedModel().name).toBe('mistral-embed-2');
  });

  it('rejects a dimensions change while documents keep vectors of the model after its last permit was removed', async () => {
    permittedModelsRepository.findAllByCatalogModelId.mockResolvedValue([]);
    indexedModelIds = [modelId];

    await expect(
      useCase.execute(
        commandWith({ dimensions: EmbeddingDimensions.DIMENSION_1536 }),
      ),
    ).rejects.toThrow(EmbeddingModelInUseError);
    expect(modelsRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    ['name', { name: 'mistral-embed-2' }],
    ['dimensions', { dimensions: EmbeddingDimensions.DIMENSION_1536 }],
  ])(
    'rejects a %s change while OParl chunks hold vectors of the model',
    async (_change, changes) => {
      oparlModelIds = [modelId];

      await expect(useCase.execute(commandWith(changes))).rejects.toThrow(
        EmbeddingModelInUseError,
      );
      expect(modelsRepository.save).not.toHaveBeenCalled();
    },
  );

  it('allows a name change while OParl chunks hold vectors of other models only', async () => {
    oparlModelIds = ['123e4567-e89b-12d3-a456-426614174002'];

    await useCase.execute(commandWith({ name: 'mistral-embed-2' }));

    expect(savedModel().name).toBe('mistral-embed-2');
  });

  it('rejects taking the name and provider of another catalog model', async () => {
    modelsRepository.findOne.mockResolvedValue(
      new EmbeddingModel({
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'mistral-embed',
        provider: ModelProvider.AYUNIS,
        displayName: 'Mistral Embed (Ayunis)',
        isArchived: false,
        dimensions: EmbeddingDimensions.DIMENSION_1024,
      }),
    );

    await expect(
      useCase.execute(commandWith({ provider: ModelProvider.AYUNIS })),
    ).rejects.toThrow(ModelAlreadyExistsError);
    expect(modelsRepository.save).not.toHaveBeenCalled();
  });
});
