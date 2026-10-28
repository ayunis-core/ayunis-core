import { Injectable, Logger } from '@nestjs/common';
import { GetPermittedModelsQuery } from './get-permitted-models.query';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { isSuperAdmin } from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class GetPermittedModelsUseCase {
  private readonly logger = new Logger(GetPermittedModelsUseCase.name);

  constructor(
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
      const isFromOrg = orgId === query.orgId;
      if (!isFromOrg && !isSuperAdmin(this.contextService)) {
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
