import { Injectable, Logger } from '@nestjs/common';
import { ManageUserDefaultModelCommand } from './manage-user-default-model.command';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { ModelError, PermittedModelNotFoundError } from '../../models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ManageUserDefaultModelUseCase {
  private readonly logger = new Logger(ManageUserDefaultModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: ManageUserDefaultModelCommand,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('execute', {
      userId: command.userId,
      permittedModelId: command.permittedModelId,
      orgId: command.orgId,
    });

    try {
      // First, verify that the permitted model exists and belongs to the organization
      const userId = this.contextService.get('userId');
      if (userId !== command.userId) {
        throw new UnauthorizedAccessError();
      }
      const permittedModel =
        await this.permittedModelsRepository.findOneLanguage({
          id: command.permittedModelId,
        });

      if (!permittedModel) {
        this.logger.error('Permitted model not found', {
          permittedModelId: command.permittedModelId,
          orgId: command.orgId,
        });
        throw new PermittedModelNotFoundError(command.permittedModelId);
      }

      // Check if there's already a user default model
      const existingUserDefault =
        await this.userDefaultModelsRepository.findByUserId(command.userId);

      const action = existingUserDefault ? 'updating' : 'setting';
      this.logger.debug(`Permitted model found, ${action} user default`, {
        modelName: permittedModel.model.name,
        modelProvider: permittedModel.model.provider,
        existingDefaultId: existingUserDefault?.id,
      });

      // Set the model as the user's default (handles both create and update)
      const userDefaultModel =
        await this.userDefaultModelsRepository.setAsDefault(
          permittedModel,
          command.userId,
        );

      this.logger.debug(`User default model ${action} successfully`, {
        userId: command.userId,
        modelId: userDefaultModel.id,
        action,
      });

      return userDefaultModel;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Failed to manage user default model', {
        userId: command.userId,
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }
}
