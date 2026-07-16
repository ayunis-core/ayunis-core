import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetPermittedModelsQuery } from './get-permitted-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnexpectedModelError } from '../../models.errors';

@Injectable()
export class GetPermittedModelsUseCase {
  private readonly logger = new Logger(GetPermittedModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetPermittedModelsQuery): Promise<PermittedModel[]> {
    this.logger.debug('Getting permitted models', {
      orgId: query.orgId,
      filter: query.filter,
    });
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    const isFromOrg = orgId === query.orgId;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
    return this.permittedModelsRepository.findAll(query.orgId, query.filter);
  }
}
