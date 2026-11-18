import { Injectable, Logger } from '@nestjs/common';
import { UpdatePermittedModelCommand } from './update-permitted-model.command';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  PermittedModelNotFoundError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { ModelPolicyService } from 'src/domain/models/application/services/model-policy.service';

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
    this.logger.log(
      {
        id: command.permittedModelId,
        orgId: command.orgId,
        anonymousOnly: command.anonymousOnly,
        memoryAccess: command.memoryAccess,
        chatHistoryAccess: command.chatHistoryAccess,
      },
      'execute',
    );
    this.assertAuthorized(command);
    const existing = await this.findExisting(command.permittedModelId);
    if (existing.orgId !== command.orgId) throw new UnauthorizedAccessError();
    this.modelPolicy.assertSupported(existing.model);
    return this.permittedModelsRepository.update({
      id: existing.id,
      orgId: existing.orgId,
      policy: {
        anonymousOnly: command.anonymousOnly,
        memoryAccess: command.memoryAccess,
        chatHistoryAccess: command.chatHistoryAccess,
      },
    });
  }

  private assertAuthorized(command: UpdatePermittedModelCommand): void {
    const principal = getRequiredUserContext(this.contextService);
    const isOrgAdmin =
      principal.role === UserRole.ADMIN && principal.orgId === command.orgId;
    if (!isOrgAdmin && !isSuperAdmin(this.contextService)) {
      throw new UnauthorizedAccessError();
    }
  }

  private async findExisting(
    id: UpdatePermittedModelCommand['permittedModelId'],
  ): Promise<PermittedModel> {
    const existing = await this.permittedModelsRepository.findOne({ id });
    if (existing) return existing;
    throw new PermittedModelNotFoundError(id);
  }
}
