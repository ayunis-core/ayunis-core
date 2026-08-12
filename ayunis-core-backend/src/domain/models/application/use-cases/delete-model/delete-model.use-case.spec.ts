import { randomUUID } from 'crypto';
import type { ModelsRepository } from '../../ports/models.repository';
import type { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  ModelErrorCode,
  ModelNotFoundByIdError,
  ModelReferencedByUsageError,
  ModelStillPermittedError,
} from '../../models.errors';
import type { HasUsageForModelUseCase } from 'src/domain/usage/application/use-cases/has-usage-for-model/has-usage-for-model.use-case';
import { LanguageModel } from '../../../domain/models/language.model';
import { ModelProvider } from '../../../domain/value-objects/model-provider.enum';
import { DeleteModelCommand } from './delete-model.command';
import { DeleteModelUseCase } from './delete-model.use-case';

describe('DeleteModelUseCase', () => {
  const modelId = randomUUID();
  const model = new LanguageModel({
    id: modelId,
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o mini',
    provider: ModelProvider.OPENAI,
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: true,
    isArchived: false,
  });

  let modelsRepository: jest.Mocked<
    Pick<ModelsRepository, 'withCatalogModelLocked' | 'delete'>
  >;
  let permittedModelsRepository: jest.Mocked<
    Pick<PermittedModelsRepository, 'findAllByCatalogModelId'>
  >;
  let hasUsageForModelUseCase: jest.Mocked<
    Pick<HasUsageForModelUseCase, 'execute'>
  >;
  let useCase: DeleteModelUseCase;

  beforeEach(() => {
    modelsRepository = {
      withCatalogModelLocked: jest.fn(),
      delete: jest.fn(),
    };
    modelsRepository.withCatalogModelLocked.mockImplementation(
      async (_id, operation) => await operation(model),
    );
    permittedModelsRepository = {
      findAllByCatalogModelId: jest.fn().mockResolvedValue([]),
    };
    hasUsageForModelUseCase = { execute: jest.fn().mockResolvedValue(false) };
    useCase = new DeleteModelUseCase(
      modelsRepository as unknown as ModelsRepository,
      permittedModelsRepository as unknown as PermittedModelsRepository,
      hasUsageForModelUseCase as unknown as HasUsageForModelUseCase,
    );
  });

  it('rejects deletion before mutations when historical usage references the model', async () => {
    hasUsageForModelUseCase.execute.mockResolvedValue(true);

    const result = useCase.execute(new DeleteModelCommand(modelId));

    await expect(result).rejects.toMatchObject({
      code: ModelErrorCode.MODEL_REFERENCED_BY_USAGE,
      statusCode: 409,
      message:
        'Cannot delete model because historical usage records reference it. Archive the model instead.',
    });
    await expect(result).rejects.toBeInstanceOf(ModelReferencedByUsageError);
    expect(modelsRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects deletion while organizations still permit the model', async () => {
    permittedModelsRepository.findAllByCatalogModelId.mockResolvedValue([
      { id: randomUUID() },
    ] as never);

    const result = useCase.execute(new DeleteModelCommand(modelId));

    await expect(result).rejects.toMatchObject({
      code: ModelErrorCode.MODEL_STILL_PERMITTED,
      statusCode: 409,
    });
    await expect(result).rejects.toBeInstanceOf(ModelStillPermittedError);
    expect(hasUsageForModelUseCase.execute).not.toHaveBeenCalled();
    expect(modelsRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced and unpermitted model', async () => {
    await useCase.execute(new DeleteModelCommand(modelId));

    expect(modelsRepository.delete).toHaveBeenCalledWith(modelId);
  });

  it('reports a missing model without checking references', async () => {
    modelsRepository.withCatalogModelLocked.mockImplementation(
      async (_id, operation) => await operation(undefined),
    );

    await expect(
      useCase.execute(new DeleteModelCommand(modelId)),
    ).rejects.toBeInstanceOf(ModelNotFoundByIdError);
    expect(
      permittedModelsRepository.findAllByCatalogModelId,
    ).not.toHaveBeenCalled();
    expect(hasUsageForModelUseCase.execute).not.toHaveBeenCalled();
  });
});
