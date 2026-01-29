import { Injectable } from '@nestjs/common';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { IsModelPermittedQuery } from './is-model-permitted.query';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class IsModelPermittedUseCase {
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: IsModelPermittedQuery): Promise<boolean> {
    const permittedModel = await this.permittedModelsRepository.findOne({
      id: query.modelId,
    });

    // If model doesn't exist, it's not permitted (model was deleted)
    if (!permittedModel) {
      return false;
    }

    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    const isFromOrg = orgId === permittedModel.orgId;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
    return true;
  }
}
