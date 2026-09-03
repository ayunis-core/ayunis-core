import { Injectable, Logger } from '@nestjs/common';
import { DeleteUserDefaultModelCommand } from './delete-user-default-model.command';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { ModelError } from 'src/domain/models/application/models.errors';

@Injectable()
export class DeleteUserDefaultModelUseCase {
  private readonly logger = new Logger(DeleteUserDefaultModelUseCase.name);

  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  async execute(command: DeleteUserDefaultModelCommand): Promise<void> {
    this.logger.log({ userId: command.userId }, 'execute');
    try {
      await this.deleteDefault(command);
    } catch (error) {
      if (error instanceof ModelError) throw error;
      this.logger.error(
        {
          userId: command.userId,
          err: error instanceof Error ? error : new Error('Unknown error'),
        },
        'Failed to delete user default model',
      );
      throw error;
    }
  }

  private async deleteDefault(
    command: DeleteUserDefaultModelCommand,
  ): Promise<void> {
    const current = await this.userDefaultModelsRepository.findByUserId(
      command.userId,
    );
    if (!current) {
      this.logger.debug(
        { userId: command.userId },
        'No user default model found to delete',
      );
      return;
    }
    this.logger.debug(
      {
        userId: command.userId,
        modelId: current.id,
        modelName: current.model.name,
        modelProvider: current.model.provider,
      },
      'User default model found, deleting',
    );
    await this.userDefaultModelsRepository.delete(current, command.userId);
    this.logger.debug(
      { userId: command.userId, modelId: current.id },
      'User default model deleted successfully',
    );
  }
}
