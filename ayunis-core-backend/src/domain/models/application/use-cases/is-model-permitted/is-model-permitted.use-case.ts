import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { IsModelPermittedQuery } from './is-model-permitted.query';
import { UnexpectedModelError } from '../../models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class IsModelPermittedUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: IsModelPermittedQuery): Promise<boolean> {
    const permittedModel = await this.permittedModelsRepository.findOne({
      id: query.modelId,
    });
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    const isFromOrg = orgId === permittedModel?.orgId;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
    return !!permittedModel;
  }
}
