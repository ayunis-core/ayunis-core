import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { UpdateModelCommand } from './update-model.command';
import {
  ModelNotFoundByIdError,
  ModelUpdateFailedError,
  ModelAlreadyExistsError,
} from '../../models.errors';

@Injectable()
export class UpdateModelUseCase {
  private readonly logger = new Logger(UpdateModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: UpdateModelCommand): Promise<Model> {
    this.logger.log('execute', {
      id: command.id,
      modelName: command.name,
      modelProvider: command.provider,
      displayName: command.displayName,
    });

    try {
      // Check if model exists
      const existingModel = await this.modelsRepository.findOne({
        id: command.id,
      });

      if (!existingModel) {
        throw new ModelNotFoundByIdError(command.id);
      }

      // Check if another model with the same name and provider exists (excluding current model)
      const modelWithSameName = await this.modelsRepository.findOne({
        name: command.name,
        provider: command.provider,
      });

      if (
        modelWithSameName &&
        (modelWithSameName.name !== existingModel.name ||
          modelWithSameName.provider !== existingModel.provider)
      ) {
        throw new ModelAlreadyExistsError(command.name, command.provider);
      }

      // Create updated model with config
      const model = new Model({
        id: command.id,
        name: command.name,
        provider: command.provider,
        displayName: command.displayName,
        canStream: command.canStream,
        isReasoning: command.isReasoning,
        isArchived: command.isArchived,
      });

      return await this.modelsRepository.update(command.id, model);
    } catch (error) {
      if (
        error instanceof ModelNotFoundByIdError ||
        error instanceof ModelAlreadyExistsError
      ) {
        throw error;
      }
      this.logger.error('Error updating model', {
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw new ModelUpdateFailedError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
