import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DeletePermittedModelCommand } from './delete-permitted-model.command';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import {
  PermittedModelDeletionFailedError,
  CannotDeleteDefaultModelError,
  CannotDeleteLastModelError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultCommand } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.command';
import { DeleteUserDefaultModelsByModelIdUseCase } from 'src/domain/models/application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { DeleteUserDefaultModelsByModelIdCommand } from 'src/domain/models/application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.command';
import { GetPermittedModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelsQuery } from 'src/domain/models/application/use-cases/get-permitted-models/get-permitted-models.query';
import {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindAllThreadsByOrgWithSourcesUseCase } from 'src/domain/threads/application/use-cases/find-all-threads-by-org-with-sources/find-all-threads-by-org-with-sources.use-case';
import { FindAllThreadsByOrgWithSourcesQuery } from 'src/domain/threads/application/use-cases/find-all-threads-by-org-with-sources/find-all-threads-by-org-with-sources.query';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class DeletePermittedModelUseCase {
  constructor(
    @InjectPinoLogger(DeletePermittedModelUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly deleteUserDefaultModelByModelIdUseCase: DeleteUserDefaultModelsByModelIdUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly replaceModelWithUserDefaultUseCase: ReplaceModelWithUserDefaultUseCase,
    private readonly findAllThreadsByOrgWithSourcesUseCase: FindAllThreadsByOrgWithSourcesUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: DeletePermittedModelCommand): Promise<void> {
    this.logger.info(
      {
        modelId: command.permittedModelId,
        orgId: command.orgId,
      },
      'execute',
    );
    try {
      const orgId = this.contextService.get('orgId');
      const orgRole = this.contextService.get('role');
      const systemRole = this.contextService.get('systemRole');
      const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === command.orgId;
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      if (!isOrgAdmin && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }
      const model = await this.permittedModelsRepository.findOne({
        id: command.permittedModelId,
      });
      if (!model) {
        this.logger.error(
          {
            modelId: command.permittedModelId,
            orgId: command.orgId,
          },
          'Model not found',
        );
        throw new PermittedModelDeletionFailedError('Model not found', {
          modelId: command.permittedModelId,
        });
      }

      // Verify the model belongs to the specified org
      if (model.orgId !== command.orgId) {
        throw new UnauthorizedAccessError();
      }

      return this.routeToDeletion(command, model);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error }, 'Error deleting permitted model');
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }

  private async routeToDeletion(
    command: DeletePermittedModelCommand,
    model: PermittedModel,
  ): Promise<void> {
    if (model instanceof PermittedLanguageModel) {
      return this.deletePermittedLanguageModel(command.orgId, model);
    } else if (model instanceof PermittedEmbeddingModel) {
      return this.deletePermittedEmbeddingModel(command.orgId, model);
    } else if (model instanceof PermittedImageGenerationModel) {
      return this.deletePermittedImageGenerationModel(command.orgId, model);
    }
    this.logger.error(
      {
        modelId: command.permittedModelId,
        orgId: command.orgId,
      },
      'Model is not a language, embedding, or image-generation model',
    );
    throw new PermittedModelDeletionFailedError(
      'Model is not a language, embedding, or image-generation model',
      {
        modelId: command.permittedModelId,
      },
    );
  }

  private async deletePermittedLanguageModel(
    orgId: UUID,
    model: PermittedLanguageModel,
  ): Promise<void> {
    // Check if the model is the last language model in the organization
    const permittedModels = (
      await this.getPermittedModelsUseCase.execute(
        new GetPermittedModelsQuery(orgId),
      )
    ).filter((m) => m instanceof PermittedLanguageModel);
    if (permittedModels.length === 1 && permittedModels[0].id === model.id) {
      throw new CannotDeleteLastModelError();
    }

    // Check if the model is the default model in the organization
    const modelToDelete = permittedModels.find((m) => m.id === model.id);
    if (!modelToDelete) {
      throw new PermittedModelDeletionFailedError('Model not found', {
        modelId: model.id,
      });
    }
    if (modelToDelete.isDefault) {
      throw new CannotDeleteDefaultModelError(model.id);
    }
    this.logLanguageModelCleanup(model.id);

    // Delete all user default models that reference this model
    await this.deleteUserDefaultModelByModelIdUseCase.execute(
      new DeleteUserDefaultModelsByModelIdCommand(model.id),
    );

    this.logger.debug(
      { modelId: model.id },
      'Replacing model in all threads that use it',
    );

    // Replace the model in all threads that use it
    // Because the user default model is deleted, this will fall back
    // to the org default model or the first available model
    await this.replaceModelWithUserDefaultUseCase.execute(
      new ReplaceModelWithUserDefaultCommand({
        orgId,
        oldPermittedModelId: model.id,
        catalogModelId: model.model.id,
      }),
    );

    await this.permittedModelsRepository.delete({
      id: model.id,
      orgId: orgId,
    });
  }

  private logLanguageModelCleanup(modelId: UUID): void {
    this.logger.debug(
      { modelId },
      'Deleting user default models that reference this model',
    );
  }

  private async deletePermittedEmbeddingModel(
    orgId: UUID,
    model: PermittedEmbeddingModel,
  ): Promise<void> {
    // Single query - get all threads with sources for the org
    const threads = await this.findAllThreadsByOrgWithSourcesUseCase.execute(
      new FindAllThreadsByOrgWithSourcesQuery(orgId),
    );

    // Collect all source IDs from all threads
    const sourceIds = threads
      .flatMap((t) => t.sourceAssignments?.map((sa) => sa.source.id) ?? [])
      .filter(Boolean);

    // Batch delete RAG index + sources (2 queries total)
    if (sourceIds.length > 0) {
      await this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(sourceIds, orgId),
      );
    }

    // Delete the model
    await this.permittedModelsRepository.delete({
      id: model.id,
      orgId: orgId,
    });
  }

  private async deletePermittedImageGenerationModel(
    orgId: UUID,
    model: PermittedImageGenerationModel,
  ): Promise<void> {
    await this.permittedModelsRepository.delete({
      id: model.id,
      orgId,
    });
  }
}
