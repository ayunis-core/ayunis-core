import { CreateEmbeddingModelCommand } from './create-embedding-model.command';
import { ModelsRepository } from '../../ports/models.repository';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import {
  ModelAlreadyExistsError,
  ModelNotFoundByNameAndProviderError,
  UnexpectedModelError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CreateEmbeddingModelUseCase {
  private readonly logger = new Logger(CreateEmbeddingModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: CreateEmbeddingModelCommand): Promise<EmbeddingModel> {
    this.logger.log('Creating embedding model', {
      name: command.name,
      provider: command.provider,
    });
    try {
      const existingModel = await this.modelsRepository
        .findOne({
          name: command.name,
          provider: command.provider,
        })
        .catch((error) => {
          this.logger.error('Error finding embedding model', {
            error: error as Error,
          });
          throw new ModelNotFoundByNameAndProviderError(
            command.name,
            command.provider,
          );
        });

      if (existingModel) {
        this.logger.warn('Embedding model already exists', {
          name: command.name,
          provider: command.provider,
        });
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
      this.logger.error('Unexpected error creating embedding model', {
        error: error as Error,
      });
      throw new UnexpectedModelError(error as Error);
    }
  }
}
