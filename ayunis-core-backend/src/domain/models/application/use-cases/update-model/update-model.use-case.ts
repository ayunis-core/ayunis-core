import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelConfig } from 'src/domain/models/domain/model-config.entity';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';
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

  async execute(command: UpdateModelCommand): Promise<ModelWithConfig> {
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
        (modelWithSameName.model.name !== existingModel.model.name ||
          modelWithSameName.model.provider !== existingModel.model.provider)
      ) {
        throw new ModelAlreadyExistsError(command.name, command.provider);
      }

      // Create updated model with config
      const model = new Model({
        name: command.name,
        provider: command.provider,
      });
      const config = new ModelConfig({
        displayName: command.displayName,
        canStream: command.canStream,
        isReasoning: command.isReasoning,
        isArchived: command.isArchived,
      });

      const modelWithConfig = new ModelWithConfig(model, config);

      return await this.modelsRepository.update(command.id, modelWithConfig);
    } catch (error) {
      if (
        error instanceof ModelNotFoundByIdError ||
        error instanceof ModelAlreadyExistsError
      ) {
        throw error;
      }
      this.logger.error('Error updating model', error);
      throw new ModelUpdateFailedError(error.message);
    }
  }
}
