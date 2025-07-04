import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelConfig } from 'src/domain/models/domain/model-config.entity';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { CreateModelCommand } from './create-model.command';
import {
  ModelAlreadyExistsError,
  ModelCreationFailedError,
} from '../../models.errors';

@Injectable()
export class CreateModelUseCase {
  private readonly logger = new Logger(CreateModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: CreateModelCommand): Promise<ModelWithConfig> {
    this.logger.log('execute', {
      modelName: command.name,
      modelProvider: command.provider,
      displayName: command.displayName,
    });

    try {
      // Check if model already exists
      const existingModel = await this.modelsRepository.findOne({
        name: command.name,
        provider: command.provider,
      });

      if (existingModel) {
        throw new ModelAlreadyExistsError(command.name, command.provider);
      }

      // Create model with config
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

      return await this.modelsRepository.create(modelWithConfig);
    } catch (error) {
      if (error instanceof ModelAlreadyExistsError) {
        throw error;
      }
      this.logger.error('Error creating model', error);
      throw new ModelCreationFailedError(error.message);
    }
  }
}
