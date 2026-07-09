import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelsRepository } from '../../ports/models.repository';
import { CreatePermittedModelCommand } from './create-permitted-model.command';
import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ModelNotFoundError, UnexpectedModelError } from '../../models.errors';
import { ModelPolicyService } from '../../services/model-policy.service';

@Injectable()
export class CreatePermittedModelUseCase extends BaseUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly modelsRepository: ModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
  ) {
    super();
  }

  async execute(command: CreatePermittedModelCommand): Promise<PermittedModel> {
    this.logger.log('execute', {
      modelId: command.modelId,
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
      });
      const created =
        await this.permittedModelsRepository.create(permittedModel);
      return created;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error creating permitted model', {
        error: error as Error,
      });
      throw new UnexpectedModelError(error as Error);
    }
  }
}
