import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from '../../ports/orgs.repository';
import { FindOrgByIdQuery } from './find-org-by-id.query';
import { Org } from '../../../domain/org.entity';
import { OrgError, OrgNotFoundError } from '../../orgs.errors';

@Injectable()
export class FindOrgByIdUseCase {
  private readonly logger = new Logger(FindOrgByIdUseCase.name);

  constructor(private readonly orgsRepository: OrgsRepository) {}

  async execute(query: FindOrgByIdQuery): Promise<Org> {
    this.logger.log('findById', { id: query.id });
    try {
      const org = await this.orgsRepository.findById(query.id);
      this.logger.debug('Organization found', { id: query.id });
      return org;
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error('Failed to find organization by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: query.id,
      });
      throw new OrgNotFoundError(query.id);
    }
  }
}
