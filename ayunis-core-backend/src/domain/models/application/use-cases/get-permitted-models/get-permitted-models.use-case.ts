import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetPermittedModelsQuery } from './get-permitted-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetPermittedModelsUseCase {
  constructor(
    @InjectPinoLogger(GetPermittedModelsUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetPermittedModelsQuery): Promise<PermittedModel[]> {
    this.logger.debug(
      {
        orgId: query.orgId,
        filter: query.filter,
      },
      'Getting permitted models',
    );
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
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error('Unknown error'),
        },
        'Error getting permitted models',
      );
      throw error;
    }
  }
}
