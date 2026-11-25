import type { UUID } from 'crypto';
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
import { ModuleRef } from '@nestjs/core';
import { ClearDefaultsByCatalogModelIdUseCase } from 'src/domain/models/application/use-cases/clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import { ClearDefaultsByCatalogModelIdCommand } from 'src/domain/models/application/use-cases/clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.command';
import { HasIndexedSourceInOrgsUseCase } from 'src/domain/sources/application/use-cases/has-indexed-source-in-orgs/has-indexed-source-in-orgs.use-case';
import { HasIndexedSourceInOrgsQuery } from 'src/domain/sources/application/use-cases/has-indexed-source-in-orgs/has-indexed-source-in-orgs.query';
import { HasOparlVectorsOfModelUseCase } from 'src/domain/oparl/application/use-cases/has-oparl-vectors-of-model/has-oparl-vectors-of-model.use-case';
import { HasOparlVectorsOfModelQuery } from 'src/domain/oparl/application/use-cases/has-oparl-vectors-of-model/has-oparl-vectors-of-model.query';

@Injectable()
export class UpdateEmbeddingModelUseCase {
  private readonly logger = new Logger(UpdateEmbeddingModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly clearDefaultsUseCase: ClearDefaultsByCatalogModelIdUseCase,
    private readonly hasIndexedSourceInOrgsUseCase: HasIndexedSourceInOrgsUseCase,
    private readonly moduleRef: ModuleRef,
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
   * The same holds for the OParl mirror's chunks, which no org owns.
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

    const inUse =
      (await this.hasIndexedSource(existingModel.id)) ||
      (await this.oparlVectors().execute(
        new HasOparlVectorsOfModelQuery(existingModel.id),
      ));
    if (inUse) {
      throw new EmbeddingModelInUseError(existingModel.id, changedFields);
    }
  }

  private async hasIndexedSource(modelId: UUID): Promise<boolean> {
    const permits =
      await this.permittedModelsRepository.findAllByCatalogModelId(modelId);
    return this.hasIndexedSourceInOrgsUseCase.execute(
      new HasIndexedSourceInOrgsQuery(
        modelId,
        permits.map((permit) => permit.orgId),
      ),
    );
  }

  // Looked up at call time: the OParl module imports this one, so importing
  // it here would make the two modules depend on each other.
  private oparlVectors(): HasOparlVectorsOfModelUseCase {
    return this.moduleRef.get(HasOparlVectorsOfModelUseCase, { strict: false });
  }
}
