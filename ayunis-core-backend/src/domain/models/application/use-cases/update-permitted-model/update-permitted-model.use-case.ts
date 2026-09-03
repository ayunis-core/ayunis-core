import { Injectable, Logger } from '@nestjs/common';
import { UpdatePermittedModelCommand } from './update-permitted-model.command';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
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
import { PermittedModelNotFoundError } from 'src/domain/models/application/models.errors';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelPolicyService } from 'src/domain/models/application/services/model-policy.service';

@Injectable()
export class UpdatePermittedModelUseCase {
  private readonly logger = new Logger(UpdatePermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

  async execute(command: UpdatePermittedModelCommand): Promise<PermittedModel> {
    this.logger.log(
      {
        id: command.permittedModelId,
        orgId: command.orgId,
        anonymousOnly: command.anonymousOnly,
      },
      'execute',
    );
    try {
      this.assertAuthorized(command);
      const existing = await this.findExisting(command.permittedModelId);
      if (existing.orgId !== command.orgId) throw new UnauthorizedAccessError();
      this.modelPolicy.assertSupported(existing.model);
      const updated = this.withAnonymousOnly(existing, command.anonymousOnly);
      return await this.permittedModelsRepository.update(updated);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error }, 'Error updating permitted model');
      throw error;
    }
  }

  private assertAuthorized(command: UpdatePermittedModelCommand): void {
    const isOrgAdmin =
      this.contextService.get('role') === UserRole.ADMIN &&
      this.contextService.get('orgId') === command.orgId;
    const isSuperAdmin =
      this.contextService.get('systemRole') === SystemRole.SUPER_ADMIN;
    if (!isOrgAdmin && !isSuperAdmin) throw new UnauthorizedAccessError();
  }

  private async findExisting(
    id: UpdatePermittedModelCommand['permittedModelId'],
  ): Promise<PermittedModel> {
    const existing = await this.permittedModelsRepository.findOne({ id });
    if (existing) return existing;
    throw new PermittedModelNotFoundError(id);
  }

  private withAnonymousOnly(
    existing: PermittedModel,
    anonymousOnly: boolean,
  ): PermittedModel {
    const common = {
      id: existing.id,
      orgId: existing.orgId,
      scope: existing.scope,
      scopeId: existing.scopeId,
      isDefault: existing.isDefault,
      anonymousOnly,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    if (existing.model instanceof LanguageModel) {
      return new PermittedLanguageModel({ ...common, model: existing.model });
    }
    if (existing.model instanceof EmbeddingModel) {
      return new PermittedEmbeddingModel({ ...common, model: existing.model });
    }
    if (existing.model instanceof ImageGenerationModel) {
      return new PermittedImageGenerationModel({
        ...common,
        model: existing.model,
      });
    }
    throw new Error(`Unknown model type: ${existing.model.constructor.name}`);
  }
}
