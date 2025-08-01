import { UpdateEmbeddingModelCommand } from './update-embedding-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';

export class UpdateEmbeddingModelUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: UpdateEmbeddingModelCommand): Promise<EmbeddingModel> {
    try {
      const existingModel = await this.modelsRepository.findOne({
        id: command.id,
      });

      if (!existingModel) {
        throw new ModelNotFoundByIdError(command.id);
      }

      const model = new EmbeddingModel({
        id: command.id,
        name: command.name,
        provider: command.provider,
        displayName: command.displayName,
        isArchived: command.isArchived,
        dimensions: command.dimensions,
      });
      await this.modelsRepository.save(model);
      return model;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
