import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { DeleteUserDefaultModelCommand } from './delete-user-default-model.command';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { UnexpectedModelError } from '../../models.errors';

@Injectable()
export class DeleteUserDefaultModelUseCase {
  private readonly logger = new Logger(DeleteUserDefaultModelUseCase.name);

  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: DeleteUserDefaultModelCommand): Promise<void> {
    this.logger.log('execute', {
      userId: command.userId,
    });

    // First, find the user's current default model
    const userDefaultModel =
      await this.userDefaultModelsRepository.findByUserId(command.userId);

    if (!userDefaultModel) {
      this.logger.debug('No user default model found to delete', {
        userId: command.userId,
      });
      // Not throwing an error here as it's idempotent - no default model to delete
      return;
    }

    this.logger.debug('User default model found, deleting', {
      userId: command.userId,
      modelId: userDefaultModel.id,
      modelName: userDefaultModel.model.name,
      modelProvider: userDefaultModel.model.provider,
    });

    // Delete the user's default model
    await this.userDefaultModelsRepository.delete(
      userDefaultModel,
      command.userId,
    );

    this.logger.debug('User default model deleted successfully', {
      userId: command.userId,
      modelId: userDefaultModel.id,
    });
  }
}
