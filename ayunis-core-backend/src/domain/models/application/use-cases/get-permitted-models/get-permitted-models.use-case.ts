import { Injectable, Logger } from '@nestjs/common';
import { GetPermittedModelsQuery } from './get-permitted-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class GetPermittedModelsUseCase {
  private readonly logger = new Logger(GetPermittedModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(query: GetPermittedModelsQuery): Promise<PermittedModel[]> {
    this.logger.debug('Getting permitted models', {
      orgId: query.orgId,
      filter: query.filter,
    });
    try {
      return this.permittedModelsRepository.findAll(query.orgId, query.filter);
    } catch (error) {
      this.logger.error('Error getting permitted models', {
        error,
      });
      throw error;
    }
  }
}
