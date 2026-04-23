import { Injectable, Logger } from '@nestjs/common';
import { DeleteUserDefaultModelCommand } from './delete-user-default-model.command';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { ModelError } from '../../models.errors';

@Injectable()
export class DeleteUserDefaultModelUseCase {
  private readonly logger = new Logger(DeleteUserDefaultModelUseCase.name);

  constructor(
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  async execute(command: DeleteUserDefaultModelCommand): Promise<void> {
    this.logger.log('execute', {
      userId: command.userId,
    });

    try {
      await this.userDefaultModelsRepository.deleteByUserId(command.userId);

      this.logger.debug('User default model deleted (idempotent)', {
        userId: command.userId,
      });
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to delete user default model', {
        userId: command.userId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }
}
