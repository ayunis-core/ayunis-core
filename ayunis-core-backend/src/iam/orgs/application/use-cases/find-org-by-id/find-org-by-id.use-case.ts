import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { FindOrgByIdQuery } from './find-org-by-id.query';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  OrgError,
  OrgNotFoundError,
} from 'src/iam/orgs/application/orgs.errors';

@Injectable()
export class FindOrgByIdUseCase {
  private readonly logger = new Logger(FindOrgByIdUseCase.name);

  constructor(private readonly orgsRepository: OrgsRepository) {}

  async execute(query: FindOrgByIdQuery): Promise<Org> {
    this.logger.log({ id: query.id }, 'findById');
    try {
      const org = await this.orgsRepository.findById(query.id);
      this.logger.debug({ id: query.id }, 'Organization found');
      return org;
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          id: query.id,
        },
        'Failed to find organization by ID',
      );
      throw new OrgNotFoundError(query.id);
    }
  }
}
