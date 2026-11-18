import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { CreatePermittedModelCommand } from './create-permitted-model.command';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  ModelNotFoundError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { ModelPolicyService } from 'src/domain/models/application/services/model-policy.service';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { EmbeddingModelPermittedEvent } from 'src/domain/models/application/events/embedding-model-permitted.event';

@Injectable()
export class CreatePermittedModelUseCase {
  private readonly logger = new Logger(CreatePermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly modelsRepository: ModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreatePermittedModelCommand): Promise<PermittedModel> {
    this.logger.log(
      {
        modelId: command.modelId,
        orgId: command.orgId,
      },
      'execute',
    );
    try {
      const principal = getRequiredUserContext(this.contextService);
      const isOrgAdmin =
        principal.role === UserRole.ADMIN && principal.orgId === command.orgId;
      if (!isOrgAdmin && !isSuperAdmin(this.contextService)) {
        throw new UnauthorizedAccessError();
      }
      const model = await this.modelsRepository.findOne({
        id: command.modelId,
      });
      if (!model) {
        throw new ModelNotFoundError(command.modelId);
      }
      this.modelPolicy.assertSupported(model);
      const permittedModel = new PermittedModel({
        model: model,
        orgId: command.orgId,
        anonymousOnly: command.anonymousOnly,
        memoryAccess: command.memoryAccess,
        chatHistoryAccess: command.chatHistoryAccess,
      });
      const announcement =
        model instanceof EmbeddingModel
          ? new EmbeddingModelPermittedEvent(command.orgId, model.id)
          : null;
      const created = await this.persist(permittedModel, announcement);
      await this.runAfterCommit(announcement);
      return created;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating permitted model',
      );
      throw new UnexpectedModelError(error as Error);
    }
  }

  // A listener failure rolls the permit back with the listeners' writes.
  @Transactional()
  private async persist(
    permittedModel: PermittedModel,
    announcement: EmbeddingModelPermittedEvent | null,
  ): Promise<PermittedModel> {
    await this.modelPolicy.assertSingleModelPerOrg(permittedModel);
    const created = await this.permittedModelsRepository.create(permittedModel);
    if (announcement) {
      await this.eventEmitter.emitAsync(
        EmbeddingModelPermittedEvent.EVENT_NAME,
        announcement,
      );
    }
    return created;
  }

  // The permit is stored; a failure here is logged, not returned.
  private async runAfterCommit(
    announcement: EmbeddingModelPermittedEvent | null,
  ): Promise<void> {
    for (const task of announcement?.takeAfterCommitTasks() ?? []) {
      try {
        await task();
      } catch (error) {
        this.logger.error(
          { err: error as Error },
          'Work after permitting an embedding model failed',
        );
      }
    }
  }
}
