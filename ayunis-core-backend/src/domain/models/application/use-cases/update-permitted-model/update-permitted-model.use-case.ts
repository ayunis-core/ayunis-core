import { Injectable, Logger } from '@nestjs/common';
import { UpdatePermittedModelCommand } from './update-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedEmbeddingModel,
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

@Injectable()
export class UpdatePermittedModelUseCase {
  private readonly logger = new Logger(UpdatePermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdatePermittedModelCommand): Promise<PermittedModel> {
    this.logger.log('execute', {
      id: command.permittedModelId,
      orgId: command.orgId,
      anonymousOnly: command.anonymousOnly,
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

      // Create updated model with new anonymousOnly value, preserving the correct type
      let updatedModel: PermittedModel;
      if (existingModel.model instanceof LanguageModel) {
        updatedModel = new PermittedLanguageModel({
          id: existingModel.id,
          model: existingModel.model,
          orgId: existingModel.orgId,
          isDefault: existingModel.isDefault,
          anonymousOnly: command.anonymousOnly,
          createdAt: existingModel.createdAt,
          updatedAt: new Date(),
        });
      } else if (existingModel.model instanceof EmbeddingModel) {
        updatedModel = new PermittedEmbeddingModel({
          id: existingModel.id,
          model: existingModel.model,
          orgId: existingModel.orgId,
          isDefault: existingModel.isDefault,
          anonymousOnly: command.anonymousOnly,
          createdAt: existingModel.createdAt,
          updatedAt: new Date(),
        });
      } else {
        throw new Error(
          `Unknown model type: ${existingModel.model.constructor.name}`,
        );
      }

      return await this.permittedModelsRepository.update(updatedModel);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error updating permitted model', error);
      throw error;
    }
  }
}
