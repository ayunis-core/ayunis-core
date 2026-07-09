import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { UpdatePermittedModelCommand } from './update-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { PermittedModelNotFoundError } from '../../models.errors';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelPolicyService } from '../../services/model-policy.service';

@Injectable()
export class UpdatePermittedModelUseCase extends BaseUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
  ) {
    super();
  }

  async execute(command: UpdatePermittedModelCommand): Promise<PermittedModel> {
    this.logger.log('execute', {
      id: command.permittedModelId,
      orgId: command.orgId,
      anonymousOnly: command.anonymousOnly,
    });

    try {
      this.ensureAuthorized(command.orgId);
      const existingModel = await this.findExistingModel(command);
      this.modelPolicy.assertSupported(existingModel.model);
      const updatedModel = this.buildUpdatedModel(existingModel, command);

      return await this.permittedModelsRepository.update(updatedModel);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error updating permitted model', error);
      throw error;
    }
  }

  private ensureAuthorized(orgId: string): void {
    const currentOrgId = this.contextService.get('orgId');
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    const isOrgAdmin = orgRole === UserRole.ADMIN && currentOrgId === orgId;
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;

    if (!isOrgAdmin && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }

  private async findExistingModel(
    command: UpdatePermittedModelCommand,
  ): Promise<PermittedModel> {
    const existingModel = await this.permittedModelsRepository.findOne({
      id: command.permittedModelId,
    });
    if (!existingModel) {
      throw new PermittedModelNotFoundError(command.permittedModelId);
    }
    if (existingModel.orgId !== command.orgId) {
      throw new UnauthorizedAccessError();
    }

    return existingModel;
  }

  private buildUpdatedModel(
    existingModel: PermittedModel,
    command: UpdatePermittedModelCommand,
  ): PermittedModel {
    const baseProps = {
      id: existingModel.id,
      orgId: existingModel.orgId,
      scope: existingModel.scope,
      scopeId: existingModel.scopeId,
      isDefault: existingModel.isDefault,
      anonymousOnly: command.anonymousOnly,
      createdAt: existingModel.createdAt,
      updatedAt: new Date(),
    };

    if (existingModel.model instanceof LanguageModel) {
      return new PermittedLanguageModel({ ...baseProps, model: existingModel.model });
    }
    if (existingModel.model instanceof EmbeddingModel) {
      return new PermittedEmbeddingModel({ ...baseProps, model: existingModel.model });
    }
    if (existingModel.model instanceof ImageGenerationModel) {
      return new PermittedImageGenerationModel({
        ...baseProps,
        model: existingModel.model,
      });
    }

    throw new Error(
      `Unknown model type: ${existingModel.model.constructor.name}`,
    );
  }
}
