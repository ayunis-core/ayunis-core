import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from '../../models.errors';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelPolicyService } from '../../services/model-policy.service';
import { UpdatePermittedModelCommand } from './update-permitted-model.command';

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
    });
    this.validateAccess(command.orgId);
    const existing = await this.permittedModelsRepository.findOne({
      id: command.permittedModelId,
    });
    if (!existing) {
      throw new PermittedModelNotFoundError(command.permittedModelId);
    }
    if (existing.orgId !== command.orgId) {
      throw new UnauthorizedAccessError();
    }
    this.modelPolicy.assertSupported(existing.model);
    if (
      command.anonymousOnly === undefined &&
      command.internetAccessEnabled === undefined
    ) {
      return existing;
    }
    return this.permittedModelsRepository.update({
      id: existing.id,
      orgId: existing.orgId,
      ...(command.anonymousOnly !== undefined && {
        anonymousOnly: command.anonymousOnly,
      }),
      ...(command.internetAccessEnabled !== undefined && {
        internetAccessEnabled: command.internetAccessEnabled,
      }),
    });
  }

  private validateAccess(commandOrgId: string): void {
    const orgId = this.contextService.get('orgId');
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');
    const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === commandOrgId;
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    if (!isOrgAdmin && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }
}
