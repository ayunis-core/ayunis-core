import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelRegistry } from '../../registry/model.registry';
import { CreatePermittedModelCommand } from './create-permitted-model.command';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class CreatePermittedModelUseCase {
  private readonly logger = new Logger(CreatePermittedModelUseCase.name);
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly modelRegistry: ModelRegistry,
    private readonly contextService: ContextService,
  ) {}

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
      const model = this.modelRegistry.getAvailableModel(command.modelId);
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
      this.logger.error('Error creating permitted model', error);
      throw error; // TODO: Handle this error
    }
  }
}
