import { Injectable, Logger } from '@nestjs/common';
import { DeletePermittedModelCommand } from './delete-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedModelDeletionFailedError,
  UnexpectedModelError,
} from '../../models.errors';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultCommand } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.command';
import { ReplaceModelWithUserDefaultUseCase as ReplaceModelWithUserDefaultUseCaseAgents } from 'src/domain/agents/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultCommand as ReplaceModelWithUserDefaultCommandAgents } from 'src/domain/agents/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.command';
import { DeleteUserDefaultModelsByModelIdUseCase } from '../delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { DeleteUserDefaultModelsByModelIdCommand } from '../delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.command';
import { GetPermittedModelsUseCase } from '../get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelsQuery } from '../get-permitted-models/get-permitted-models.query';
import {
  PermittedEmbeddingModel,
  PermittedLanguageModel,
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
  private readonly logger = new Logger(DeletePermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly deleteUserDefaultModelByModelIdUseCase: DeleteUserDefaultModelsByModelIdUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly replaceModelWithUserDefaultUseCase: ReplaceModelWithUserDefaultUseCase,
    private readonly replaceModelWithUserDefaultUseCaseAgents: ReplaceModelWithUserDefaultUseCaseAgents,
    private readonly findAllThreadsByOrgWithSourcesUseCase: FindAllThreadsByOrgWithSourcesUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: DeletePermittedModelCommand): Promise<void> {
    this.logger.log('execute', {
      modelId: command.permittedModelId,
      orgId: command.orgId,
    });
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
        this.logger.error('Model not found', {
          modelId: command.permittedModelId,
          orgId: command.orgId,
        });
        throw new PermittedModelDeletionFailedError('Model not found', {
          modelId: command.permittedModelId,
        });
      }

      if (model instanceof PermittedLanguageModel) {
        return this.deletePermittedLanguageModel(command.orgId, model);
      } else if (model instanceof PermittedEmbeddingModel) {
        return this.deletePermittedEmbeddingModel(command.orgId, model);
      } else {
        this.logger.error('Model is not a language or embedding model', {
          modelId: command.permittedModelId,
          orgId: command.orgId,
        });
        throw new PermittedModelDeletionFailedError(
          'Model is not a language or embedding model',
          {
            modelId: command.permittedModelId,
          },
        );
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error deleting permitted model', error);
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
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
    ).filter((model) => model instanceof PermittedLanguageModel);
    if (permittedModels.length === 1 && permittedModels[0].id === model.id) {
      throw new PermittedModelDeletionFailedError(
        'Cannot delete the last permitted language model in an organization',
      );
    }

    // Check if the model is the default model in the organization
    const modelToDelete = permittedModels.find(
      (model) => model.id === model.id,
    );
    if (!modelToDelete) {
      throw new PermittedModelDeletionFailedError('Model not found', {
        modelId: model.id,
      });
    }
    if (modelToDelete.isDefault) {
      throw new PermittedModelDeletionFailedError(
        'Cannot delete the default model in an organization',
        { modelId: model.id },
      );
    }
    this.logger.debug(
      'Deleting user default models that reference this model',
      {
        modelId: model.id,
      },
    );

    // Delete all user default models that reference this model
    await this.deleteUserDefaultModelByModelIdUseCase.execute(
      new DeleteUserDefaultModelsByModelIdCommand(model.id),
    );

    this.logger.debug('Replacing model in all threads that use it', {
      modelId: model.id,
    });

    // Replace the model in all threads that use it
    // Because the user default model is deleted, this will fall back
    // to the org default model or the first available model
    await this.replaceModelWithUserDefaultUseCase.execute(
      new ReplaceModelWithUserDefaultCommand({
        orgId,
        oldPermittedModelId: model.id,
      }),
    );

    this.logger.debug('Replacing model in all agents that use it', {
      modelId: model.id,
    });

    // Replace the model in all agents that use it
    // This will fall back to the user's default model or org default model
    await this.replaceModelWithUserDefaultUseCaseAgents.execute(
      new ReplaceModelWithUserDefaultCommandAgents(model.id),
    );

    await this.permittedModelsRepository.delete({
      id: model.id,
      orgId: orgId,
    });
  }

  private async deletePermittedEmbeddingModel(
    orgId: UUID,
    model: PermittedEmbeddingModel,
  ): Promise<void> {
    // Single query - get all threads with sources for the org
    const threads = await this.findAllThreadsByOrgWithSourcesUseCase.execute(
      new FindAllThreadsByOrgWithSourcesQuery(orgId),
    );

    // Collect all sources from all threads
    const sources = threads
      .flatMap((t) => t.sourceAssignments?.map((sa) => sa.source) ?? [])
      .filter(Boolean);

    // Batch delete RAG index + sources (2 queries total)
    if (sources.length > 0) {
      await this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(sources),
      );
    }

    // Delete the model
    await this.permittedModelsRepository.delete({
      id: model.id,
      orgId: orgId,
    });
  }
}
