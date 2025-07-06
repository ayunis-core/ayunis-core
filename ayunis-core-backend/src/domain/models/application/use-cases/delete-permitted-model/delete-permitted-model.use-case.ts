import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { DeletePermittedModelCommand } from './delete-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  ModelError,
  PermittedModelDeletionFailedError,
  UnexpectedModelError,
} from '../../models.errors';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultCommand } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.command';
import { DeleteUserDefaultModelsByModelIdUseCase } from '../delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { DeleteUserDefaultModelsByModelIdCommand } from '../delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.command';
import { GetPermittedModelsUseCase } from '../get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelsQuery } from '../get-permitted-models/get-permitted-models.query';
import { ThreadError } from 'src/domain/threads/application/threads.errors';

@Injectable()
export class DeletePermittedModelUseCase {
  private readonly logger = new Logger(DeletePermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly deleteUserDefaultModelByModelIdUseCase: DeleteUserDefaultModelsByModelIdUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly replaceModelWithUserDefaultUseCase: ReplaceModelWithUserDefaultUseCase,
  ) {}

  async execute(command: DeletePermittedModelCommand): Promise<void> {
    this.logger.log('execute', {
      modelId: command.permittedModelId,
      orgId: command.orgId,
    });
    try {
      // TODO: Make this a single transaction

      // Check if the model is the last one in the organization
      const permittedModels = await this.getPermittedModelsUseCase.execute(
        new GetPermittedModelsQuery(command.orgId),
      );
      if (
        permittedModels.length === 1 &&
        permittedModels[0].id === command.permittedModelId
      ) {
        throw new PermittedModelDeletionFailedError(
          'Cannot delete the last permitted model in an organization',
        );
      }

      // Check if the model is the default model in the organization
      const modelToDelete = permittedModels.find(
        (model) => model.id === command.permittedModelId,
      );
      if (!modelToDelete) {
        throw new PermittedModelDeletionFailedError('Model not found', {
          modelId: command.permittedModelId,
        });
      }
      if (modelToDelete.isDefault) {
        throw new PermittedModelDeletionFailedError(
          'Cannot delete the default model in an organization',
          { modelId: command.permittedModelId },
        );
      }
      this.logger.debug(
        'Deleting user default models that reference this model',
        {
          modelId: command.permittedModelId,
        },
      );

      // Delete all user default models that reference this model
      await this.deleteUserDefaultModelByModelIdUseCase.execute(
        new DeleteUserDefaultModelsByModelIdCommand(command.permittedModelId),
      );

      this.logger.debug('Replacing model in all threads that use it', {
        modelId: command.permittedModelId,
      });

      // Replace the model in all threads that use it
      // Because the user default model is deleted, this will fall back
      // to the org default model or the first available model
      await this.replaceModelWithUserDefaultUseCase.execute(
        new ReplaceModelWithUserDefaultCommand(command.permittedModelId),
      );

      await this.permittedModelsRepository.delete({
        id: command.permittedModelId,
        orgId: command.orgId,
      });
    } catch (error) {
      if (error instanceof ModelError || error instanceof ThreadError) {
        throw error;
      }
      this.logger.error('Error deleting permitted model', error);
      throw new UnexpectedModelError(error);
    }
  }
}
