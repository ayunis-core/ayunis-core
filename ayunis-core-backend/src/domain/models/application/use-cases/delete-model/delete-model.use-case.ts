import { Injectable, Logger } from '@nestjs/common';
import { ModelsRepository } from '../../ports/models.repository';
import { DeleteModelCommand } from './delete-model.command';
import {
  ModelNotFoundByIdError,
  ModelDeletionFailedError,
} from '../../models.errors';

@Injectable()
export class DeleteModelUseCase {
  private readonly logger = new Logger(DeleteModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(command: DeleteModelCommand): Promise<void> {
    this.logger.log('execute', {
      id: command.id,
    });

    try {
      // Check if model exists
      const existingModel = await this.modelsRepository.findOne({
        id: command.id,
      });

      if (!existingModel) {
        throw new ModelNotFoundByIdError(command.id);
      }

      await this.modelsRepository.delete(command.id);
    } catch (error) {
      if (error instanceof ModelNotFoundByIdError) {
        throw error;
      }
      this.logger.error('Error deleting model', error);
      throw new ModelDeletionFailedError(error.message);
    }
  }
}
