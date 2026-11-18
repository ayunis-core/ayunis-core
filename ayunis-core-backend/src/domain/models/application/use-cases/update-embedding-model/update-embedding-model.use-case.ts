import { UpdateEmbeddingModelCommand } from './update-embedding-model.command';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import {
  EmbeddingModelInUseError,
  type EmbeddingModelVectorField,
} from 'src/domain/models/application/embedding-model-catalog.errors';
import {
  ModelAlreadyExistsError,
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdUseCase } from 'src/domain/models/application/use-cases/clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import { ClearDefaultsByCatalogModelIdCommand } from 'src/domain/models/application/use-cases/clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.command';
import { HasIndexedSourceInOrgsUseCase } from 'src/domain/sources/application/use-cases/has-indexed-source-in-orgs/has-indexed-source-in-orgs.use-case';
import { HasIndexedSourceInOrgsQuery } from 'src/domain/sources/application/use-cases/has-indexed-source-in-orgs/has-indexed-source-in-orgs.query';

@Injectable()
export class UpdateEmbeddingModelUseCase {
  private readonly logger = new Logger(UpdateEmbeddingModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly clearDefaultsUseCase: ClearDefaultsByCatalogModelIdUseCase,
    private readonly hasIndexedSourceInOrgsUseCase: HasIndexedSourceInOrgsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: UpdateEmbeddingModelCommand): Promise<EmbeddingModel> {
    this.logger.log({ modelId: command.id }, 'Updating embedding model');

    const existingModel = await this.modelsRepository.findOneEmbedding(
      command.id,
    );
    if (!existingModel) {
      throw new ModelNotFoundByIdError(command.id);
    }
    await this.assertKeyIsFree(command);
    await this.assertVectorsStayValid(existingModel, command);

    const isBeingArchived = !existingModel.isArchived && command.isArchived;
    const model = new EmbeddingModel({
      id: command.id,
      name: command.name,
      provider: command.provider,
      displayName: command.displayName,
      isArchived: command.isArchived,
      dimensions: command.dimensions,
      inputTokenCost: command.inputTokenCost,
      outputTokenCost: command.outputTokenCost,
      createdAt: existingModel.createdAt,
    });
    await this.modelsRepository.save(model);

    if (isBeingArchived) {
      this.logger.log(
        { modelId: command.id },
        'Model is being archived, clearing defaults',
      );
      await this.clearDefaultsUseCase.execute(
        new ClearDefaultsByCatalogModelIdCommand(command.id),
      );
    }

    return model;
  }

  private async assertKeyIsFree(
    command: UpdateEmbeddingModelCommand,
  ): Promise<void> {
    const modelWithSameKey = await this.modelsRepository.findOne({
      name: command.name,
      provider: command.provider,
    });
    if (modelWithSameKey && modelWithSameKey.id !== command.id) {
      throw new ModelAlreadyExistsError(command.name, command.provider);
    }
  }

  /**
   * Stored vectors carry no model identity, so after a name or dimensions
   * change every org searching with this model would match its existing
   * vectors against those of a different model and silently find nothing.
   * A provider change reaches the same model another way and stays allowed.
   */
  private async assertVectorsStayValid(
    existingModel: EmbeddingModel,
    command: UpdateEmbeddingModelCommand,
  ): Promise<void> {
    const changedFields: EmbeddingModelVectorField[] = [];
    if (command.name !== existingModel.name) changedFields.push('name');
    if (command.dimensions !== existingModel.dimensions) {
      changedFields.push('dimensions');
    }
    if (changedFields.length === 0) return;

    const permits =
      await this.permittedModelsRepository.findAllByCatalogModelId(
        existingModel.id,
      );
    const isIndexed = await this.hasIndexedSourceInOrgsUseCase.execute(
      new HasIndexedSourceInOrgsQuery(permits.map((permit) => permit.orgId)),
    );
    if (isIndexed) {
      throw new EmbeddingModelInUseError(existingModel.id, changedFields);
    }
  }
}
