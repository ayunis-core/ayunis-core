import { Injectable, Logger } from '@nestjs/common';
import { UpdatePermittedModelCommand } from './update-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import {
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelPolicyService } from '../../services/model-policy.service';

@Injectable()
export class UpdatePermittedModelUseCase {
  private readonly logger = new Logger(UpdatePermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: UpdatePermittedModelCommand): Promise<PermittedModel> {
    this.logger.log('execute', {
      id: command.permittedModelId,
      orgId: command.orgId,
      anonymousOnly: command.anonymousOnly,
    });

    const orgId = this.contextService.get('orgId');
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === command.orgId;
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;

    if (!isOrgAdmin && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }

    const existingModel = await this.permittedModelsRepository.findOne({
      id: command.permittedModelId,
    });

    if (!existingModel) {
      throw new PermittedModelNotFoundError(command.permittedModelId);
    }

    // Verify the model belongs to the specified org
    if (existingModel.orgId !== command.orgId) {
      throw new UnauthorizedAccessError();
    }

    this.modelPolicy.assertSupported(existingModel.model);

    // Create updated model with new anonymousOnly value, preserving the correct type
    const updatedModel = this.buildUpdatedModel(
      existingModel,
      command.anonymousOnly,
    );

    return await this.permittedModelsRepository.update(updatedModel);
  }

  private buildUpdatedModel(
    existingModel: PermittedModel,
    anonymousOnly: boolean,
  ): PermittedModel {
    const props = {
      id: existingModel.id,
      orgId: existingModel.orgId,
      scope: existingModel.scope,
      scopeId: existingModel.scopeId,
      isDefault: existingModel.isDefault,
      anonymousOnly,
      createdAt: existingModel.createdAt,
      updatedAt: new Date(),
    };

    if (existingModel.model instanceof LanguageModel) {
      return new PermittedLanguageModel({
        ...props,
        model: existingModel.model,
      });
    }
    if (existingModel.model instanceof EmbeddingModel) {
      return new PermittedEmbeddingModel({
        ...props,
        model: existingModel.model,
      });
    }
    if (existingModel.model instanceof ImageGenerationModel) {
      return new PermittedImageGenerationModel({
        ...props,
        model: existingModel.model,
      });
    }
    throw new Error(
      `Unknown model type: ${existingModel.model.constructor.name}`,
    );
  }
}
