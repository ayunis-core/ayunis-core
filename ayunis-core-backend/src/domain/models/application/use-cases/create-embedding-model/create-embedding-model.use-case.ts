import { CreateEmbeddingModelCommand } from './create-embedding-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import {
  ModelAlreadyExistsError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';

export class CreateEmbeddingModelUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: CreateEmbeddingModelCommand): Promise<EmbeddingModel> {
    try {
      const existingModel = await this.modelsRepository.findOne({
        name: command.name,
        provider: command.provider,
      });

      if (existingModel) {
        throw new ModelAlreadyExistsError(command.name, command.provider);
      }

      const model = new EmbeddingModel({
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
