import { UpdateEmbeddingModelCommand } from './update-embedding-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ClearDefaultsByCatalogModelIdUseCase } from '../clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.use-case';
import { ClearDefaultsByCatalogModelIdCommand } from '../clear-defaults-by-catalog-model-id/clear-defaults-by-catalog-model-id.command';

@Injectable()
export class UpdateEmbeddingModelUseCase {
  private readonly logger = new Logger(UpdateEmbeddingModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly clearDefaultsUseCase: ClearDefaultsByCatalogModelIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: UpdateEmbeddingModelCommand): Promise<EmbeddingModel> {
    const existingModel = await this.modelsRepository.findOne({
      id: command.id,
    });

    if (!existingModel) {
      throw new ModelNotFoundByIdError(command.id);
    }

    // Check if model is being archived (isArchived: false -> true)
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
    });
    await this.modelsRepository.save(model);

    // Clear defaults if model is being archived (for consistency, though embedding models typically don't have defaults)
    if (isBeingArchived) {
      this.logger.log('Model is being archived, clearing defaults', {
        modelId: command.id,
      });
      await this.clearDefaultsUseCase.execute(
        new ClearDefaultsByCatalogModelIdCommand(command.id),
      );
    }

    return model;
  }
}
