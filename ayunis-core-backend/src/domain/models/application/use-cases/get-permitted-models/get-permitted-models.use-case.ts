import { Injectable, Logger } from '@nestjs/common';
import { GetPermittedModelsQuery } from './get-permitted-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetPermittedModelsUseCase {
  private readonly logger = new Logger(GetPermittedModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetPermittedModelsQuery): Promise<PermittedModel[]> {
    this.logger.debug('Getting permitted models', {
      orgId: query.orgId,
      filter: query.filter,
    });
    try {
      const orgId = this.contextService.get('orgId');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isFromOrg = orgId === query.orgId;
      if (!isFromOrg && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }
      return this.permittedModelsRepository.findAll(query.orgId, query.filter);
    } catch (error) {
      this.logger.error('Error getting permitted models', {
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    }
  }
}
